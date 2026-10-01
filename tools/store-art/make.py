"""Google Play listing images for Kilo. Rerun: <venv>/bin/python tools/store-art/make.py
Inputs: raw 1080x2400 screenshots, static TTFs, icon render, wordmark render (paths below)."""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = '/private/tmp/claude-501/-Users-olinlagon-code-hawaiigeoguesser/d31587dc-1feb-43db-b4e3-376c2eeeda90/scratchpad'
RAW = f'{S}/raw/shots'; FONTS = f'{S}/fonts'
ICON = f'{S}/icons/icon.png'; WORDMARK = f'{S}/opt/wordmark-glass.png'  # transparent sea-glass recolor of docs/logo.svg
OUT = os.path.join(os.path.dirname(__file__), '../../store/images'); OUT = os.path.abspath(OUT)
os.makedirs(f'{OUT}/phoneScreenshots', exist_ok=True)

NIGHT, MOANA, GLASS, ILIMA, FRAME = (10, 26, 36), (11, 79, 108), (238, 245, 243), (242, 169, 0), (18, 42, 55)

def font(name, px): return ImageFont.truetype(f'{FONTS}/{name}.ttf', px)

def gradient(w, h, top=NIGHT, bottom=MOANA, stop=1.0):
    im = Image.new('RGB', (w, h))
    px = im.load()
    for y in range(h):
        t = min(1.0, y / (h * stop))
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w): px[x, y] = c
    return im

def ridge(im, y0, color, pts):
    """Soft ridge silhouette along the bottom, like the icon."""
    w, h = im.size
    d = ImageDraw.Draw(im)
    poly = [(0, h)] + [(int(x * w), int(y0 + dy)) for x, dy in pts] + [(w, h)]
    d.polygon(poly, fill=color)

