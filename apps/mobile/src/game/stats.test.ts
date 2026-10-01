import { describe, expect, it } from 'vitest';
import { buildStats } from './stats';

const r = (points: number, distanceM: number, island: 'oahu' | 'maui' = 'oahu') => ({ points, distanceM, island });

describe('stats', () => {
  it('streaks, best, average, islands', () => {
    const s = buildStats(
      [
        { date: '2026-10-01', total: 20000, rounds: [r(5000, 10), r(5000, 20), r(4000, 2000, 'maui'), r(3000, 5000), r(3000, 6000)] },
        { date: '2026-10-02', total: 10000, rounds: [r(2000, 9000), r(2000, 9000), r(2000, 9000), r(2000, 9000), r(2000, 9000, 'maui')] },
        { date: '2026-10-05', total: 15000, rounds: [r(3000, 5000), r(3000, 5000), r(3000, 5000), r(3000, 5000), r(3000, 5000)] },
      ],
      '2026-10-06',
    );
    expect(s.daysPlayed).toBe(3);
    expect(s.bestStreak).toBe(2);
    expect(s.currentStreak).toBe(1);
    expect(s.bestDay).toBe(20000);
    expect(s.averageDay).toBe(15000);
    expect(s.perfectRounds).toBe(2);
    expect(s.islands[0]!.island).toBe('maui'); // maui avg 5.5 km beats oahu
  });
  it('streak breaks after a missed day', () => {
    expect(buildStats([{ date: '2026-10-01', total: 1, rounds: [] }], '2026-10-06').currentStreak).toBe(0);
    expect(buildStats([], '2026-10-06').daysPlayed).toBe(0);
  });
});
