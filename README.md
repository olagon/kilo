# Huli

**A daily Hawaiʻi geography game.** Every day at midnight Hawaiʻi time, everyone gets the same five places somewhere in the islands. You are dropped into a tilted satellite view over real terrain. You can turn and look around, but you can't move. Drop a pin on the map of the islands, lock it in, and score up to 5,000 points a round for being close. Share a spoiler free result and see how you rank today and this month.

No accounts, no ads, no tracking, no location permission. You just pick a name.

Made by [Olin Lagon](https://github.com/olagon). Code is MIT. Imagery and map data have their own licenses, listed below.

## How it's built

| Piece | What | Cost |
|---|---|---|
| App | Vite, React, TypeScript, [MapLibre GL JS](https://maplibre.org), wrapped in [Capacitor](https://capacitorjs.com) for Android | |
| API | [Cloudflare Workers](https://workers.cloudflare.com) with Hono and Zod, data in D1 (SQLite), a cron trigger picks each day's five | $0 up to roughly 7,000 players a day |
| Sky imagery | USGS The National Map (public domain, no key). Esri World Imagery if you add a free ArcGIS key | $0 |
| Terrain | AWS Open Data Terrain Tiles | $0 |
| Guess map | OpenFreeMap vector tiles, OpenStreetMap data | $0 |
| Spot pool | Built from OpenStreetMap with the Overpass API, see `tools/pool-builder` | $0 |

```
apps/mobile        the app (src/map has the sky view and guess map)
services/api       the Worker and D1 migrations
packages/shared    scoring, name rules, Hawaiʻi time, daily picker, types
tools/pool-builder makes the spot pool from OSM
tools/review       local page to approve or reject spots
docs/              privacy policy and the practice pack, served by GitHub Pages
```

## Run it

```sh
pnpm install
pnpm test && pnpm typecheck

# API, local D1
cd services/api
cp .dev.vars.example .dev.vars
pnpm migrate:local && pnpm dev          # http://localhost:8787

# App in a browser
cd apps/mobile
cp ../../.env.example .env              # set VITE_API_BASE=http://localhost:8787
pnpm dev                                # http://localhost:5173

# App on an Android phone (needs the Android SDK; Gradle fetches JDK 21 itself)
pnpm build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Self host

1. `cd services/api && npx wrangler d1 create huli`, paste the id into `wrangler.toml`.
2. `pnpm migrate:remote`, then `npx wrangler secret put ADMIN_TOKEN` and `npx wrangler secret put DAILY_SEED_SECRET` (long random strings).
3. `pnpm deploy`.
4. Build the pool: `pnpm --filter @huli/pool-builder build:pool`, then `API_BASE=https://your-worker ADMIN_TOKEN=... node services/api/scripts/seed-spots.mjs`.
5. `curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://your-worker/admin/daily/fill` to fill the next week (the cron keeps it filled after that).
6. Put your Worker URL in `apps/mobile/.env` as `VITE_API_BASE` and build the app.

## Secrets

Nothing secret is in this repo, and the app works with no keys at all.

- `apps/mobile/.env` (gitignored) holds `VITE_API_BASE`, and optionally `VITE_ESRI_KEY` and `VITE_MAPILLARY_TOKEN`. See `.env.example`.
- Worker secrets live in Cloudflare (`wrangler secret put`) and in `services/api/.dev.vars` locally (gitignored).
- Release signing: the keystore is `~/kilo-release.keystore` and `apps/mobile/android/keystore.properties` points at it. Both are gitignored. Back the keystore up somewhere safe; without it you can't update the app on the Play Store.
- CI scans every push with gitleaks.

## Credits and data licenses

- Imagery: USGS The National Map, USGSImageryOnly (public domain). Optional: Esri World Imagery, Esri, Maxar, Earthstar Geographics and the GIS User Community.
- Terrain: Mapzen and AWS Open Data Terrain Tiles, built from SRTM, NED, and others.
- Map: OpenStreetMap contributors (ODbL), OpenFreeMap, OpenMapTiles.
- Street level imagery (optional Ground rounds): Mapillary contributors (CC BY-SA).
- Libraries: MapLibre GL JS (BSD-3), Capacitor (MIT), Hono (MIT), React (MIT), Inter and Fraunces (OFL).

Hawaiian place names come from OpenStreetMap and may be incomplete. Corrections welcome, ideally upstream in OSM.

## Built with Claude

This project was written with [Claude Code](https://claude.com/claude-code), Anthropic's AI coding tool, working from a spec written by Olin Lagon. Olin directed the design, made the product decisions, and tested on a real phone; Claude wrote the code, the tests, and most of this README. Every commit carries a `Co-Authored-By: Claude` trailer. Treat the code the way you would any open source project: read it before you trust it, and open an issue if something is wrong.

## License

MIT. See `LICENSE`.
