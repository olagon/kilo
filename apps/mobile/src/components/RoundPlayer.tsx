import { useEffect, useRef, useState } from 'react';
import { ISLAND_BY_ID, type Answer, type LatLon, type SkyView as SkyViewData } from '@huli/shared';
import { SkyView, type SkyViewHandle } from '../map/SkyView';
import { GuessMap } from '../map/GuessMap';
import { formatDistance, formatPoints } from '../format';
import { t } from '../i18n/t';
import { useStore } from '../store';
import { haptic, sfx } from '../sound';
import { CountUp } from './ui';
import { GuessSheet } from './GuessSheet';
import { TimerRing } from './TimerRing';

export interface RoundResult {
  points: number;
  distanceM: number;
  answer: Answer;
  guess: LatLon | null;
}

interface Props {
  view: SkyViewData;
  title: string;
  sub?: string;
  /** local epoch ms when time runs out, or null for no timer */
  deadline: number | null;
  timerSeconds: number;
  onGuess: (pin: LatLon | null) => Promise<RoundResult>;
  nextLabel: string;
  onNext: (r: RoundResult) => void;
  hint?: string;
  coach?: boolean;
  onCoachDone?: () => void;
}

type Phase = 'play' | 'scoring' | 'reveal';
type CoachStep = 'swivel' | 'open' | 'pin' | 'lock' | 'done';

