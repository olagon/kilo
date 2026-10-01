"""Kilo promo renderer. Composes emulator footage + motion graphics frame by frame and pipes raw RGB to ffmpeg.
Usage: python render.py vertical|landscape out.mp4 music.wav
Expects frames extracted by assemble.sh into $SCRATCH/promo/frames/<clip>/%05d.jpg (1080x2400 @ 30 fps)."""
import os, sys, math, json, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SCRATCH = os.environ.get('SCRATCH', '/private/tmp/claude-501/-Users-olinlagon-code-hawaiigeoguesser/d31587dc-1feb-43db-b4e3-376c2eeeda90/scratchpad')
FR = f'{SCRATCH}/promo/frames'
FONTS = f'{SCRATCH}/fonts'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
FPS = 30
NIGHT = (10, 26, 36); MOANA = (11, 79, 108); KEA = (238, 245, 243); ILIMA = (242, 169, 0); LEHUA = (215, 38, 61); KALO = (63, 125, 58)
TIER = {'green': (76, 175, 80), 'yellow': (242, 201, 76), 'orange': (242, 140, 40), 'red': (215, 38, 61)}

LAYOUT = sys.argv[1]; OUT = sys.argv[2]; MUSIC = sys.argv[3]
W, H = (1080, 1920) if LAYOUT == 'vertical' else (1920, 1080)
V = LAYOUT == 'vertical'

def font(name, size):
    return ImageFont.truetype(f'{FONTS}/{name}.ttf', size)

def ease_out(t): return 1 - (1 - min(max(t, 0), 1)) ** 3
def ease_in_out(t): t = min(max(t, 0), 1); return 3 * t * t - 2 * t * t * t
def clamp01(x): return min(max(x, 0.0), 1.0)

# ---------- assets ----------
def load_rgba(path): return Image.open(path).convert('RGBA')
def make_wordmark(fs=900):
    """Kilo mark from the same Fraunces instance the app uses: 'Kil' as text, the o as a ring and ʻilima dot."""
    f = ImageFont.truetype(f'{FONTS}/Fraunces-Bold.ttf', fs)
    u = fs / 2000  # font units to px
    cx, cy_up = 3067.6 * u, 443.4 * u      # ring center from the SVG geometry (y up from the baseline)
    r_out, r_in, r_dot = 475.6 * u, 285.8 * u, 157.2 * u
    pad = int(60 * u)
    asc = f.getbbox('K', anchor='ls')[1] * -1   # cap height in px (bbox top is negative with baseline anchor)
    w = int(cx + r_out + pad); base = pad + int(asc)
    h = base + int(r_out - cy_up) + pad
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.text((pad, base), 'Kil', font=f, fill=KEA + (255,), anchor='ls')
    cxp, cyp = pad + cx, base - cy_up
    d.ellipse([cxp - r_out, cyp - r_out, cxp + r_out, cyp + r_out], fill=KEA + (255,))
    d.ellipse([cxp - r_in, cyp - r_in, cxp + r_in, cyp + r_in], fill=(0, 0, 0, 0))
    d.ellipse([cxp - r_dot, cyp - r_dot, cxp + r_dot, cyp + r_dot], fill=ILIMA + (255,))
    return im, (cxp, cyp), r_dot, r_in, r_out
WORDMARK, DOT, DOT_R, RING_IN, RING_OUT = make_wordmark()
ICON = load_rgba(f'{SCRATCH}/promo/icon.png')
def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    out = im.copy(); out.putalpha(m); return out
ICON_R = rounded(ICON, int(ICON.width * 0.22))
LETTERS_RIGHT = DOT[0] - RING_OUT - 10  # letters live left of this x

# ---------- vignette and grain ----------
def vignette(w, h):
    y, x = np.mgrid[0:h, 0:w]
    d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
    return (1 - 0.42 * np.clip((d - 0.55) / 0.9, 0, 1) ** 1.5).astype(np.float32)[..., None]
