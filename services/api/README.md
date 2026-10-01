# Kilo API

Cloudflare Worker (Hono + Zod) over D1. Free plan is enough until a few thousand players a day.

## Run locally
```
cp .dev.vars.example .dev.vars          # ADMIN_TOKEN=dev, DAILY_SEED_SECRET=dev-seed
pnpm migrate:local
pnpm dev                                # http://localhost:8787
```
Seed spots into the local DB (the pool builder writes `tools/pool-builder/out/spots.json`):
```
ADMIN_TOKEN=dev API_BASE=http://localhost:8787 node scripts/seed-spots.mjs
```
The daily set fills itself on the first `GET /v1/daily` of a day, so you don't need the cron locally.

## Deploy
```
npx wrangler d1 create huli             # paste the database_id into wrangler.toml
pnpm migrate:remote
npx wrangler secret put ADMIN_TOKEN      # long random string
npx wrangler secret put DAILY_SEED_SECRET
pnpm deploy
ADMIN_TOKEN=... API_BASE=https://huli-api.<you>.workers.dev node scripts/seed-spots.mjs
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://huli-api.<you>.workers.dev/admin/daily/fill
```
Game settings live in `[vars]` in `wrangler.toml`: `DAILY_MODES`, `DAILY_ROUND_SECONDS`, `MONTH_RANK_MODE` (`best_day` or `best5_sum`).
The cron (`5 10 * * *` UTC, 12:05 AM HST) keeps 7 days of spots picked ahead.

## Routes
Player routes are under `/v1` and need `Authorization: Bearer <token>` except `POST /v1/players`. See spec section 16.

Admin routes need `Authorization: Bearer <ADMIN_TOKEN>`:

| Route | Does |
|---|---|
| `GET /admin/health` | pool counts per island, days filled ahead, low pool warning |
| `POST /admin/daily/fill` | fill today plus 7 days now |
| `POST /admin/spots` | upsert up to 500 `Spot` rows (status defaults to `approved`) |
| `POST /admin/players/:id/hide` `unhide` `rename` | moderation |
| `GET /admin/reports` | reported players, most reported first |

Errors are `{ "error": "<code>" }`. Name codes: `name_invalid`, `name_taken`, `name_reserved`, `name_profane`. Round codes: `round_order`, `round_not_started`, `already_guessed` (body also carries the stored `result` so the app can resume), `day_finished`, `daily_unavailable`.
