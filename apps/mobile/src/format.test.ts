import { describe, expect, it } from 'vitest';
import { formatCountdown, formatDistance, formatTimer } from './format';

describe('format', () => {
  it('distance miles', () => {
    expect(formatDistance(100, 'mi')).toBe('328 ft');
    expect(formatDistance(2250, 'mi')).toBe('1.4 mi');
    expect(formatDistance(61000, 'mi')).toBe('38 mi');
  });
  it('distance km', () => {
    expect(formatDistance(250, 'km')).toBe('250 m');
    expect(formatDistance(1400, 'km')).toBe('1.4 km');
    expect(formatDistance(38200, 'km')).toBe('38 km');
  });
  it('countdown and timer', () => {
    expect(formatCountdown(4 * 3600e3 + 12 * 60e3)).toBe('4h 12m');
    expect(formatCountdown(12 * 60e3 + 5e3)).toBe('12m 05s');
    expect(formatTimer(65)).toBe('1:05');
    expect(formatTimer(-1)).toBe('0:00');
  });
});
