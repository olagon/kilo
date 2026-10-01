# Kilo promo video

Rebuild with `tools/promo/assemble.sh`. It needs ffmpeg, a Python venv with Pillow and numpy at `$SCRATCH/venv`, static TTFs in `$SCRATCH/fonts` (made from the app's bundled Fraunces and Inter with fontTools), and the raw emulator screen recordings (copies kept in `tools/promo/raw/`, copy them to `$SCRATCH/promo/raw/`) named as in `scenes.json`. Recording recipe: run the app on the API 36 emulator with `-gpu host`, start a Practice round, and `adb shell screenrecord --time-limit N ... ` while swiping slowly; wait N+1 s before pulling the file.

- `scenes.json`: the cut. Times are seconds; `clip_start` is the offset into the recording.
- `render.py`: composes every frame (footage crop, phone mockup, captions, title, result card, end card, grain, vignette) and pipes raw video to ffmpeg. `vertical` is 1080x1920, `landscape` is 1920x1080.
- `music.py`: the soundtrack, synthesized with numpy (tine piano chords, pad, soft pulse, pentatonic melody) plus the pin tick, reveal chime, whooshes and tile ticks, cued to the cut.
- Output: `store/promo/kilo-promo-vertical.mp4`, `kilo-promo-landscape.mp4`, `kilo-promo-thumb.png`.