VIG = vignette(W, H)
RNG = np.random.default_rng(1)

def finish(img):
    a = np.asarray(img.convert('RGB'), dtype=np.float32)
    a *= VIG
    a += RNG.normal(0, 3.2, size=(H, W, 1)).astype(np.float32)
    return np.clip(a, 0, 255).astype(np.uint8).tobytes()

# ---------- footage ----------
def clip_frame(clip, t):
    """Raw 1080x2400 frame at clip time t (seconds)."""
    i = int(round(t * FPS)) + 1
    path = f'{FR}/{clip}/{i:05d}.jpg'
    if not os.path.exists(path):
        last = sorted(os.listdir(f'{FR}/{clip}'))[-1]
        path = f'{FR}/{clip}/{last}'
    return Image.open(path).convert('RGB')

def fullbleed(raw, zoom=1.0, dx=0.0):
    """Middle region of the recording (no HUD) scaled to fill the frame."""
    src = raw.crop((0, 430, 1080, 2040)) if V else raw.crop((0, 430, 1080, 1980))  # start below the horizon band
    s = max(W / src.width, H / src.height) * zoom
    im = src.resize((int(src.width * s) + 1, int(src.height * s) + 1), Image.BILINEAR)
    x = (im.width - W) // 2 + int(dx * (im.width - W) / 2)
    y = (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))

def phone_content(raw):
    return raw.crop((0, 95, 1080, 2340))  # under the status bar, above the nav pill

PHONE_H = 1560 if V else 920
def phone(raw, scale=1.0, alpha=1.0, cx=None, cy=None):
    """Device mockup with the app screen inside. Returns an RGBA layer the size of the frame."""
    content = phone_content(raw)
    h = int(PHONE_H * scale); w = int(content.width * h / content.height)
    screen = rounded(content.resize((w, h), Image.BILINEAR).convert('RGBA'), int(w * 0.11))
    bezel = int(16 * scale) + 2
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cx = W // 2 if cx is None else cx; cy = H // 2 if cy is None else cy
    x0, y0 = cx - w // 2, cy - h // 2
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([x0 - bezel - 10, y0 - bezel + 14, x0 + w + bezel + 10, y0 + h + bezel + 34], int(w * 0.13) + bezel, fill=(0, 0, 0, 90))  # shadow
    d.rounded_rectangle([x0 - bezel, y0 - bezel, x0 + w + bezel, y0 + h + bezel], int(w * 0.13) + bezel, fill=(24, 36, 44, 255), outline=(70, 88, 98, 255), width=2)
    layer.alpha_composite(screen, (x0, y0))
    if alpha < 1:
        a = layer.split()[3].point(lambda p: int(p * alpha)); layer.putalpha(a)
    return layer

def blur_bg(raw):
    """Landscape background: the footage, blown up, blurred and darkened."""
    src = raw.crop((0, 500, 1080, 1900))
    small = src.resize((192, int(192 * src.height / src.width))).filter(ImageFilter.GaussianBlur(6))
    s = max(W / small.width, H / small.height)
    im = small.resize((int(small.width * s) + 1, int(small.height * s) + 1), Image.BILINEAR)
    im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
    return Image.blend(im, Image.new('RGB', (W, H), NIGHT), 0.55)

