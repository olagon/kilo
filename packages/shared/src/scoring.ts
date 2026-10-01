import { MAX_ROUND_POINTS, PERFECT_RADIUS_KM, SCORE_SCALE_KM } from './constants';

export interface LatLon {
  lat: number;
  lon: number;
}

const R_KM = 6371.0088;

/** Great circle distance in kilometers. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pointsForDistanceKm(distanceKm: number, scaleKm = SCORE_SCALE_KM): number {
  if (distanceKm <= PERFECT_RADIUS_KM) return MAX_ROUND_POINTS;
  return Math.round(MAX_ROUND_POINTS * Math.exp(-distanceKm / scaleKm));
}

export function scoreGuess(guess: LatLon, answer: LatLon, scaleKm = SCORE_SCALE_KM) {
  const km = haversineKm(guess, answer);
  return { distanceM: Math.round(km * 1000), points: pointsForDistanceKm(km, scaleKm) };
}

export type ResultTier = 'green' | 'yellow' | 'orange' | 'red';

export function tierForPoints(points: number): ResultTier {
  if (points >= 4500) return 'green';
  if (points >= 3000) return 'yellow';
  if (points >= 1000) return 'orange';
  return 'red';
}

const TIER_EMOJI: Record<ResultTier, string> = { green: '🟩', yellow: '🟨', orange: '🟧', red: '🟥' };

/** First day Kilo went live, Hawaiʻi time. Day numbers count from here. */
export const LAUNCH_DATE = '2026-10-01';

export interface ShareRound {
  points: number;
  distanceM: number;
}

export interface ShareInput {
  /** Kilo day number, 1 on launch day. */
  dayNumber: number;
  dateLabel: string;
  total: number;
  rounds: ShareRound[];
  /** Formatted distances, same order as rounds, e.g. "320 ft". */
  distances: string[];
  link: string;
}

export function shareGrid(rounds: { points: number }[]): string {
  return rounds.map((r) => TIER_EMOJI[tierForPoints(r.points)]).join('');
}

/**
 * Spoiler free share text. Never names a place or island (others may still be playing today),
 * but gives one concrete brag or stumble so people want to try.
 */
export function shareText(s: ShareInput): string {
  const best = s.rounds.reduce((b, r, i) => (r.points > s.rounds[b]!.points ? i : b), 0);
  const worst = s.rounds.reduce((w, r, i) => (r.points < s.rounds[w]!.points ? i : w), 0);
  const lines = [`Kilo #${s.dayNumber} · ${s.dateLabel}`, `${shareGrid(s.rounds)}  ${s.total.toLocaleString('en-US')} / 25,000`];
  if (s.total >= 25000) lines.push('Perfect day. All 5 within 50 m.');
  else if (s.rounds[best]!.points >= 4500 && best !== worst) lines.push(`Nailed round ${best + 1} within ${s.distances[best]}. Round ${worst + 1} got me by ${s.distances[worst]}.`);
  else if (s.rounds[best]!.points >= 4500) lines.push(`Closest guess: ${s.distances[best]}.`);
  else lines.push(`Closest guess: ${s.distances[best]}. The islands won today.`);
  lines.push('5 places in Hawaiʻi. Same 5 for everyone. New at midnight.', `Think you know the islands? ${s.link}`);
  return lines.join('\n');
}
