/** Hawaiʻi Standard Time is UTC minus 10 all year. No daylight saving. */
export const HST_OFFSET_MS = -10 * 60 * 60 * 1000;

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** The Hawaiʻi calendar date for a moment, as YYYY-MM-DD. */
export function hawaiiDate(nowMs = Date.now()): string {
  const d = new Date(nowMs + HST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** YYYY-MM for a Hawaiʻi date string or a moment. */
export function hawaiiMonth(dateOrMs: string | number = Date.now()): string {
  const date = typeof dateOrMs === 'string' ? dateOrMs : hawaiiDate(dateOrMs);
  return date.slice(0, 7);
}

/** Epoch ms of midnight HST at the start of the given Hawaiʻi date. */
export function hawaiiDateStartMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) - HST_OFFSET_MS;
}

/** Epoch ms of the next midnight HST after `nowMs`. */
export function nextHawaiiMidnightMs(nowMs = Date.now()): number {
  return hawaiiDateStartMs(hawaiiDate(nowMs)) + 24 * 60 * 60 * 1000;
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  return hawaiiDate(hawaiiDateStartMs(date) + days * 24 * 60 * 60 * 1000 + 1);
}

/** Days between two Hawaiʻi dates, b minus a. */
export function daysBetween(a: string, b: string): number {
  return Math.round((hawaiiDateStartMs(b) - hawaiiDateStartMs(a)) / (24 * 60 * 60 * 1000));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Oct 6" for share text and headers. */
export function shortDateLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Tue, Oct 6" for the home screen. */
export function longDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[dow]}, ${MONTHS[m - 1]} ${d}`;
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return hawaiiDate(hawaiiDateStartMs(s) + 1) === s;
}
