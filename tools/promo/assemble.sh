#!/bin/bash
# Builds the Kilo promo video from emulator recordings. Needs ffmpeg and the scratch venv (Pillow, numpy).
# Raw clips: $SCRATCH/promo/raw/<clip>.mp4 (1080x2400 screen recordings). Scenes: tools/promo/scenes.json.
set -e
export SCRATCH=${SCRATCH:-/private/tmp/claude-501/-Users-olinlagon-code-hawaiigeoguesser/d31587dc-1feb-43db-b4e3-376c2eeeda90/scratchpad}
PY=$SCRATCH/venv/bin/python
export HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$HERE/../../store/promo
mkdir -p $OUT $SCRATCH/promo/frames
# 1. frames at 30 fps for every clip a scene uses, only as far as needed
$PY - <<PYEOF
import json, os, subprocess
S=os.environ['SCRATCH']; sc=json.load(open(os.path.join(os.environ['HERE'],'scenes.json')))
need={}
for s in sc:
    if 'clip' in s: need[s['clip']]=max(need.get(s['clip'],0), s['clip_start']+(s['end']-s['start'])+0.6)
for clip,t in need.items():
    d=f'{S}/promo/frames/{clip}'
    if os.path.isdir(d) and len(os.listdir(d))>=int(t*30)-1: continue
    os.makedirs(d, exist_ok=True)
    subprocess.run(['ffmpeg','-y','-v','error','-i',f'{S}/promo/raw/{clip}.mp4','-t',str(t),'-vf','fps=30','-q:v','3',f'{d}/%05d.jpg'],check=True)
    print('frames',clip,len(os.listdir(d)))
PYEOF
# 2. music, with cues matched to the cut
$PY $HERE/music.py $SCRATCH/promo/music.wav 46.8 '{"pin_t":22.6,"reveal_t":27.0,"whoosh_ts":[28.4,29.8,31.2,32.6],"tick_ts":[34.2,34.6,35.0,35.4,35.8]}'
ffmpeg -y -v error -i $SCRATCH/promo/music.wav -af "loudnorm=I=-14:TP=-1.2:LRA=11" -ar 48000 $SCRATCH/promo/music-norm.wav
# 3. render both layouts
$PY $HERE/render.py vertical $OUT/kilo-promo-vertical.mp4 $SCRATCH/promo/music-norm.wav
$PY $HERE/render.py landscape $OUT/kilo-promo-landscape.mp4 $SCRATCH/promo/music-norm.wav
# 4. thumbnail from the end card
ffmpeg -y -v error -ss 44.6 -i $OUT/kilo-promo-landscape.mp4 -frames:v 1 -vf scale=1280:720 $OUT/kilo-promo-thumb.png
# 5. QA stills
mkdir -p $SCRATCH/promo/qa; rm -f $SCRATCH/promo/qa/*.jpg
for t in 1.6 4.5 8 12 17 20 23 26 29 33 36 39.6 41.0 44.6; do ffmpeg -y -v error -ss $t -i $OUT/kilo-promo-vertical.mp4 -frames:v 1 -vf scale=360:-1 $SCRATCH/promo/qa/v-$t.jpg; ffmpeg -y -v error -ss $t -i $OUT/kilo-promo-landscape.mp4 -frames:v 1 -vf scale=640:-1 $SCRATCH/promo/qa/l-$t.jpg; done
ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate -of csv=p=0 $OUT/kilo-promo-vertical.mp4
echo ASSEMBLE_DONE
