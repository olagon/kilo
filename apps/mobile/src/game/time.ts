/** Pure timer math so it can be tested without Capacitor. */

/** Difference to add to Date.now() to get server time. */
export function clockOffset(serverNow: number, localNow = Date.now()): number {
  return serverNow - localNow;
}

/** Seconds left in a round started at `startedAt` (server ms). 0 timer means no limit (Infinity). */
export function secondsLeft(startedAt: number, timerSeconds: number, serverNowMs: number): number {
  if (timerSeconds <= 0) return Infinity;
  return Math.max(0, timerSeconds - (serverNowMs - startedAt) / 1000);
}

/** Which round to resume: first round with a start but no points, or the first unstarted. */
export function nextRoundIndex(rounds: { index: number; startedAt?: number | null; points?: number | null }[]): number | null {
  for (const r of rounds) if (r.points == null) return r.index;
  return null;
}

export function sumPoints(rounds: { points?: number | null }[]): number {
  return rounds.reduce((s, r) => s + (r.points ?? 0), 0);
}
