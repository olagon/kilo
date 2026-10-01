import type { StyleSpecification } from 'maplibre-gl';
import { hawaiiDate } from '@huli/shared';

export type ImageryProviderId = 'esri' | 'usgs';
export interface ImageryProvider {
  id: ImageryProviderId;
  tiles: string[];
  tileSize: 256 | 512;
  maxzoom: number;
  /** Short credit line shown on screen. */
  credit: string;
}

const FALLBACK_KEY = 'huli.imagery.fallback';
const FORCE_KEY = 'huli.imagery.force';
export const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const USGS_TILES = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
const ESRI_TILES = 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=';

export const tileStats = { requested: 0, failed: 0, provider: 'usgs' as ImageryProviderId, roundRequested: 0 };
export function resetRoundTileStats() {
  tileStats.roundRequested = 0;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function esriKey(): string {
  const key = (import.meta.env?.VITE_ESRI_KEY as string | undefined) ?? '';
  const force = storage()?.getItem(FORCE_KEY);
  if (force === 'usgs') return '';
  if (force === 'esri-fail') return key || 'esri-fail';
  return key;
}

/** True when Esri failed earlier on this Hawaiʻi day. The switch is sticky until midnight HST. */
function fallbackActive(): boolean {
  return storage()?.getItem(FALLBACK_KEY) === hawaiiDate();
}

let esriErrors = 0;
/** Call with the HTTP status of a failed imagery tile. Two failures switch to USGS for the day. */
export function reportTileError(status: number) {
  tileStats.failed++;
  if (tileStats.provider !== 'esri') return;
  if ([401, 403, 429, 498, 499].includes(status) || ++esriErrors >= 2) {
    storage()?.setItem(FALLBACK_KEY, hawaiiDate());
    esriErrors = 0;
  }
}

export function getImageryProvider(_opts?: { dataSaver?: boolean }): ImageryProvider {
  const key = esriKey();
  const provider: ImageryProvider =
    key && !fallbackActive()
      ? {
          id: 'esri',
          tiles: [key === 'esri-fail' ? ESRI_TILES.replace('/tile/', '/nope/') : ESRI_TILES + encodeURIComponent(key)],
          tileSize: 256,
          maxzoom: 19,
          credit: 'Esri, Maxar, Earthstar Geographics',
        }
      : { id: 'usgs', tiles: [USGS_TILES], tileSize: 256, maxzoom: 16, credit: 'USGS The National Map' };
  tileStats.provider = provider.id;
  return provider;
}

export function skyCredit(): string {
  return getImageryProvider().credit;
}

/** Raster imagery over terrain. Terrain is off in data saver mode. */
export function buildSkyStyle(opts: { dataSaver?: boolean } = {}): StyleSpecification {
  const p = getImageryProvider(opts);
  const style: StyleSpecification = {
    version: 8,
    sources: {
      imagery: { type: 'raster', tiles: p.tiles, tileSize: p.tileSize, maxzoom: p.maxzoom, attribution: p.credit },
    },
    sky: {
      'sky-color': '#7fb6d6',
      'horizon-color': '#d9e9f2',
      'fog-color': '#c9dbe6',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.85,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0],
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#0a1a24' } },
      { id: 'imagery', type: 'raster', source: 'imagery', paint: { 'raster-fade-duration': 0 } },
    ],
  };
  if (!opts.dataSaver) {
    style.sources.dem = { type: 'raster-dem', tiles: [TERRAIN_TILES], tileSize: 256, maxzoom: 15, encoding: 'terrarium' };
    style.terrain = { source: 'dem', exaggeration: 1.3 };
  }
  return style;
}

/** maplibre `transformRequest` that counts imagery tiles. */
export function countTileRequest(url: string, resourceType?: string) {
  if (resourceType === 'Tile' && !url.includes('elevation-tiles-prod')) {
    tileStats.requested++;
    tileStats.roundRequested++;
  }
  return { url };
}
