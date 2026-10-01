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
  it('text', () => {
    expect(shareText({ dateLabel: 'Oct 6', total: 18420, rounds: [5000, 4600, 3200, 1500, 100] })).toBe(
      'Huli Oct 6\n18,420 / 25,000\n🟩🟩🟨🟧🟥',
    );
  });
});
