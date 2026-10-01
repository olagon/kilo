import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, hawaiiDate, hawaiiDateStartMs, hawaiiMonth, isValidDate, longDateLabel, nextHawaiiMidnightMs } from '../src/hawaiiTime';

describe('Hawaiʻi time', () => {
  it('flips at 10:00 UTC', () => {
    expect(hawaiiDate(Date.UTC(2026, 9, 6, 9, 59, 59))).toBe('2026-10-05');
    expect(hawaiiDate(Date.UTC(2026, 9, 6, 10, 0, 0))).toBe('2026-10-06');
  });
  it('year boundary', () => {
    expect(hawaiiDate(Date.UTC(2027, 0, 1, 5, 0))).toBe('2026-12-31');
    expect(hawaiiDate(Date.UTC(2027, 0, 1, 10, 0))).toBe('2027-01-01');
  });
  it('start and next midnight', () => {
    const start = hawaiiDateStartMs('2026-10-06');
    expect(start).toBe(Date.UTC(2026, 9, 6, 10));
    expect(nextHawaiiMidnightMs(start + 5000)).toBe(Date.UTC(2026, 9, 7, 10));
  });
  it('month and day math', () => {
    expect(hawaiiMonth('2026-10-06')).toBe('2026-10');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-01', '2026-10-06')).toBe(5);
  });
  it('labels and validation', () => {
    expect(longDateLabel('2026-10-06')).toBe('Tue, Oct 6');
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-02-28')).toBe(true);
  });
});
