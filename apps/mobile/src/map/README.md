# map/

- `SkyView` — locked MapLibre camera over 3D terrain. One finger drags swivel (bearing) and tilt (pitch 0..70) with momentum; two fingers twist. `ref.faceNorth()`. Compass button and credit line are inside. `interactive={false} autoSwivel` for the home backdrop. Calls `onReady` after the first rendered frame.
- `GuessMap` — OpenFreeMap Liberty restyled to the palette. Tap drops/moves the pin, drag to fine tune, light haptic. `reveal={{guess, answer}}` fits both pins, draws the line, then calls `onRevealDone`. Set `reveal` back to `null` to clear.
- `PinIcon` — the pin as an inline SVG for legends.
- `imagery.ts` — provider chain: Esri (`VITE_ESRI_KEY`) → USGS. An auth/quota status (401/403/429/498/499) or two tile failures switch to USGS until the next Hawaiʻi midnight (`localStorage['huli.imagery.fallback']`). `tileStats` counts tiles for the debug panel; call `resetRoundTileStats()` at round start.

Testing the fallback by hand: `localStorage['huli.imagery.force']='usgs'` forces USGS; `'esri-fail'` makes the Esri URLs 404 so the switch path runs. Remove the key to restore.
