import type { IslandId } from './islands';
import type { ViewMode } from './types';

/** The subset of a spot the daily picker needs. */
export interface PickCandidate {
  id: number;
  mode: ViewMode;
  island: IslandId;
  difficulty: number;
}

/** Difficulty allowed per round, round 1 easy to round 5 hard. */
export const ROUND_DIFFICULTY: ReadonlyArray<ReadonlyArray<number>> = [[1, 2], [1, 2, 3], [2, 3, 4], [3, 4], [4, 5]];

/** Deterministic PRNG from a 32 byte seed. Mulberry32 over the first 4 bytes, reseeded as it goes. */
export function seededRandom(seed: Uint8Array): () => number {
  let a = ((seed[0]! << 24) | (seed[1]! << 16) | (seed[2]! << 8) | seed[3]!) >>> 0;
  let b = ((seed[4]! << 24) | (seed[5]! << 16) | (seed[6]! << 8) | seed[7]!) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    b = (b ^ (t >>> 14)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick 5 spots for a day.
 * Rules: at least 3 islands, no more than 2 per island, Oʻahu never in every round,
 * difficulty climbs across the day, mode per round from `modes`.
 * Returns null if the pool can't satisfy the rules.
 */
export function pickDaily(candidates: PickCandidate[], modes: ViewMode[], rand: () => number): PickCandidate[] | null {
  const pool = [...candidates];
  // Fisher Yates with the seeded generator so the same seed gives the same day everywhere.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const picked: PickCandidate[] = [];
  const perIsland = new Map<IslandId, number>();
  for (let r = 0; r < modes.length; r++) {
    const allowed = ROUND_DIFFICULTY[Math.min(r, ROUND_DIFFICULTY.length - 1)]!;
    const roundsLeft = modes.length - r;
    const islandsSoFar = perIsland.size;
    const needNewIsland = islandsSoFar + roundsLeft <= 3; // must add an island to reach 3
    const found = pool.find((c) => {
      if (c.mode !== modes[r]) return false;
      if (!allowed.includes(c.difficulty)) return false;
      if (picked.some((p) => p.id === c.id)) return false;
      const n = perIsland.get(c.island) ?? 0;
      if (n >= 2) return false;
      if (needNewIsland && n > 0) return false;
      return true;
    });
    if (!found) return null;
    picked.push(found);
    perIsland.set(found.island, (perIsland.get(found.island) ?? 0) + 1);
  }
  if (perIsland.size < 3) return null;
  if (picked.every((p) => p.island === 'oahu')) return null;
  return picked;
}
