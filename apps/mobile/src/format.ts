export type Units = 'mi' | 'km';

/** "320 ft", "1.4 mi", "38 mi" or "250 m", "1.4 km", "38 km". */
export function formatDistance(meters: number, units: Units): string {
  if (units === 'km') {
    if (meters < 1000) return `${Math.round(meters)} m`;
    const km = meters / 1000;
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  }
  const miles = meters / 1609.344;
  if (miles < 0.5) return `${Math.round(meters * 3.28084)} ft`;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

export function formatPoints(points: number): string {
  return points.toLocaleString('en-US');
}

/** "4h 12m" or "12m 05s" countdown. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

/** "1:05" for a round timer. */
export function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
