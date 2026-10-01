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

/** Spoiler free share text, Wordle style. */
export function shareText(opts: { dateLabel: string; total: number; rounds: number[]; link?: string }) {
  const grid = opts.rounds.map((p) => TIER_EMOJI[tierForPoints(p)]).join('');
  const lines = [`Huli ${opts.dateLabel}`, `${opts.total.toLocaleString('en-US')} / 25,000`, grid];
  if (opts.link) lines.push(opts.link);
  return lines.join('\n');
}
