# Huli

Read HULI_BUILD_SPEC.md before any work. Build in the phases in section 26. Do not skip acceptance checks.

## Layout
pnpm monorepo. `packages/shared` (scoring, names, Hawaiʻi time, types) is used by both `apps/mobile` (Vite + React + Capacitor) and `services/api` (Cloudflare Worker + D1). `tools/pool-builder` makes the spot pool from OpenStreetMap.

## Secrets
Never commit keys. App keys go in `apps/mobile/.env` (see `.env.example`). Worker secrets go in `services/api/.dev.vars` locally and `wrangler secret put` in production. The Android release keystore lives at `~/kilo-release.keystore` with `apps/mobile/android/keystore.properties` (both gitignored).

## Verify
`pnpm typecheck && pnpm test` must pass. For UI changes, build the APK, install on the phone, and look at real screenshots before calling it done.
