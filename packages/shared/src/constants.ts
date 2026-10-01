export const SCORE_SCALE_KM = 25;
export const PERFECT_RADIUS_KM = 0.05;
export const MAX_ROUND_POINTS = 5000;
export const ROUNDS_PER_DAY = 5;
export const MAX_DAY_POINTS = MAX_ROUND_POINTS * ROUNDS_PER_DAY;
export const DEFAULT_ROUND_SECONDS = 120;
/** Grace after the timer before the server scores a silent round as 0. */
export const LATE_GRACE_SECONDS = 30;

/** Guess map bounds, [west, south, east, north]. Covers Niʻihau to Hawaiʻi Island. */
export const HAWAII_BOUNDS: [number, number, number, number] = [-160.6, 18.7, -154.6, 22.4];

export const DEFAULT_SKY_ZOOM = 16.5;
export const DEFAULT_SKY_PITCH = 55;
export const MAX_SKY_PITCH = 85;

export const NAME_MIN = 3;
export const NAME_MAX = 18;

export type DayTotalsMode = 'best_day' | 'best5_sum';
