import {
  anonymousName,
  hawaiiDate,
  hawaiiMonth,
  isValidDate,
  LATE_GRACE_SECONDS,
  scoreGuess,
  validateName,
  type Answer,
  type BoardRow,
  type DailyInfo,
  type DayBoard,
  type GuessResult,
  type IslandId,
  type MonthBoard,
  type RoundView,
  type ViewMode,
} from '@huli/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { newToken, overLimit, sha256Hex } from './auth';
import { ensureFilled, isCheatDay } from './daily';
import { roundSeconds, type Env } from './env';

type Player = { id: string; name: string; hidden: number };
type Vars = { player: Player };

const app = new Hono<{ Bindings: Env; Variables: Vars }>();
app.use('*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type'] }));

const err = (c: { json: (b: unknown, s: number) => Response }, status: number, error: string, extra: Record<string, unknown> = {}) =>
  c.json({ error, ...extra }, status);

type LocationRow = {
  id: number;
  mode: ViewMode;
  lat: number;
  lon: number;
  island: IslandId;
  place_name: string;
  near: string | null;
  zoom: number | null;
  pitch: number | null;
  bearing: number | null;
  image_id: string | null;
  credit: string | null;
  fun_fact: string | null;
};
type PlayRow = {
  round: number;
  started_at: number;
  guessed_at: number | null;
  guess_lat: number | null;
  guess_lon: number | null;
  distance_m: number | null;
  points: number | null;
};

const nameSchema = z.object({ name: z.string().max(100) });
const guessSchema = z.union([
  z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  z.object({ timeout: z.literal(true) }),
]);

function nameError(error: string) {
  return error === 'reserved' ? 'name_reserved' : error === 'profane' ? 'name_profane' : 'name_invalid';
}

app.get('/health', (c) => c.json({ ok: true, date: hawaiiDate() }));

// ---------- players (no auth) ----------
app.post('/v1/players', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'none';
  if (overLimit(`ip:${ip}`, 120)) return err(c, 429, 'rate_limited');
  const body = nameSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return err(c, 400, 'name_invalid');
  const v = validateName(body.data.name);
  if (!v.ok) return err(c, 400, nameError(v.error));
  const taken = await c.env.DB.prepare('SELECT 1 FROM players WHERE name_key = ?').bind(v.key).first();
  if (taken) return err(c, 400, 'name_taken');
  const token = newToken();
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO players (id, name, name_key, token_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, v.name, v.key, await sha256Hex(token), Date.now())
    .run();
  return c.json({ playerId: id, token, name: v.name }, 201);
});

// ---------- auth ----------
app.use('/v1/*', async (c, next) => {
  const auth = c.req.header('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return err(c, 401, 'unauthorized');
  const hash = await sha256Hex(token);
  if (overLimit(`t:${hash}`, 60)) return err(c, 429, 'rate_limited');
  const ip = c.req.header('cf-connecting-ip') ?? 'none';
  if (overLimit(`ip:${ip}`, 120)) return err(c, 429, 'rate_limited');
  const player = await c.env.DB.prepare('SELECT id, name, hidden FROM players WHERE token_hash = ?').bind(hash).first<Player>();
  if (!player) return err(c, 401, 'unauthorized');
  c.set('player', player);
  await next();
});

app.patch('/v1/players/me', async (c) => {
  const body = nameSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return err(c, 400, 'name_invalid');
  const v = validateName(body.data.name);
  if (!v.ok) return err(c, 400, nameError(v.error));
  const me = c.get('player');
  const taken = await c.env.DB.prepare('SELECT id FROM players WHERE name_key = ? AND id != ?').bind(v.key, me.id).first();
  if (taken) return err(c, 400, 'name_taken');
  await c.env.DB.prepare('UPDATE players SET name = ?, name_key = ? WHERE id = ?').bind(v.name, v.key, me.id).run();
  return c.json({ playerId: me.id, name: v.name });
});

app.delete('/v1/players/me', async (c) => {
  const id = c.get('player').id;
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM plays WHERE player_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM day_totals WHERE player_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM reports WHERE reporter_id = ? OR player_id = ?').bind(id, id),
    c.env.DB.prepare('DELETE FROM players WHERE id = ?').bind(id),
  ]);
  return c.json({ ok: true });
});

