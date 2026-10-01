export type IslandId = 'oahu' | 'hawaii' | 'maui' | 'kauai' | 'molokai' | 'lanai' | 'niihau' | 'kahoolawe';

export interface Island {
  id: IslandId;
  /** Display name written correctly, with the ʻokina (U+02BB) and kahakō. */
  name: string;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  center: [number, number];
  /** Share of daily spots. Used by the pool builder to weight sampling. */
  weight: number;
  inPool: boolean;
}

export const ISLANDS: Island[] = [
  { id: 'oahu', name: 'Oʻahu', bbox: [-158.30, 21.24, -157.63, 21.73], center: [-157.98, 21.48], weight: 0.28, inPool: true },
  { id: 'hawaii', name: 'Hawaiʻi Island', bbox: [-156.08, 18.90, -154.80, 20.28], center: [-155.50, 19.60], weight: 0.26, inPool: true },
  { id: 'maui', name: 'Maui', bbox: [-156.72, 20.56, -155.97, 21.04], center: [-156.33, 20.80], weight: 0.18, inPool: true },
  { id: 'kauai', name: 'Kauaʻi', bbox: [-159.80, 21.86, -159.28, 22.24], center: [-159.53, 22.06], weight: 0.14, inPool: true },
  { id: 'molokai', name: 'Molokaʻi', bbox: [-157.33, 21.03, -156.70, 21.23], center: [-157.02, 21.14], weight: 0.07, inPool: true },
  { id: 'lanai', name: 'Lānaʻi', bbox: [-157.07, 20.73, -156.80, 20.93], center: [-156.93, 20.83], weight: 0.07, inPool: true },
  { id: 'niihau', name: 'Niʻihau', bbox: [-160.26, 21.77, -160.00, 22.03], center: [-160.15, 21.90], weight: 0, inPool: false },
  { id: 'kahoolawe', name: 'Kahoʻolawe', bbox: [-156.72, 20.49, -156.52, 20.60], center: [-156.60, 20.55], weight: 0, inPool: false },
];

export const ISLAND_BY_ID: Record<IslandId, Island> = Object.fromEntries(ISLANDS.map((i) => [i.id, i])) as Record<IslandId, Island>;

function inBox(lon: number, lat: number, b: [number, number, number, number]) {
  return lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];
}

/** Best effort island for a point. Boxes are checked first, then the nearest center. */
export function islandForPoint(lat: number, lon: number): Island {
  // Kahoʻolawe and Lānaʻi boxes sit inside or beside Maui's, so check the small ones first.
  const ordered = [...ISLANDS].sort((a, b) => boxArea(a.bbox) - boxArea(b.bbox));
  for (const i of ordered) if (inBox(lon, lat, i.bbox)) return i;
  let best = ISLANDS[0]!;
  let bestD = Infinity;
  for (const i of ISLANDS) {
    const d = (i.center[0] - lon) ** 2 + (i.center[1] - lat) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function boxArea(b: [number, number, number, number]) {
  return (b[2] - b[0]) * (b[3] - b[1]);
}
