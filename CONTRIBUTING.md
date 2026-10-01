# Contributing

Thanks for helping. Huli is small on purpose. Keep changes small too.

## Setup

Node 20.19 or newer and pnpm. `pnpm install` at the root.

- `pnpm test` runs every package's tests. `pnpm typecheck` runs tsc everywhere.
- API: `cd services/api && cp .dev.vars.example .dev.vars && pnpm migrate:local && pnpm dev`. Local D1 lives in `.wrangler/`.
- App: `cd apps/mobile && cp ../../.env.example .env`, set `VITE_API_BASE=http://localhost:8787`, then `pnpm dev`.
- Phone: `pnpm build && npx cap sync android && cd android && ./gradlew assembleDebug`. Gradle downloads JDK 21 by itself.

## Rules of the road

- Scoring lives in `packages/shared`. The server scores every guess; the app never sends points.
- All copy lives in `apps/mobile/src/i18n/strings.en.json`. Hawaiian words are marked `review: true` so a fluent speaker can check them. Use the ʻokina (U+02BB), not an apostrophe.
- Never commit keys. `.env`, `.dev.vars`, and keystores are gitignored and CI runs gitleaks.
- Spots near heiau, burial sites, and other wahi pana stay out of the pool. When in doubt, leave it out.
- Tests for anything with a branch. Screenshots on a real phone for anything visual.