app.post('/v1/players/:id/report', async (c) => {
  const target = c.req.param('id');
  const me = c.get('player').id;
  if (target === me) return err(c, 400, 'cannot_report_self');
  const exists = await c.env.DB.prepare('SELECT 1 FROM players WHERE id = ?').bind(target).first();
  if (!exists) return err(c, 404, 'not_found');
  const r = await c.env.DB.prepare('INSERT OR IGNORE INTO reports (reporter_id, player_id, created_at) VALUES (?, ?, ?)')
    .bind(me, target, Date.now())
    .run();
  if (r.meta.changes > 0) {
    await c.env.DB.prepare('UPDATE players SET reports = reports + 1, hidden = CASE WHEN reports + 1 >= 3 THEN 1 ELSE hidden END WHERE id = ?')
      .bind(target)
      .run();
  }
  return c.json({ ok: true });
});

// ---------- daily ----------
async function todaysRounds(env: Env, date: string): Promise<LocationRow[]> {
  const q = () =>
    env.DB.prepare(
      `SELECT l.id, l.mode, l.lat, l.lon, l.island, l.place_name, l.near, l.zoom, l.pitch, l.bearing, l.image_id, l.credit, l.fun_fact
       FROM daily d JOIN locations l ON l.id = d.location_id WHERE d.date = ? ORDER BY d.round`,
    )
      .bind(date)
      .all<LocationRow>();
  let { results } = await q();
  if (results.length === 0) {
    await ensureFilled(env);
    results = (await q()).results;
  }
  return results;
}

async function playsFor(env: Env, playerId: string, date: string): Promise<PlayRow[]> {
  const { results } = await env.DB.prepare(
    'SELECT round, started_at, guessed_at, guess_lat, guess_lon, distance_m, points FROM plays WHERE player_id = ? AND date = ? ORDER BY round',
  )
    .bind(playerId, date)
    .all<PlayRow>();
  return results;
}

function viewOf(l: LocationRow): RoundView {
  return l.mode === 'ground'
    ? { mode: 'ground', imageId: l.image_id ?? '' }
    : { mode: 'sky', lat: l.lat, lon: l.lon, zoom: l.zoom ?? 16.5, pitch: l.pitch ?? 55, bearing: l.bearing ?? 0 };
}

function answerOf(l: LocationRow): Answer {
  return { lat: l.lat, lon: l.lon, placeName: l.place_name, near: l.near, island: l.island, funFact: l.fun_fact, credit: l.credit };
}

app.get('/v1/daily', async (c) => {
  const date = hawaiiDate();
  const [rounds, plays] = await Promise.all([todaysRounds(c.env, date), playsFor(c.env, c.get('player').id, date)]);
  if (rounds.length < 5) return err(c, 503, 'daily_unavailable');
  const finished = plays.length === 5 && plays.every((p) => p.guessed_at !== null);
  const info: DailyInfo = {
    date,
    timerSeconds: roundSeconds(c.env),
    serverNow: Date.now(),
    finished,
    total: finished ? plays.reduce((s, p) => s + (p.points ?? 0), 0) : null,
    rounds: rounds.map((r, i) => {
      const p = plays.find((x) => x.round === i + 1);
      return { index: i + 1, mode: r.mode, startedAt: p?.started_at ?? null, points: p?.points ?? null, distanceM: p?.distance_m ?? null };
    }),
  };
  return c.json(info);
});

function roundIndex(s: string): number | null {
  const i = Number(s);
  return Number.isInteger(i) && i >= 1 && i <= 5 ? i : null;
}

