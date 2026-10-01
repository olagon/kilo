import type { PickCandidate } from '@huli/shared';
import { describe, expect, it } from 'vitest';
import { newToken, overLimit, sha256Hex } from './auth';
import { isCheatDay, parseModes, pickWithRetries } from './daily';

const islands = ['oahu', 'hawaii', 'maui', 'kauai', 'molokai', 'lanai'] as const;
const pool: PickCandidate[] = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  mode: 'sky',
  island: islands[i % islands.length]!,
  difficulty: (i % 5) + 1,
}));
const modes = parseModes({ DAILY_MODES: '["sky","sky","sky","sky","sky"]' } as never);

async function fakeSeed(label: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(label));
  return new Uint8Array(buf);
}

describe('daily fill', () => {
  it('is deterministic per date and obeys the rules', async () => {
    const a = await pickWithRetries(pool, modes, fakeSeed, '2026-10-06');
    const b = await pickWithRetries(pool, modes, fakeSeed, '2026-10-06');
    const other = await pickWithRetries(pool, modes, fakeSeed, '2026-10-07');
    expect(a).not.toBeNull();
    expect(a!.map((p) => p.id)).toEqual(b!.map((p) => p.id));
    expect(a!.map((p) => p.id)).not.toEqual(other!.map((p) => p.id));
    const perIsland = new Map<string, number>();
    for (const p of a!) perIsland.set(p.island, (perIsland.get(p.island) ?? 0) + 1);
    expect(perIsland.size).toBeGreaterThanOrEqual(3);
    expect(Math.max(...perIsland.values())).toBeLessThanOrEqual(2);
    expect(a![0]!.difficulty).toBeLessThanOrEqual(2);
    expect(a![4]!.difficulty).toBeGreaterThanOrEqual(4);
  });
  it('returns null when the pool cannot satisfy the rules', async () => {
    const oahuOnly = pool.map((p) => ({ ...p, island: 'oahu' as const }));
    expect(await pickWithRetries(oahuOnly, modes, fakeSeed, '2026-10-06')).toBeNull();
  });
  it('simulated year never repeats a spot or breaks rules', async () => {
    const big: PickCandidate[] = Array.from({ length: 2500 }, (_, i) => ({
      id: i + 1,
      mode: 'sky',
      island: islands[i % islands.length]!,
      difficulty: (i % 5) + 1,
    }));
    const used = new Set<number>();
    for (let d = 0; d < 365; d++) {
      const fresh = big.filter((c) => !used.has(c.id));
      const picked = await pickWithRetries(fresh, modes, fakeSeed, `2026-${d}`);
      expect(picked).not.toBeNull();
      for (const p of picked!) {
        expect(used.has(p.id)).toBe(false);
        used.add(p.id);
      }
    }
    expect(used.size).toBe(365 * 5);
  });
  it('parseModes falls back to sky', () => {
    expect(parseModes({ DAILY_MODES: 'nope' } as never)).toEqual(['sky', 'sky', 'sky', 'sky', 'sky']);
    expect(parseModes({ DAILY_MODES: '["sky","ground","sky","sky","sky"]' } as never)[1]).toBe('ground');
  });
});

describe('cheat flag', () => {
  const fast = { points: 5000, ms: 3000 };
  it('flags five near perfect fast rounds', () => expect(isCheatDay(Array(5).fill(fast))).toBe(true));
  it('does not flag an honest day', () => {
    expect(isCheatDay([fast, fast, fast, fast, { points: 5000, ms: 9000 }])).toBe(false);
    expect(isCheatDay([fast, fast, fast, fast, { points: 4800, ms: 3000 }])).toBe(false);
    expect(isCheatDay([fast, fast])).toBe(false);
  });
});

describe('auth', () => {
  it('tokens are long, url safe, and hash stably', async () => {
    const t = newToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toBe(t);
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('rate limit trips after the budget', () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(overLimit('k', 3, now)).toBe(false);
    expect(overLimit('k', 3, now)).toBe(true);
    expect(overLimit('k', 3, now + 60_001)).toBe(false);
  });
});