# ---------- text ----------
def text_block(draw, lines, x, y, fnt, fill, align='left', line_gap=1.08, alpha=1.0, shadow=True):
    fill = tuple(fill) + (int(255 * alpha),)
    for i, line in enumerate(lines):
        bbox = fnt.getbbox(line); lh = int(fnt.size * line_gap)
        tx = x if align == 'left' else (x - (bbox[2] - bbox[0]) // 2 if align == 'center' else x - (bbox[2] - bbox[0]))
        if shadow:
            draw.text((tx + 3, y + i * lh + 4), line, font=fnt, fill=(0, 0, 0, int(120 * alpha)))
        draw.text((tx, y + i * lh), line, font=fnt, fill=fill)

def anim(t, t0, t1, fade_in=0.5, fade_out=0.35):
    """Opacity and slide offset for a caption living between t0 and t1."""
    if t < t0 or t > t1: return 0.0, 0.0
    a_in = ease_out((t - t0) / fade_in); a_out = ease_out((t1 - t) / fade_out)
    a = min(a_in, a_out)
    return a, (1 - a_in) * 40

def scrim(img, top=False, strength=150):
    """Dark gradient for caption legibility."""
    g = Image.new('L', (1, H))
    px = [int(strength * (1 - i / H) ** 2) if top else int(strength * (i / H) ** 2.2) for i in range(H)]
    g.putdata(px)
    layer = Image.new('RGBA', (W, H), NIGHT + (0,)); layer.putalpha(g.resize((W, H)))
    img.alpha_composite(layer)

BIG = font('Fraunces-Bold', 112 if V else 96)
MID = font('Fraunces-Bold', 76 if V else 68)
SUB = font('Inter-Regular', 40 if V else 34)
PILL = font('Inter-SemiBold', 38 if V else 34)
SMALL = font('Inter-Regular', 34 if V else 30)
NUM = font('Fraunces-Bold', 200 if V else 170)

def caption(img, t, t0, t1, lines, fnt=BIG, sub=None, pos='bottom'):
    a, dy = anim(t, t0, t1)
    if a <= 0: return
    d = ImageDraw.Draw(img)
    if V:
        x = 72; align = 'left'
        y = (H - 420 - len(lines) * int(fnt.size * 1.08)) if pos == 'bottom' else 200
    else:
        x = 110; align = 'left'; y = 300 if pos != 'center' else 380
    text_block(d, lines, x, int(y + dy), fnt, KEA, align, alpha=a)
    if sub:
        text_block(d, [sub], x, int(y + dy + len(lines) * int(fnt.size * 1.08) + 18), SUB, (201, 219, 230), align, alpha=a)

def pill(img, t, t0, t1, text, x, y):
    a, dy = anim(t, t0, t1, 0.25, 0.2)
    if a <= 0: return
    d = ImageDraw.Draw(img)
    bb = PILL.getbbox(text); w = bb[2] - bb[0] + 56; h = PILL.size + 32
    d.rounded_rectangle([x, y + dy, x + w, y + dy + h], h // 2, fill=(10, 26, 36, int(190 * a)))
    d.text((x + 28, y + dy + 14), text, font=PILL, fill=KEA + (int(255 * a),))

# ---------- scenes ----------
# (name, start, end). Clip times are offsets into the extracted frame sequences.
SCENES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scenes.json')))

def wordmark_layer(t, stage_t):
    """Title build: dot, then ring draws, then letters slide in. stage_t is seconds since scene start."""
    scale = (0.62 if V else 0.5)
    wm = WORDMARK.resize((int(WORDMARK.width * scale), int(WORDMARK.height * scale)), Image.LANCZOS)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ox = (W - wm.width) // 2; oy = (H - wm.height) // 2
    d = ImageDraw.Draw(layer)
    cx, cy = ox + DOT[0] * scale, oy + DOT[1] * scale
    # dot
    a = ease_out(stage_t / 0.5)
    r = DOT_R * scale * (0.6 + 0.4 * a)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ILIMA + (int(255 * a),))
    # ring draws clockwise from the top
    if stage_t > 0.45:
        sweep = 360 * ease_in_out((stage_t - 0.45) / 0.8)
        ro, ri = RING_OUT * scale, RING_IN * scale
        width = ro - ri
        d.arc([cx - ro + width / 2, cy - ro + width / 2, cx + ro - width / 2, cy + ro - width / 2], -90, -90 + sweep, fill=KEA + (255,), width=int(width))
    # letters slide in and fade
    if stage_t > 1.0:
        la = ease_out((stage_t - 1.0) / 0.6)
        letters = wm.crop((0, 0, int(LETTERS_RIGHT * scale), wm.height))
        al = letters.split()[3].point(lambda p: int(p * la)); letters.putalpha(al)
        layer.alpha_composite(letters, (int(ox - (1 - la) * 60), oy))
    return layer

def frame(t):
    img = Image.new('RGBA', (W, H), NIGHT + (255,))
    for sc in SCENES:
        if not (sc['start'] <= t < sc['end']): continue
        st = t - sc['start']; name = sc['name']
        if name == 'title':
            img.alpha_composite(wordmark_layer(t, st))
            if st > 2.0:  # cut flash to white-ish sea glass right before the first footage
                f = ease_out((st - 2.0) / 0.5) * 0.9
                img.alpha_composite(Image.new('RGBA', (W, H), KEA + (int(255 * f),)))
        elif name in ('sky', 'phone', 'guess', 'montage'):
            raw = clip_frame(sc['clip'], sc['clip_start'] + st)
            if V and name == 'sky':
                z = 1.0 + 0.06 * (st / (sc['end'] - sc['start']))  # slow push in
                img.alpha_composite(fullbleed(raw, z).convert('RGBA'))
                scrim(img)
            elif V and name == 'montage':
                img.alpha_composite(fullbleed(raw, 1.04).convert('RGBA'))
                scrim(img, strength=110)
            else:
                img.alpha_composite(blur_bg(raw).convert('RGBA') if not V else Image.new('RGBA', (W, H), NIGHT + (255,)))
                if not V and name in ('sky', 'montage'):
                    # landscape: wide crop of the footage on the right, type on the left
                    src = raw.crop((0, 600, 1080, 1800)).resize((1080, 1200), Image.BILINEAR)
                    img.alpha_composite(rounded(src.convert('RGBA'), 48), (W - 1080 - 80, (H - 1200) // 2))
                else:
                    intro = not sc.get('no_intro')
                    s = 1.0 if (st > 0.6 or not intro) else 1.08 - 0.08 * ease_out(st / 0.6)
                    al = 1.0 if (st > 0.4 or not intro) else ease_out(st / 0.4)
                    img.alpha_composite(phone(raw, s, al, cx=(W // 2 if V else W - 560), cy=(H // 2 + (60 if V else 0))))
            # captions per scene
            for c in sc.get('captions', []):
                caption(img, t, c['t0'], c['t1'], c['lines'], MID if c.get('size') == 'mid' else BIG, c.get('sub'), c.get('pos', 'bottom'))
            if sc.get('pill'):
                px = 72 if V else 110; py = (H - 300) if V else 760
                pill(img, t, sc['start'] + 0.15, sc['end'], sc['pill'], px, py)
            if sc.get('pulse') and 0.8 < st < 2.4:  # midnight dot pulse next to the subline
                k = (st - 0.8) / 1.6; d = ImageDraw.Draw(img)
                cx, cy = (W - 160, H - 470) if V else (W - 1160 - 60, 560)
                for i in range(3):
                    rr = 14 + 60 * clamp01(k * 1.4 - i * 0.25); aa = int(200 * (1 - clamp01(k * 1.4 - i * 0.25)))
                    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=ILIMA + (aa,), width=4)
                d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=ILIMA + (255,))
            if name == 'montage' and st < 0.22:  # whip in: horizontal smear
                a = np.asarray(img.convert('RGB')); k = int(90 * (1 - st / 0.22))
                acc = sum(np.roll(a, s, axis=1).astype(np.float32) for s in range(-k, k + 1, max(1, k // 4)))
                img = Image.fromarray((acc / len(range(-k, k + 1, max(1, k // 4)))).astype(np.uint8)).convert('RGBA')
        elif name == 'result':
            d = ImageDraw.Draw(img)
            cx = W // 2
            # score counts up
            a = ease_out(st / 2.4); score = int(18420 * a)
            top = 420 if V else 170
            text_block(d, [f'{score:,}'], cx, top, NUM, KEA, 'center', shadow=False)
            text_block(d, ['of 25,000'], cx, top + NUM.size + 10, SUB, (157, 179, 189), 'center', shadow=False)
            tiles = ['green', 'green', 'yellow', 'orange', 'red']; dist = ['98 ft', '0.7 mi', '5.6 mi', '19 mi', '61 mi']
            size = 150 if V else 120; gap = 22
            x0 = cx - (size * 5 + gap * 4) // 2; y0 = top + NUM.size + 130
            for i, tier in enumerate(tiles):
                k = ease_out((st - 0.2 - i * 0.4) / 0.35)
                if k <= 0: continue
                s = size * (0.6 + 0.4 * k) * (1 + 0.12 * math.sin(math.pi * k))  # little bounce
                x = x0 + i * (size + gap) + size / 2; y = y0 + size / 2
                d.rounded_rectangle([x - s / 2, y - s / 2, x + s / 2, y + s / 2], int(s * 0.18), fill=TIER[tier] + (int(255 * k),))
                if k >= 1:
                    text_block(d, [dist[i]], int(x), int(y + size / 2 + 14), SMALL, (157, 179, 189), 'center', shadow=False)
            a2, dy = anim(t, sc['start'] + 2.8, sc['end'])
            if a2 > 0:
                text_block(d, ['Share your day,', 'spoiler free.'], cx, int((y0 + size + 160 if V else y0 + size + 110) + dy), MID, KEA, 'center', alpha=a2, shadow=False)
        elif name == 'end':
            d = ImageDraw.Draw(img)
            a = ease_out(st / 0.7)
            ic = ICON_R.resize((260, 260) if V else (200, 200), Image.LANCZOS)
            scale = 0.5 if V else 0.42
            wm = WORDMARK.resize((int(WORDMARK.width * scale), int(WORDMARK.height * scale)), Image.LANCZOS)
            cx = W // 2; y = (H // 2 - 420) if V else (H // 2 - 330)
            icl = ic.copy(); icl.putalpha(ic.split()[3].point(lambda p: int(p * a)))
            img.alpha_composite(icl, (cx - ic.width // 2, int(y + (1 - a) * 30)))
            wml = wm.copy(); wml.putalpha(wm.split()[3].point(lambda p: int(p * a)))
            img.alpha_composite(wml, (cx - wm.width // 2, y + ic.height + 40))
            a2, dy = anim(t, sc['start'] + 0.6, sc['end'] + 1)
            yy = y + ic.height + 40 + wm.height + 60
            text_block(d, ['Think you know the islands?'], cx, int(yy + dy), MID, KEA, 'center', alpha=a2, shadow=False)
            a3, dy3 = anim(t, sc['start'] + 1.3, sc['end'] + 1)
            text_block(d, ['Free on Google Play  ·  No account  ·  No ads'], cx, int(yy + MID.size + 60 + dy3), SMALL, (157, 179, 189), 'center', alpha=a3, shadow=False)
            text_block(d, ['olagon.github.io/kilo'], cx, int(yy + MID.size + 60 + SMALL.size + 24 + dy3), SMALL, ILIMA, 'center', alpha=a3, shadow=False)
            if st > (sc['end'] - sc['start']) - 1.0:  # fade to night
                f = clamp01((st - ((sc['end'] - sc['start']) - 1.0)) / 1.0)
                img.alpha_composite(Image.new('RGBA', (W, H), NIGHT + (int(255 * f),)))
        break
    return img

if __name__ == '__main__':
    total = max(s['end'] for s in SCENES)
    n = int(round(total * FPS))
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-i', MUSIC, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '21', '-preset', 'slow', '-tune', 'film', '-pix_fmt', 'yuv420p',
           '-g', str(FPS * 2), '-keyint_min', str(FPS * 2), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(finish(frame(i / FPS)))
        if i % 150 == 0: print(f'{LAYOUT}: {i}/{n}', flush=True)
    p.stdin.close(); p.wait()
    print('done', OUT, p.returncode)