app.post('/v1/daily/rounds/:i/start', async (c) => {
  const i = roundIndex(c.req.param('i'));
  if (!i) return err(c, 400, 'bad_round');
  const date = hawaiiDate();
  const me = c.get('player').id;
  const [rounds, plays] = await Promise.all([todaysRounds(c.env, date), playsFor(c.env, me, date)]);
  const loc = rounds[i - 1];
  if (!loc) return err(c, 503, 'daily_unavailable');
  const existing = plays.find((p) => p.round === i);
  if (existing) return c.json({ view: viewOf(loc), startedAt: existing.started_at, serverNow: Date.now() });
  if (plays.length === 5) return err(c, 409, 'day_finished');
  if (i > 1 && !plays.find((p) => p.round === i - 1)?.guessed_at) return err(c, 409, 'round_order');
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO plays (player_id, date, round, started_at) VALUES (?, ?, ?, ?)').bind(me, date, i, now).run();
  return c.json({ view: viewOf(loc), startedAt: now, serverNow: now });
});

app.post('/v1/daily/rounds/:i/guess', async (c) => {
  const i = roundIndex(c.req.param('i'));
  if (!i) return err(c, 400, 'bad_round');
  const body = guessSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return err(c, 400, 'bad_guess');
  const date = hawaiiDate();
  const me = c.get('player').id;
  const [rounds, plays] = await Promise.all([todaysRounds(c.env, date), playsFor(c.env, me, date)]);
  const loc = rounds[i - 1];
  if (!loc) return err(c, 503, 'daily_unavailable');
  const play = plays.find((p) => p.round === i);
  if (!play) return err(c, 409, 'round_not_started');
  const answer = answerOf(loc);
  const dayTotalOf = (ps: PlayRow[]) => ps.reduce((s, p) => s + (p.points ?? 0), 0);
  if (play.guessed_at !== null) {
    const result: GuessResult = {
      points: play.points ?? 0,
      distanceM: play.distance_m ?? 0,
      answer,
      guess: play.guess_lat !== null && play.guess_lon !== null ? { lat: play.guess_lat, lon: play.guess_lon } : null,
      dayTotal: dayTotalOf(plays),
      finished: plays.length === 5 && plays.every((p) => p.guessed_at !== null),
    };
    return err(c, 409, 'already_guessed', { result });
  }
  const now = Date.now();
  const late = now - play.started_at > (roundSeconds(c.env) + LATE_GRACE_SECONDS) * 1000 && roundSeconds(c.env) > 0;
  let points = 0;
  let distanceM: number | null = null;
  let guess: { lat: number; lon: number } | null = null;
  if ('lat' in body.data) {
    guess = { lat: body.data.lat, lon: body.data.lon };
    const s = scoreGuess(guess, answer);
    distanceM = s.distanceM;
    points = late ? 0 : s.points;
  }
  await c.env.DB.prepare(
    'UPDATE plays SET guessed_at = ?, guess_lat = ?, guess_lon = ?, distance_m = ?, points = ? WHERE player_id = ? AND date = ? AND round = ?',
  )
    .bind(now, guess?.lat ?? null, guess?.lon ?? null, distanceM, points, me, date, i)
    .run();
  play.guessed_at = now;
  play.points = points;
  play.distance_m = distanceM;
  const finished = plays.length === 5 && plays.every((p) => p.guessed_at !== null);
  const dayTotal = dayTotalOf(plays);
  if (finished) {
    const totalMs = plays.reduce((s, p) => s + ((p.guessed_at ?? p.started_at) - p.started_at), 0);
    const flagged = isCheatDay(plays.map((p) => ({ points: p.points ?? 0, ms: (p.guessed_at ?? p.started_at) - p.started_at })));
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO day_totals (player_id, date, month, total, total_ms, finished_at, flagged) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(me, date, hawaiiMonth(date), dayTotal, totalMs, now, flagged ? 1 : 0)
      .run();
  }
  const result: GuessResult = { points, distanceM: distanceM ?? 0, answer, guess, dayTotal, finished };
  return c.json(result);
});

// ---------- leaderboards ----------
type RankedRow = { player_id: string; name: string; hidden: number; total: number; total_ms: number; rank: number };

function toBoardRow(r: RankedRow, me: string): BoardRow {
  return {
    rank: r.rank,
    playerId: r.player_id,
    name: r.hidden ? anonymousName(r.player_id) : r.name,
    total: r.total,
    totalMs: r.total_ms,
    isMe: r.player_id === me,
  };
}

