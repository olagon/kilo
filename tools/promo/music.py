"""Kilo promo soundtrack. Pure numpy, no samples. Usage: python music.py out.wav [duration]"""
import sys, numpy as np

SR = 48000
BPM = 92
BEAT = 60 / BPM
BAR = BEAT * 4

def note(freq, dur, amp=1.0, attack=0.01, decay=0.5, sustain=0.5, release=0.3, harmonics=((1, 1.0), (2, 0.35), (3, 0.12), (4, 0.06))):
    n = int(SR * (dur + release))
    t = np.arange(n) / SR
    env = np.ones(n)
    a = int(SR * attack); d = int(SR * decay); r = int(SR * release)
    env[:a] = np.linspace(0, 1, a)
    env[a:a + d] = np.linspace(1, sustain, d)
    env[a + d:n - r] = sustain
    env[n - r:] = np.linspace(sustain, 0, r)
    sig = sum(w * np.sin(2 * np.pi * freq * k * t + 0.3 * k) for k, w in harmonics)
    return amp * env * sig

def place(mix, sig, t0):
    i = int(t0 * SR)
    j = min(len(mix), i + len(sig))
    if i < len(mix):
        mix[i:j] += sig[: j - i]

def midi(m):
    return 440 * 2 ** ((m - 69) / 12)

# chords as midi notes: Gmaj9, Cmaj9, Em9, Am7, Dadd9  (warm, no cheese)
CHORDS = {
    'G': [43, 55, 59, 62, 66, 69], 'C': [36, 52, 55, 59, 62, 64], 'E': [40, 52, 55, 59, 62, 66],
    'A': [45, 52, 57, 60, 64, 67], 'D': [38, 50, 54, 57, 64, 69],
}
PROG = ['G', 'C', 'E', 'A', 'G', 'C', 'A', 'D', 'G', 'C', 'E', 'A', 'G', 'C', 'A', 'D', 'G', 'G']
PENTA = [67, 69, 71, 74, 76, 79, 81, 83]  # G major pentatonic, mid register

def lowpass(x, cutoff):
    # one pole, cheap and warm
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    b = 1 - a
    for i in range(len(x)):
        acc = a * acc + b * x[i]
        y[i] = acc
    return y

