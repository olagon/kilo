import { formatTimer } from '../format';
import { t } from '../i18n/t';

/** Ring that drains over the round. ʻIlima at 30 s, lehua at 10 s. */
export function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 1;
  const color = seconds <= 10 ? 'var(--lehua)' : seconds <= 30 ? 'var(--ilima)' : '#eef5f3';
  return (
    <div className="pill-scrim num" role="timer" aria-label={`${t('round.timer')} ${formatTimer(seconds)}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 4px' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={r} stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
        <circle cx="24" cy="24" r={r} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 24 24)" style={{ transition: 'stroke-dashoffset 250ms linear, stroke 300ms' }} />
      </svg>
      <span style={{ color, fontWeight: 600, minWidth: 40 }}>{formatTimer(seconds)}</span>
    </div>
  );
}