app.get('/v1/leaderboard/day', async (c) => {
  const date = c.req.query('date') ?? hawaiiDate();
  if (!isValidDate(date)) return err(c, 400, 'bad_date');
  const me = c.get('player').id;
  const [{ results }, count] = await Promise.all([
    c.env.DB.prepare(
      `WITH ranked AS (
         SELECT d.player_id, p.name, p.hidden, d.total, d.total_ms,
                ROW_NUMBER() OVER (ORDER BY d.total DESC, d.total_ms ASC, d.finished_at ASC) AS rank
         FROM day_totals d JOIN players p ON p.id = d.player_id
         WHERE d.date = ? AND d.flagged = 0)
       SELECT * FROM ranked WHERE rank <= 50 OR player_id = ? ORDER BY rank`,
    )
      .bind(date, me)
      .all<RankedRow>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM day_totals WHERE date = ? AND flagged = 0').bind(date).first<{ n: number }>(),
  ]);
  const rows = results.map((r) => toBoardRow(r, me));
  const board: DayBoard = { date, rows: rows.filter((r) => r.rank <= 50), me: rows.find((r) => r.isMe) ?? null, players: count?.n ?? 0 };
  c.header('Cache-Control', 'private, max-age=60');
  return c.json(board);
});

app.get('/v1/leaderboard/month', async (c) => {
  const month = c.req.query('month') ?? hawaiiMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) return err(c, 400, 'bad_month');
  const me = c.get('player').id;
  const mode = c.env.MONTH_RANK_MODE === 'best5_sum' ? 'best5_sum' : 'best_day';
  const best =
    mode === 'best_day'
      ? `SELECT player_id, total, total_ms, finished_at FROM days WHERE rn = 1`
      : `SELECT player_id, SUM(total) AS total, SUM(total_ms) AS total_ms, MAX(finished_at) AS finished_at FROM days WHERE rn <= 5 GROUP BY player_id`;
  const sql = `WITH days AS (
      SELECT player_id, total, total_ms, finished_at,
             ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY total DESC, total_ms ASC) AS rn
      FROM day_totals WHERE month = ? AND flagged = 0),
    best AS (${best}),
    ranked AS (
      SELECT b.player_id, p.name, p.hidden, b.total, b.total_ms,
             ROW_NUMBER() OVER (ORDER BY b.total DESC, b.total_ms ASC, b.finished_at ASC) AS rank
      FROM best b JOIN players p ON p.id = b.player_id)
    SELECT * FROM ranked WHERE rank <= 5 OR player_id = ? ORDER BY rank`;
  const [{ results }, count] = await Promise.all([
    c.env.DB.prepare(sql).bind(month, me).all<RankedRow>(),
    c.env.DB.prepare('SELECT COUNT(DISTINCT player_id) AS n FROM day_totals WHERE month = ? AND flagged = 0').bind(month).first<{ n: number }>(),
  ]);
  const rows = results.map((r) => toBoardRow(r, me));
  const board: MonthBoard = { month, mode, rows: rows.filter((r) => r.rank <= 5), me: rows.find((r) => r.isMe) ?? null, players: count?.n ?? 0 };
  c.header('Cache-Control', 'private, max-age=60');
  return c.json(board);
});

// ---------- admin ----------
app.use('/admin/*', async (c, next) => {
  const auth = c.req.header('authorization') ?? '';
  if (!c.env.ADMIN_TOKEN || auth !== `Bearer ${c.env.ADMIN_TOKEN}`) return err(c, 401, 'unauthorized');
  await next();
});