def build(duration, pin_t=None, reveal_t=None, whoosh_ts=(), tick_ts=()):
    n = int(SR * duration)
    mix = np.zeros(n)
    rng = np.random.default_rng(7)
    # tine electric piano chords with slow tremolo
    for bar, name in enumerate(PROG):
        t0 = bar * BAR
        if t0 >= duration: break
        notes = CHORDS[name]
        for k, m in enumerate(notes[1:]):
            # arpeggiate gently so it breathes
            sig = note(midi(m), BAR * 0.95, amp=0.09, attack=0.02, decay=1.2, sustain=0.35, release=0.6)
            place(mix, sig, t0 + k * 0.035)
        bass = note(midi(notes[0]), BAR * 0.9, amp=0.16, attack=0.01, decay=0.8, sustain=0.5, release=0.4, harmonics=((1, 1.0), (2, 0.2)))
        place(mix, bass, t0)
    tt = np.arange(n) / SR
    mix *= 1 + 0.08 * np.sin(2 * np.pi * 4.5 * tt)  # tremolo
    # pad: soft detuned sines, enters after the first bar
    pad = np.zeros(n)
    for bar, name in enumerate(PROG):
        t0 = bar * BAR
        if t0 >= duration: break
        for m in CHORDS[name][2:5]:
            f = midi(m) / 2
            seg = note(f, BAR, amp=0.03, attack=0.6, decay=0.5, sustain=0.8, release=0.8, harmonics=((1, 1.0), (1.003, 0.8), (2.002, 0.15)))
            place(pad, seg, t0)
    place(mix, pad[int(BAR * SR):], BAR)
    # pulse: soft kick on 1 and 3, shaker on 8ths, from bar 2, fading out on the end card
    beats = int(duration / BEAT)
    for b in range(beats):
        t0 = b * BEAT
        if t0 < BAR * 1 or t0 > duration - 4.5: continue
        if b % 2 == 0:
            k = int(SR * 0.25); t = np.arange(k) / SR
            kick = 0.5 * np.sin(2 * np.pi * (55 + 40 * np.exp(-t * 30)) * t) * np.exp(-t * 18)
            place(mix, kick, t0)
        for half in (0, 0.5):
            k = int(SR * 0.08); 
            sh = rng.standard_normal(k) * np.exp(-np.arange(k) / SR * 80) * (0.035 if half == 0 else 0.022)
            sh = sh - lowpass(sh, 3000)  # high pass, keep it airy
            place(mix, sh, t0 + half * BEAT)
    # melody: pentatonic, enters at ~9 s, phrases of 4 notes, never busy
    mel_rng = np.random.default_rng(3)
    t = 9.0
    phrase = [PENTA[2], PENTA[4], PENTA[3], PENTA[1], PENTA[4], PENTA[5], PENTA[4], PENTA[2]]
    i = 0
    while t < duration - 6:
        m = phrase[i % len(phrase)]
        if 27 <= t < 33: m += 12 if m < 76 else 0  # lift for the montage
        dur = BEAT * (1.5 if i % 4 == 3 else 0.75)
        amp = 0.075 if 27 <= t < 33 else 0.055
        sig = note(midi(m), dur, amp=amp, attack=0.015, decay=0.6, sustain=0.3, release=0.5, harmonics=((1, 1.0), (2, 0.15), (3, 0.05)))
        place(mix, sig, t)
        t += dur + (BEAT * 0.25 if i % 4 == 3 else 0)
        i += 1
    # resolve: a final G chord swell on the end card
    for m in CHORDS['G'][1:]:
        place(mix, note(midi(m), 3.0, amp=0.07, attack=0.4, decay=1.0, sustain=0.6, release=1.5), duration - 4.2)
    # sound design
    if pin_t is not None:
        k = int(SR * 0.06); tq = np.arange(k) / SR
        place(mix, 0.35 * np.sin(2 * np.pi * 1800 * tq) * np.exp(-tq * 90), pin_t)
    for tk in tick_ts:
        k = int(SR * 0.04); tq = np.arange(k) / SR
        place(mix, 0.2 * np.sin(2 * np.pi * 2400 * tq) * np.exp(-tq * 150), tk)
    if reveal_t is not None:
        for j, m in enumerate([74, 79, 83]):
            place(mix, note(midi(m), 0.35, amp=0.14, attack=0.005, decay=0.3, sustain=0.2, release=0.4), reveal_t + j * 0.12)
    for w in whoosh_ts:
        k = int(SR * 0.45); tq = np.arange(k) / SR
        noise = rng.standard_normal(k)
        env = np.sin(np.pi * tq / 0.45) ** 2
        sweep = lowpass(noise, 600) * env * 0.5
        place(mix, sweep, w - 0.1)
    # gentle fade in/out, soft clip
    fade = int(SR * 0.3)
    mix[:fade] *= np.linspace(0, 1, fade)
    tail = int(SR * 2.0)
    mix[-tail:] *= np.linspace(1, 0, tail)
    mix = np.tanh(mix * 1.6) / 1.6
    return mix

def write_wav(path, x):
    import struct, wave
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

if __name__ == '__main__':
    out = sys.argv[1]
    dur = float(sys.argv[2]) if len(sys.argv) > 2 else 42.0
    cues = dict(pin_t=23.0, reveal_t=24.6, whoosh_ts=(27.0, 28.4, 29.8, 31.2), tick_ts=(33.6, 34.0, 34.4, 34.8, 35.2))
    if len(sys.argv) > 3:
        import json; cues.update(json.loads(sys.argv[3]))
    write_wav(out, build(dur, **cues))
    print('wrote', out)
