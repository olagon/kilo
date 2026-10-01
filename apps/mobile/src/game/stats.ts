import { addDays, type DayRecord, type IslandId } from '@huli/shared';

export interface Stats {
  daysPlayed: number;
  currentStreak: number;
  bestStreak: number;
  bestDay: number;
  averageDay: number;
  perfectRounds: number;
  /** average distance in meters per island, best first */
  islands: { island: IslandId; avgM: number; rounds: number }[];
}

/** Rebuild stats from local history. `today` is the current Hawaiʻi date, for the streak. */
export function buildStats(history: DayRecord[], today: string): Stats {
  const days = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const dates = new Set(days.map((d) => d.date));
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d.date ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d.date;
  }
  // current streak counts back from today (or yesterday if today isn't played yet)
  let cur = 0;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(cursor)) {
    cur++;
    cursor = addDays(cursor, -1);
  }
  const byIsland = new Map<IslandId, { sum: number; n: number }>();
  let perfect = 0;
  for (const d of days)
    for (const r of d.rounds) {
      if (r.points >= 5000) perfect++;
      const e = byIsland.get(r.island) ?? { sum: 0, n: 0 };
      e.sum += r.distanceM;
      e.n++;
      byIsland.set(r.island, e);
    }
  const total = days.reduce((s, d) => s + d.total, 0);
  return {
    daysPlayed: days.length,
    currentStreak: cur,
    bestStreak: best,
    bestDay: days.reduce((m, d) => Math.max(m, d.total), 0),
    averageDay: days.length ? Math.round(total / days.length) : 0,
    perfectRounds: perfect,
    islands: [...byIsland.entries()]
      .map(([island, e]) => ({ island, avgM: Math.round(e.sum / e.n), rounds: e.n }))
      .sort((a, b) => a.avgM - b.avgM),
  };
}
