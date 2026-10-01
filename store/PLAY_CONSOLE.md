# Google Play Console answers

Everything the Console asks for, in the order it asks. Copy and paste.

## App details
- App name: Kilo: Hawaiʻi geography game
- Default language: English (United States)
- App or game: Game
- Free or paid: Free
- Category: Trivia
- Tags: Geography, Trivia, Puzzle
- Contact email: olin.lagon@gmail.com
- Website: https://olagon.github.io/kilo/
- Privacy policy: https://olagon.github.io/kilo/privacy.html

## Store listing
- Short description: `listing/en-US/short_description.txt`
- Full description: `listing/en-US/full_description.txt`
- App icon: `images/icon.png` (512 x 512)
- Feature graphic: `images/featureGraphic.png` (1024 x 500)
- Phone screenshots: `images/phoneScreenshots/` (1080 x 2400, at least 2, up to 8)
- Promo video: upload `promo/kilo-promo.mp4` to YouTube (unlisted is fine) and paste the link

## App content
- Privacy policy: https://olagon.github.io/kilo/privacy.html
- Ads: No, the app does not contain ads
- App access: All functionality is available without special access (no login)
- Content rating (IARC questionnaire): Game. No violence, no sexual content, no language, no controlled substances, no gambling. Users can interact: Yes, players choose a display name shown on leaderboards (filtered). Users can share location: No. Unrestricted internet: No. Expected result: Everyone / PEGI 3.
- Target audience: 13 and over (not designed for children)
- News app: No. COVID-19 app: No. Government app: No. Financial features: No. Health: No
- Data safety:
  - Does the app collect or share user data: Yes
  - Encrypted in transit: Yes
  - Users can request deletion: Yes (Settings → Privacy → Delete my scores and name)
  - Data types collected:
    - App info and performance / App interactions: scores, guesses, round times. Required. Purpose: app functionality (leaderboards). Not shared.
    - Personal info / Name: the player name you pick (not a real name). Required. Purpose: app functionality. Not shared.
    - Device or other IDs: an app generated player id. Required. Purpose: app functionality. Not shared.
  - Not collected: location, contacts, photos, files, email, phone, financial, health, messages, browsing, installed apps, device ids like advertising id.
- Advertising ID: the app does not use it

## Release
- Signing: let Google Play App Signing manage the app signing key. Upload key is `~/kilo-release.keystore` (the `apps/mobile/android/keystore.properties` file points to it). Keep it backed up.
- Bundle: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` (built with `./gradlew bundleRelease`)
- Track: start with Internal testing, then Closed testing (Google requires a closed test with at least 12 testers for 14 days before production for new personal developer accounts), then Production.
- Release notes: `listing/en-US/changelogs/1.txt`

## Publishing from the terminal
Once the app exists in the Console (created once by hand), `tools/play/publish.mjs` uploads the bundle, listing text, and images through the Google Play Developer API. See `tools/play/README.md`.
