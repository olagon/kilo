import { useState } from 'react';
import { scoreGuess, type LatLon } from '@huli/shared';
import { RoundPlayer } from '../components/RoundPlayer';
import { t } from '../i18n/t';
import { useStore } from '../store';

const CARDS = ['tutorial.card1', 'tutorial.card2', 'tutorial.card3', 'tutorial.card4'];

/** Four short cards, swipeable, skippable. */
export function TutorialCards() {
  const [i, setI] = useState(0);
  const go = useStore((s) => s.go);
  const [x0, setX0] = useState<number | null>(null);
  const last = i === CARDS.length - 1;
  return (
    <div className="screen">
      <div
        className="screen-pad"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', touchAction: 'pan-y' }}
        onPointerDown={(e) => setX0(e.clientX)}
        onPointerUp={(e) => {
          if (x0 === null) return;
          const dx = e.clientX - x0;
          if (dx < -40 && !last) setI(i + 1);
          if (dx > 40 && i > 0) setI(i - 1);
          setX0(null);
        }}
      >
        <div key={i} className="fade-in" style={{ textAlign: 'center' }}>
          <Illustration step={i} />
          <p style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.25, maxWidth: 420, margin: '24px auto 0' }}>{t(CARDS[i]!)}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '28px 0' }} aria-label={`${i + 1} / ${CARDS.length}`}>
          {CARDS.map((_, k) => (
            <span key={k} style={{ width: 8, height: 8, borderRadius: 4, background: k === i ? 'var(--fg)' : 'var(--line)' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, maxWidth: 480, width: '100%', margin: '0 auto' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => go('tutorial', true)}>{t('tutorial.skip')}</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => (last ? go('tutorial', true) : setI(i + 1))}>
            {last ? t('tutorial.start') : t('tutorial.next')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Illustration({ step }: { step: number }) {
  const stroke = 'var(--fg)';
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" aria-hidden style={{ maxWidth: '70%' }}>
      {step === 0 && (
        <>
          <path d="M20 110c30-30 60-40 90-30s60 30 90 20" stroke="var(--moana)" strokeWidth="3" fill="none" />
          {[40, 75, 110, 150, 185].map((x, k) => (
            <circle key={x} cx={x} cy={[95, 82, 80, 88, 92][k]} r="9" fill="var(--ilima)" stroke={stroke} strokeWidth="2" />
          ))}
        </>
      )}
      {step === 1 && (
        <>
          <ellipse cx="110" cy="80" rx="80" ry="40" stroke={stroke} strokeWidth="3" fill="none" />
          <path d="M60 80h100M150 70l10 10-10 10M70 70l-10 10 10 10" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {step === 2 && (
        <>
          <rect x="30" y="30" width="160" height="100" rx="16" stroke={stroke} strokeWidth="3" fill="none" />
          <path d="M110 55c-12 0-20 9-20 20 0 15 20 35 20 35s20-20 20-35c0-11-8-20-20-20z" fill="var(--ilima)" stroke={stroke} strokeWidth="2" />
        </>
      )}
      {step === 3 && (
        <>
          <circle cx="110" cy="80" r="60" stroke="var(--line)" strokeWidth="3" fill="none" />
          <circle cx="110" cy="80" r="35" stroke="var(--ilima)" strokeWidth="3" fill="none" />
          <circle cx="110" cy="80" r="10" fill="var(--lehua)" />
          <text x="110" y="150" textAnchor="middle" fontSize="18" fontWeight="600" fill={stroke} style={{ fontFamily: 'var(--font-ui)' }}>5,000</text>
        </>
      )}
    </svg>
  );
}

const LEAHI = { mode: 'sky' as const, lat: 21.2592, lon: -157.8117, zoom: 16.5, pitch: 55, bearing: 300 };

/** Guided first round. No timer, nothing saved. */
export function TutorialRound() {
  const { go, setOnboarded } = useStore();
  return (
    <RoundPlayer
      view={LEAHI}
      title={t('round.tutorial')}
      deadline={null}
      timerSeconds={0}
      coach
      onGuess={async (pin: LatLon | null) => {
        const s = pin ? scoreGuess(pin, LEAHI) : { points: 0, distanceM: 0 };
        return { ...s, guess: pin, answer: { lat: LEAHI.lat, lon: LEAHI.lon, placeName: 'Lēʻahi', near: 'Waikīkī', island: 'oahu' } };
      }}
      nextLabel={t('coach.finish')}
      onNext={() => {}}
      onCoachDone={() => {
        void setOnboarded(true);
        go('home', true);
      }}
    />
  );
}
