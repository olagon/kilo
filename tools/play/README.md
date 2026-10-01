# Publishing to Google Play from the terminal

Google Play has no MCP connector, so this uses the Google Play Developer API directly. No npm dependencies.

One time setup (about 10 minutes, in a browser):
1. Pay the $25 developer fee at https://play.google.com/console and finish identity verification.
2. Create the app in the Console: name "Kilo: Hawaiʻi geography game", game, free. Do this once by hand; the API cannot create apps.
3. In Google Cloud (https://console.cloud.google.com), make a project, enable "Google Play Android Developer API", create a service account, and download its JSON key.
4. In Play Console → Users and permissions, invite the service account email with "Release manager" rights on the Kilo app.
5. Save the key outside the repo, for example `~/.kilo/play-service-account.json` (gitignored patterns already cover `*.json` under `~/.kilo`? No: just keep it out of the repo).

Then:

```sh
PLAY_SERVICE_ACCOUNT=~/.kilo/play-service-account.json node tools/play/publish.mjs --track internal
```

Flags: `--track internal|alpha|beta|production` (default internal), `--no-listing` to skip text and images, `--dry-run` to validate without committing.