app.get('/admin/health', async (c) => {
  const today = hawaiiDate();
  const [pool, ahead, fresh] = await Promise.all([
    c.env.DB.prepare('SELECT island, status, mode, COUNT(*) AS n FROM locations GROUP BY island, status, mode ORDER BY island').all(),
    c.env.DB.prepare('SELECT COUNT(DISTINCT date) AS n FROM daily WHERE date >= ?').bind(today).first<{ n: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM locations WHERE status = 'approved' AND (last_used IS NULL OR last_used < ?)`)
      .bind(hawaiiDate(Date.now() - 365 * 86400000))
      .first<{ n: number }>(),
  ]);
  const freshDays = Math.floor((fresh?.n ?? 0) / 5);
  return c.json({
    date: today,
    pool: pool.results,
    daysFilledAhead: ahead?.n ?? 0,
    freshSpots: fresh?.n ?? 0,
    freshDays,
    warning: freshDays < 120 ? `Only ${freshDays} days of fresh approved spots left. Add more.` : null,
  });
});

app.post('/admin/daily/fill', async (c) => c.json({ filled: await ensureFilled(c.env) }));

const spotSchema = z.object({
  id: z.number().int().positive(),
  mode: z.enum(['sky', 'ground']),
  lat: z.number().min(18).max(23),
  lon: z.number().min(-161).max(-154),
  island: z.string().min(1),
  placeName: z.string().min(1),
  near: z.string().nullish(),
  zoom: z.number().nullish(),
  pitch: z.number().nullish(),
  bearing: z.number().nullish(),
  imageId: z.string().nullish(),
  credit: z.string().nullish(),
  funFact: z.string().nullish(),
  difficulty: z.number().int().min(1).max(5),
  status: z.enum(['approved', 'practice', 'candidate', 'rejected', 'retired']).default('approved'),
});

app.post('/admin/spots', async (c) => {
  const body = z.array(spotSchema).max(500).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return err(c, 400, 'bad_spots', { issues: body.error.issues.slice(0, 5) });
  const stmt = c.env.DB.prepare(
    `INSERT INTO locations (id, mode, lat, lon, island, place_name, near, zoom, pitch, bearing, image_id, credit, fun_fact, difficulty, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, lat = excluded.lat, lon = excluded.lon, island = excluded.island,
       place_name = excluded.place_name, near = excluded.near, zoom = excluded.zoom, pitch = excluded.pitch, bearing = excluded.bearing,
       image_id = excluded.image_id, credit = excluded.credit, fun_fact = excluded.fun_fact, difficulty = excluded.difficulty, status = excluded.status`,
  );
  const stmts = body.data.map((s) =>
    stmt.bind(s.id, s.mode, s.lat, s.lon, s.island, s.placeName, s.near ?? null, s.zoom ?? null, s.pitch ?? null, s.bearing ?? null,
      s.imageId ?? null, s.credit ?? null, s.funFact ?? null, s.difficulty, s.status),
  );
  // ponytail: D1 batch takes the whole array; chunk only if a 500 row batch ever hits a limit.
  for (let i = 0; i < stmts.length; i += 100) await c.env.DB.batch(stmts.slice(i, i + 100));
  return c.json({ upserted: body.data.length });
});

app.post('/admin/players/:id/hide', async (c) => {
  await c.env.DB.prepare('UPDATE players SET hidden = 1 WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});
app.post('/admin/players/:id/unhide', async (c) => {
  await c.env.DB.prepare('UPDATE players SET hidden = 0, reports = 0 WHERE id = ?').bind(c.req.param('id')).run();
  await c.env.DB.prepare('DELETE FROM reports WHERE player_id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});
app.post('/admin/players/:id/rename', async (c) => {
  const body = nameSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return err(c, 400, 'name_invalid');
  const v = validateName(body.data.name);
  if (!v.ok) return err(c, 400, nameError(v.error));
  const r = await c.env.DB.prepare('UPDATE players SET name = ?, name_key = ? WHERE id = ?').bind(v.name, v.key, c.req.param('id')).run();
  return c.json({ ok: r.meta.changes > 0 });
});
app.get('/admin/reports', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.id, p.name, p.reports, p.hidden, MAX(r.created_at) AS last_report
     FROM players p JOIN reports r ON r.player_id = p.id GROUP BY p.id ORDER BY p.reports DESC, last_report DESC LIMIT 200`,
  ).all();
  return c.json({ reports: results });
});

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((e, c) => {
  console.error(e);
  return c.json({ error: 'server_error' }, 500);
});

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(ensureFilled(env).then((f) => console.log(`daily: filled ${f.join(', ') || 'nothing'}`)));
  },
};
