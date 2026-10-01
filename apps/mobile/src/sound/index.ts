import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let ctx: AudioContext | null = null;
let soundOn = true;
let hapticsOn = true;

export function configureFeedback(opts: { sound: boolean; haptics: boolean }) {
  soundOn = opts.sound;
  hapticsOn = opts.haptics;
}

function audio(): AudioContext | null {
  if (!soundOn) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One soft note. type sine keeps it gentle. */
function note(freq: number, at: number, dur: number, gain = 0.08, type: OscillatorType = 'sine') {
  const c = audio();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + at;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  pinDrop: () => note(660, 0, 0.09, 0.06, 'triangle'),
  lockIn: () => {
    note(523, 0, 0.12);
    note(784, 0.09, 0.18);
  },
  tick: () => note(1200, 0, 0.03, 0.02),
  perfect: () => {
    note(523, 0, 0.2);
    note(659, 0.12, 0.2);
    note(784, 0.24, 0.35, 0.1);
  },
  dayComplete: () => {
    for (const [i, f] of [392, 494, 587, 784].entries()) note(f, i * 0.05, 0.9, 0.05);
  },
};

export const haptic = {
  light: () => hapticsOn && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  medium: () => hapticsOn && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
  success: () => hapticsOn && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
};
