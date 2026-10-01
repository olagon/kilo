import { addDays, hawaiiDate, pickDaily, seededRandom, type PickCandidate, type ViewMode } from '@huli/shared';
import { hmacSeed } from './auth';
import type { Env } from './env';

export const DAYS_AHEAD = 7;
const REUSE_DAYS = 365;

export function parseModes(env: Env): ViewMode[] {
  try {
    const m = JSON.parse(env.DAILY_MODES) as unknown;
    if (Array.isArray(m) && m.length === 5 && m.every((x) => x === 'sky' || x === 'ground')) return m as ViewMode[];
  } catch {}
  return ['sky', 'sky', 'sky', 'sky', 'sky'];
}

/** Pick a day's spots, re-deriving the seed with a suffix when the rules can't be met. */
export async function pickWithRetries(
  candidates: PickCandidate[],
  modes: ViewMode[],
  seedFn: (label: string) => Promise<Uint8Array>,
  date: string,
): Promise<PickCandidate[] | null> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const seed = await seedFn(attempt === 0 ? date : `${date}:${attempt}`);
    const picked = pickDaily(candidates, modes, seededRandom(seed));
    if (picked) return picked;
  }
  return null;
}

async function freshCandidates(env: Env, date: string): Promise<PickCandidate[]> {
  const cutoff = addDays(date, -REUSE_DAYS);
  const { results } = await env.DB.prepare(
    `SELECT id, mode, island, difficulty FROM locations WHERE status = 'approved' AND (last_used IS NULL OR last_used < ?) ORDER BY id`,
  )
    .bind(cutoff)
    .all<PickCandidate>();
  return results;
}

/** Fill one date if it has no rows. Returns true when rows were written. */
export async function fillDay(env: Env, date: string): Promise<boolean> {
  const exists = await env.DB.prepare('SELECT 1 FROM daily WHERE date = ? LIMIT 1').bind(date).first();
  if (exists) return false;
  const candidates = await freshCandidates(env, date);
  const secret = env.DAILY_SEED_SECRET ?? 'unset';
  const picked = await pickWithRetries(candidates, parseModes(env), (label) => hmacSeed(secret, label), date);
  if (!picked) {
    console.warn(`daily: could not fill ${date} from ${candidates.length} candidates`);
    return false;
  }
  const stmts = picked.flatMap((p, i) => [
    env.DB.prepare('INSERT OR IGNORE INTO daily (date, round, location_id) VALUES (?, ?, ?)').bind(date, i + 1, p.id),
    env.DB.prepare('UPDATE locations SET last_used = ? WHERE id = ?').bind(date, p.id),
  ]);
  await env.DB.batch(stmts);
  return true;
}

/** Keep today plus DAYS_AHEAD days filled. */
export async function ensureFilled(env: Env, now = Date.now()): Promise<string[]> {
  const today = hawaiiDate(now);
  const filled: string[] = [];
  for (let d = 0; d <= DAYS_AHEAD; d++) {
    const date = addDays(today, d);
    if (await fillDay(env, date)) filled.push(date);
  }
  return filled;
}

/** Section 20: every round near perfect and each under 8 seconds. */
export function isCheatDay(rounds: { points: number; ms: number }[]): boolean {
  return rounds.length === 5 && rounds.every((r) => r.points >= 4900 && r.ms < 8000);
}
