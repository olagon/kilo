// MapLibre's worker imports a sibling module by relative URL, so Vite's hashed copy breaks it.
// package.json "prebuild" copies both files unhashed into public/maplibre/.
import { setWorkerUrl } from 'maplibre-gl';

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
