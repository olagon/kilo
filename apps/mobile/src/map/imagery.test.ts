import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hawaiiDate } from '@huli/shared';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

async function load(key: string) {
  vi.resetModules();
  vi.stubEnv('VITE_ESRI_KEY', key);
  return import('./imagery');
}

describe('imagery chain', () => {
  beforeEach(() => store.clear());

  it('no key → usgs', async () => {
    const m = await load('');
    expect(m.getImageryProvider().id).toBe('usgs');
    expect(m.skyCredit()).toBe('USGS The National Map');
  });

  it('key → esri with the token in the url', async () => {
    const m = await load('abc');
    const p = m.getImageryProvider();
    expect(p.id).toBe('esri');
    expect(p.tiles[0]).toContain('token=abc');
  });

  it('two esri errors switch to usgs for the rest of the Hawaiʻi day', async () => {
    const m = await load('abc');
    m.getImageryProvider();
    m.reportTileError(500);
    expect(m.getImageryProvider().id).toBe('esri');
    m.reportTileError(500);
    expect(m.getImageryProvider().id).toBe('usgs');
    expect(store.get('huli.imagery.fallback')).toBe(hawaiiDate());
    // sticky within the day, even for a fresh module
    const again = await load('abc');
    expect(again.getImageryProvider().id).toBe('usgs');
    // a new day clears it
    store.set('huli.imagery.fallback', '2000-01-01');
    expect(again.getImageryProvider().id).toBe('esri');
  });

  it('an auth error switches at once', async () => {
    const m = await load('abc');
    m.getImageryProvider();
    m.reportTileError(403);
    expect(m.getImageryProvider().id).toBe('usgs');
  });

  it('data saver drops terrain', async () => {
    const m = await load('');
    expect(m.buildSkyStyle({ dataSaver: true }).terrain).toBeUndefined();
    expect(m.buildSkyStyle().terrain).toEqual({ source: 'dem', exaggeration: 1.3 });
  });

  it('counts imagery tiles but not terrain', async () => {
    const m = await load('');
    m.countTileRequest('https://x/tile/1/2/3', 'Tile');
    m.countTileRequest('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/1/2/3.png', 'Tile');
    expect(m.tileStats.requested).toBe(1);
    m.resetRoundTileStats();
    expect(m.tileStats.roundRequested).toBe(0);
  });
});
