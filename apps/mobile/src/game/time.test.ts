import { describe, expect, it } from 'vitest';
import { clockOffset, nextRoundIndex, secondsLeft, sumPoints } from './time';

describe('timer and resume', () => {
  it('corrects the clock', () => expect(clockOffset(1000, 400)).toBe(600));
  it('seconds left', () => {
    expect(secondsLeft(0, 120, 30_000)).toBe(90);
    expect(secondsLeft(0, 120, 200_000)).toBe(0);
    expect(secondsLeft(0, 0, 200_000)).toBe(Infinity);
  });
  it('resume picks the open round', () => {
    expect(nextRoundIndex([{ index: 1, points: 10 }, { index: 2, startedAt: 5 }, { index: 3 }])).toBe(2);
    expect(nextRoundIndex([{ index: 1, points: 10 }])).toBe(null);
    expect(sumPoints([{ points: 10 }, { points: null }, { points: 5 }])).toBe(15);
  });
});
