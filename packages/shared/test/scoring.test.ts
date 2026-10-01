import { describe, expect, it } from 'vitest';
import { haversineKm, pointsForDistanceKm, scoreGuess, shareText, tierForPoints } from '../src/scoring';

describe('scoring table from the spec', () => {
  const table: [number, number][] = [
    [0.05, 5000], [0.5, 4901], [1, 4804], [5, 4094], [10, 3352], [25, 1839], [50, 677], [100, 92], [150, 12],
  ];
  for (const [km, pts] of table) {
    it(`${km} km gives ${pts}`, () => expect(pointsForDistanceKm(km)).toBe(pts));
  }
  it('anything inside 50 m is perfect', () => {
    expect(pointsForDistanceKm(0)).toBe(5000);
    expect(pointsForDistanceKm(0.049)).toBe(5000);
    expect(pointsForDistanceKm(0.051)).toBeLessThan(5000);
  });
});

describe('haversine', () => {
  it('Honolulu to Hilo is about 341 km', () => {
    const km = haversineKm({ lat: 21.3069, lon: -157.8583 }, { lat: 19.7241, lon: -155.0868 });
    expect(km).toBeGreaterThan(335);
    expect(km).toBeLessThan(345);
  });
  it('scoreGuess rounds meters', () => {
    const r = scoreGuess({ lat: 21.3, lon: -157.8 }, { lat: 21.3, lon: -157.8 });
    expect(r).toEqual({ distanceM: 0, points: 5000 });
  });
});

describe('share', () => {
  it('tiers', () => {
    expect(tierForPoints(4500)).toBe('green');
    expect(tierForPoints(4499)).toBe('yellow');
    expect(tierForPoints(3000)).toBe('yellow');
    expect(tierForPoints(1000)).toBe('orange');
    expect(tierForPoints(999)).toBe('red');
  });
  it('text has a day number, grid, a spoiler free hook, and the link', () => {
    const text = shareText({
      dayNumber: 6, dateLabel: 'Oct 6', total: 18420, link: 'https://olagon.github.io/kilo',
      rounds: [{ points: 5000, distanceM: 30 }, { points: 4600, distanceM: 1200 }, { points: 3200, distanceM: 9000 }, { points: 1500, distanceM: 30000 }, { points: 100, distanceM: 98000 }],
      distances: ['98 ft', '0.7 mi', '5.6 mi', '19 mi', '61 mi'],
    });
    expect(text).toBe(
      'Kilo #6 · Oct 6\n🟩🟩🟨🟧🟥  18,420 / 25,000\nNailed round 1 within 98 ft. Round 5 got me by 61 mi.\n5 places in Hawaiʻi. Same 5 for everyone. New at midnight.\nThink you know the islands? https://olagon.github.io/kilo',
    );
    expect(text).not.toMatch(/Oʻahu|Maui|Kauaʻi/);
  });

});
