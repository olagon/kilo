import { ISLANDS, type LatLon, type Spot } from '@huli/shared';
import { load, save } from './storage';

export interface Pack { version: number; updated: string; spots: Spot[] }

const REMOTE = 'https://olagon.github.io/kilo/practice-pack.json';
let cached: Promise<Pack | null> | null = null;

/** Bundled pack, or a newer one fetched from GitHub Pages at most once a week. */
export function loadPack(): Promise<Pack | null> {
  cached ??= (async () => {
    const remote = await load<Pack | null>('pack.remote', null);
    const local = await fetch('/practice-pack.json').then((r) => (r.ok ? (r.json() as Promise<Pack>) : null)).catch(() => null);
    const best = remote && (!local || remote.version > local.version) ? remote : local;
    void checkRemote(best?.version ?? 0);
    return best;
  })();
  return cached;
}

async function checkRemote(current: number) {
  const last = await load<number>('pack.checked', 0);
  if (Date.now() - last < 7 * 86400e3) return;
  await save('pack.checked', Date.now());
  try {
    const r = await fetch(REMOTE, { cache: 'no-store' });
    if (!r.ok) return;
    const pack = (await r.json()) as Pack;
    if (pack.version > current && Array.isArray(pack.spots)) await save('pack.remote', pack);
  } catch {
    /* offline or no pack published yet */
  }
}

/** Place search for the keyboard fallback: island names plus pack spot names. */
export async function searchPlaces(q: string): Promise<{ name: string; point: LatLon }[]> {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const out: { name: string; point: LatLon }[] = ISLANDS.filter((i) => i.name.toLowerCase().includes(needle)).map((i) => ({
    name: i.name,
    point: { lat: i.center[1], lon: i.center[0] },
  }));
  const pack = await loadPack();
  for (const s of pack?.spots ?? []) {
    if (out.length >= 8) break;
    if (s.placeName.toLowerCase().includes(needle)) out.push({ name: s.placeName, point: { lat: s.lat, lon: s.lon } });
  }
  return out;
}