/** One round: look around, guess, reveal. Used by the daily, practice, and the tutorial. */
export function RoundPlayer({ view, title, sub, deadline, timerSeconds, onGuess, nextLabel, onNext, hint, coach, onCoachDone }: Props) {
  const settings = useStore((s) => s.settings);
  const [phase, setPhase] = useState<Phase>('play');
  const [sheet, setSheet] = useState(false);
  const [pin, setPin] = useState<LatLon | null>(null);
  const [left, setLeft] = useState<number>(deadline ? (deadline - Date.now()) / 1000 : Infinity);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [lineDone, setLineDone] = useState(false);
  const [distDone, setDistDone] = useState(false);
  const [error, setError] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [step, setStep] = useState<CoachStep>('swivel');
  const sky = useRef<SkyViewHandle>(null);
  const submitting = useRef(false);
  const lastTick = useRef(-1);

  // reset per round
  useEffect(() => {
    setPhase('play');
    setSheet(false);
    setPin(null);
    setResult(null);
    setLineDone(false);
    setDistDone(false);
    setError(false);
    setShowHint(false);
    submitting.current = false;
    setLeft(deadline ? (deadline - Date.now()) / 1000 : Infinity);
  }, [view, deadline]);

  async function submit(p: LatLon | null) {
    if (submitting.current) return;
    submitting.current = true;
    setPhase('scoring');
    setError(false);
    try {
      const r = await onGuess(p);
      setResult(r);
      setPhase('reveal');
      setSheet(false);
      if (r.points >= 5000) {
        sfx.perfect();
        void haptic.success();
      }
    } catch {
      setError(true);
      setPhase('play');
      submitting.current = false;
    }
  }

  // timer
  useEffect(() => {
    if (!deadline || phase !== 'play') return;
    const id = setInterval(() => {
      const s = (deadline - Date.now()) / 1000;
      setLeft(s);
      const whole = Math.ceil(s);
      if (whole <= 5 && whole > 0 && whole !== lastTick.current) {
        lastTick.current = whole;
        sfx.tick();
      }
      if (s <= 0) void submit(pin);
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, phase, pin]);

  if (phase === 'reveal' && result) {
    const island = ISLAND_BY_ID[result.answer.island]?.name ?? result.answer.island;
    const where =
      result.answer.near && result.answer.near !== result.answer.placeName
        ? t('reveal.near', { place: result.answer.near, island })
        : t('reveal.at', { place: result.answer.placeName, island });
    const perfect = result.points >= 5000;
    return (
      <div className="screen" style={{ background: 'var(--bg)' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <GuessMap
            pin={result.guess}
            onPin={() => {}}
            disabled
            reveal={{ guess: result.guess, answer: { lat: result.answer.lat, lon: result.answer.lon } }}
            onRevealDone={() => setLineDone(true)}
            hawaiianNames={settings.hawaiianNames}
            reducedMotion={settings.reduceMotion}
            revealBottomPadding={Math.round(window.innerHeight * 0.42)}
          />
        </div>
        <div className="hud" style={{ top: 'calc(var(--safe-top) + 12px)', left: 16 }}>
          <span className="pill-scrim">{title}</span>
        </div>
        <div className="card fade-in" style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(var(--safe-bottom) + 12px)', borderRadius: 24, padding: 20, zIndex: 10 }} aria-live="polite">
          <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>{result.answer.placeName}</p>
          <p className="muted" style={{ marginBottom: 12 }}>{where}</p>
          {result.guess ? (
            <p className="muted" style={{ fontSize: '1.0625rem' }}>
              {lineDone ? <CountUp to={result.distanceM} duration={0.8} format={(n) => formatDistance(n, settings.units)} onDone={() => setDistDone(true)} /> : <span className="num">&nbsp;</span>}
              {lineDone && ` ${t('reveal.away')}`}
            </p>
          ) : (
            <p className="muted">{t('reveal.no_pin')}</p>
          )}
          <p className="display num" style={{ fontSize: '3rem', lineHeight: 1.05, margin: '4px 0 2px', color: perfect ? 'var(--accent)' : 'var(--fg)' }}>
            {distDone || !result.guess ? <CountUp to={result.points} duration={0.9} format={formatPoints} /> : ' '}
          </p>
          <p className="muted" style={{ marginBottom: 14 }}>
            {perfect ? t('reveal.perfect') : t('reveal.points')}
            {result.answer.funFact && ` · ${result.answer.funFact}`}
          </p>
          {coach && <p className="muted" style={{ marginBottom: 12 }}>{t('coach.done')}</p>}
          <button className="btn btn-primary btn-block" onClick={() => (coach ? onCoachDone?.() : onNext(result))}>
            {coach ? t('coach.finish') : nextLabel}
          </button>
        </div>
      </div>
    );
  }

  const coachNow: CoachStep | null = coach ? step : null;

  return (
    <div className="screen" style={{ background: 'var(--kai-po)' }}>
      <div style={{ position: 'absolute', inset: 0 }} onPointerUp={() => coachNow === 'swivel' && setStep('open')}>
        <SkyView ref={sky} view={view} interactive dataSaver={settings.dataSaver} reducedMotion={settings.reduceMotion} />
      </div>

      <div className="hud" style={{ top: 'calc(var(--safe-top) + 12px)', left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
          <span className="pill-scrim">{title}</span>
          {sub && <span className="pill-scrim num" style={{ fontSize: '0.875rem', padding: '5px 12px' }}>{sub}</span>}
        </div>
        {deadline && phase === 'play' && <TimerRing seconds={left} total={timerSeconds} />}
      </div>

      {coachNow === 'swivel' && <div className="hud pill-scrim fade-in" style={{ top: '45%', left: 32, right: 32, textAlign: 'center' }}>{t('coach.swivel')}</div>}

      <div className="hud" style={{ right: 16, bottom: 'calc(var(--safe-bottom) + 20px)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
        {hint && !showHint && (
          <button className="btn btn-sm" onClick={() => setShowHint(true)}>{t('round.hint')}</button>
        )}
        {hint && showHint && <span className="pill-scrim fade-in">{hint}</span>}
        {coachNow === 'open' && <span className="pill-scrim fade-in">{t('coach.open')}</span>}
        <button
          className="btn btn-accent"
          style={{ minWidth: 120, boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}
          onClick={() => {
            setSheet(true);
            if (coachNow === 'open' || coachNow === 'swivel') setStep('pin');
          }}
        >
          {t('round.guess')}
        </button>
      </div>

      {error && (
        <div className="hud card fade-in" role="alert" style={{ left: 16, right: 16, bottom: 'calc(var(--safe-bottom) + 90px)', zIndex: 30 }}>
          <p style={{ marginBottom: 10 }}>{t('round.error')}</p>
          <button className="btn btn-primary btn-sm" onClick={() => void submit(pin)}>{t('round.retry')}</button>
        </div>
      )}

      <GuessSheet
        open={sheet}
        pin={pin}
        onPin={(p) => {
          setPin(p);
          if (coachNow === 'pin') setStep('lock');
        }}
        onLock={() => {
          sfx.lockIn();
          void haptic.medium();
          void submit(pin);
        }}
        onClose={() => setSheet(false)}
        locking={phase === 'scoring'}
        coach={coachNow === 'pin' ? 'pin' : coachNow === 'lock' ? 'lock' : null}
      />
    </div>
  );
}
