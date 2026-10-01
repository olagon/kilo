# Pool builder

Makes the Sky spot pool from OpenStreetMap through the Overpass API. No downloads, no keys.

```
pnpm --filter @huli/pool-builder build:pool
```

Writes `out/spots.json` (daily pool, `status: approved`), `out/report.txt` (counts and the excluded names to eyeball), and `apps/mobile/public/practice-pack.json` (300 practice spots, removed from the daily pool). Raw Overpass responses are cached in `cache/`; delete it to refetch. Overpass is often busy, the script retries up to five times per query.

Seed the pool into D1 with `services/api/scripts/seed-spots.mjs`.

To review spots by eye: `cd tools && python3 -m http.server 8000`, open http://localhost:8000/review/, A approve, R reject, 1 to 5 difficulty, arrows to move, then download the decisions JSON.