def phone(shot, width, crop_top=90, crop_bottom=0):
    """Raw screenshot inside a thin dark frame with rounded corners. Returns RGBA."""
    im = Image.open(shot).convert('RGB')
    im = im.crop((0, crop_top, im.width, im.height - crop_bottom))
    inner_w = width - 20
    im = im.resize((inner_w, int(im.height * inner_w / im.width)), Image.LANCZOS)
    r = 90
    out = Image.new('RGBA', (width, im.height + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle((0, 0, width - 1, out.height - 1), r + 10, fill=FRAME + (255,), outline=(60, 90, 105, 255), width=1)
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    out.paste(im, (10, 10), mask)
    return out

def drop(bg, layer, x, y, angle=0):
    """Paste an RGBA layer with a soft shadow, optionally tilted."""
    if angle:
        layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    shadow = Image.new('RGBA', (layer.width + 160, layer.height + 160), (0, 0, 0, 0))
    a = layer.split()[3]
    shadow.paste((0, 0, 0, 150), (80, 110), a)
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    bg.alpha_composite(shadow, (x - 80, y - 80))
    bg.alpha_composite(layer, (x, y))

def text_block(d, headline, subline, y, w, hfont, sfont):
    x = 80
    for line in headline.split('\n'):
        d.text((x, y), line, font=hfont, fill=GLASS)
        y += int(hfont.size * 1.08)
    y += 18
    d.rectangle((x, y, x + 64, y + 5), fill=ILIMA)
    y += 30
    for line in wrap(d, subline, sfont, w - 2 * x):
        d.text((x, y), line, font=sfont, fill=(238, 245, 243, 200))
        y += int(sfont.size * 1.35)
    return y + 10

def wrap(d, text, f, max_w):
    words, lines, cur = text.split(), [], ''
    for wd in words:
        t = (cur + ' ' + wd).strip()
        if d.textlength(t, font=f) <= max_w: cur = t
        else: lines.append(cur); cur = wd
    return lines + [cur]

SLIDES = [
    ('practice3-sky', 'Five places in Hawaiʻi.\nEvery day.', 'Same five for everyone. New at midnight Hawaiʻi time.', 0),
    ('round4-sky', 'Look around.\nYou can’t move.', 'Turn and tilt over real terrain. The clues are in front of you.', -3),
    ('round1-fullmap', 'Drop your pin.', 'Tap the islands. Drag to fine tune. Lock it in.', 0),
    ('practice4-reveal', 'How close were you?', 'Up to 5,000 points a round. The right island matters most.', 3),
    ('summary', 'Share your score,\nnot the answers.', 'A result card that makes friends want to play.', 0),
    ('leaderboard', 'Today and this month.', 'Free and open source. Zero tracking. No account, just a name.', -3),
    ('stats-real', 'The islands\nyou know best.', 'Streaks, best days, perfect rounds, and your average distance per island.', 0),
    ('practice-setup', 'Practice anytime.', 'Hundreds of extra spots. Filter by island or difficulty.', 3),
]

def screenshot(i, shot, headline, subline, angle):
    W, H = 1080, 2400
    bg = gradient(W, H, NIGHT, MOANA).convert('RGBA')
    ridge(bg, 1500, (12, 60, 80, 255), [(0, 220), (0.15, 90), (0.3, 170), (0.48, 20), (0.62, 140), (0.78, 60), (0.9, 150), (1, 90)])
    d = ImageDraw.Draw(bg)
    hf = font('Fraunces-Bold', 84 if '\n' in headline else 88)
    y_end = text_block(d, headline, subline, 150, W, hf, font('Inter-Regular', 38))
    layer = phone(f'{RAW}/{shot}.png', 880)
    y = max(y_end + 40, 560)
    x = (W - layer.width) // 2 if not angle else (W - layer.width) // 2 + (30 if angle > 0 else -30)
    if angle:
        y -= 20
    drop(bg, layer, x, y, angle)
    bg = bg.crop((0, 0, W, H)).convert('RGB')
    bg.save(f'{OUT}/phoneScreenshots/{i:02d}.png', optimize=True)

def feature_graphic():
    W, H = 1024, 500
    bg = gradient(W, H, NIGHT, MOANA).convert('RGBA')
    ridge(bg, 390, (14, 70, 92, 255), [(0, 60), (0.12, 10), (0.25, 50), (0.4, -20), (0.55, 40), (0.7, 0), (0.85, 55), (1, 20)])
    wm = Image.open(WORDMARK).convert('RGBA')
    wm = wm.resize((int(wm.width * 150 / wm.height), 150), Image.LANCZOS)
    bg.alpha_composite(wm, (96, 118))
    d = ImageDraw.Draw(bg)
    d.text((104, 300), 'Five places in Hawaiʻi a day.', font=font('Inter-SemiBold', 36), fill=GLASS)
    d.text((104, 352), 'Look around. Drop a pin. See how close you were.', font=font('Inter-Regular', 24), fill=(238, 245, 243, 190))
    layer = phone(f'{RAW}/practice3-sky.png', 300)
    drop(bg, layer, 700, 60, -8)
    bg.crop((0, 0, W, H)).convert('RGB').save(f'{OUT}/featureGraphic.png', optimize=True)

def icon():
    Image.open(ICON).convert('RGBA').resize((512, 512), Image.LANCZOS).save(f'{OUT}/icon.png', optimize=True)

def poster():
    W, H = 1080, 1920
    bg = gradient(W, H, NIGHT, MOANA).convert('RGBA')
    ridge(bg, 1500, (12, 60, 80, 255), [(0, 220), (0.15, 90), (0.3, 170), (0.48, 20), (0.62, 140), (0.78, 60), (0.9, 150), (1, 90)])
    ic = Image.open(ICON).convert('RGBA').resize((520, 520), Image.LANCZOS)
    mask = Image.new('L', ic.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, 519, 519), 116, fill=255)
    ic.putalpha(mask)
    drop(bg, ic, (W - 520) // 2, 330)
    wm = Image.open(WORDMARK).convert('RGBA')
    wm = wm.resize((int(wm.width * 200 / wm.height), 200), Image.LANCZOS)
    bg.alpha_composite(wm, ((W - wm.width) // 2, 960))
    d = ImageDraw.Draw(bg)
    f = font('Inter-SemiBold', 46); t = 'Five places in Hawaiʻi a day.'
    d.text(((W - d.textlength(t, font=f)) // 2, 1220), t, font=f, fill=GLASS)
    f2 = font('Inter-Regular', 34); t2 = 'Think you know the islands?'
    d.text(((W - d.textlength(t2, font=f2)) // 2, 1300), t2, font=f2, fill=(238, 245, 243, 190))
    bg.convert('RGB').save(f'{OUT}/promo-poster.png', optimize=True)

if __name__ == '__main__':
    for i, s in enumerate(SLIDES, 1): screenshot(i, *s)
    feature_graphic(); icon(); poster()
    for f in sorted(os.listdir(f'{OUT}/phoneScreenshots')): assert Image.open(f'{OUT}/phoneScreenshots/{f}').size == (1080, 2400), f
    assert Image.open(f'{OUT}/featureGraphic.png').size == (1024, 500)
    assert Image.open(f'{OUT}/icon.png').size == (512, 512)
    print('ok')
