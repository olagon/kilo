import { useEffect, useState } from 'react';
import { animate } from 'motion';
import { nextHawaiiMidnightMs } from '@huli/shared';
import { formatCountdown } from '../format';
import { t } from '../i18n/t';
import { useStore } from '../store';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function BackButton({ onClick }: { onClick?: () => void }) {
  const back = useStore((s) => s.back);
  return (
    <button className="icon-btn" aria-label={t('common.back')} onClick={onClick ?? (() => back())}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="topbar">
      <BackButton />
      <h1>{title}</h1>
      {right}
    </div>
  );
}

/** "Next set in 4h 12m", ticking every second. */
export function NextSetCountdown() {
  const offset = useStore((s) => s.clockOffset);
  const [ms, setMs] = useState(() => nextHawaiiMidnightMs(Date.now() + offset) - (Date.now() + offset));
  useEffect(() => {
    const id = setInterval(() => setMs(nextHawaiiMidnightMs(Date.now() + offset) - (Date.now() + offset)), 1000);
    return () => clearInterval(id);
  }, [offset]);
  return <span className="num muted">{t('home.next_in', { t: formatCountdown(ms) })}</span>;
}

/** Counts from 0 to `to`. Instant when reduced motion. */
export function CountUp({ to, duration = 0.9, delay = 0, format, onDone }: { to: number; duration?: number; delay?: number; format: (n: number) => string; onDone?: () => void }) {
  const reduce = useStore((s) => s.settings.reduceMotion);
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) {
      setV(to);
      onDone?.();
      return;
    }
    const c = animate(0, to, { duration, delay, ease: [0.2, 0.8, 0.2, 1], onUpdate: (n) => setV(n), onComplete: () => onDone?.() });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  return <span className="num">{format(Math.round(v))}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="muted" style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" style={{ animation: 'spin 0.9s linear infinite' }} aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="40 20" strokeLinecap="round" />
      </svg>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      {label ?? t('common.loading')}
    </div>
  );
}

/** Modal confirm. Native-feeling, no library. */
export function Confirm({ title, body, yes, danger, onYes, onNo }: { title: string; body?: string; yes: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', padding: 16, paddingBottom: 'calc(var(--safe-bottom) + 16px)' }} onClick={onNo}>
      <div className="card fade-in" style={{ width: '100%', borderRadius: 24, padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 6 }}>{title}</h2>
        {body && <p className="muted" style={{ marginBottom: 16 }}>{body}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onNo}>{t('board.cancel')}</button>
          <button className="btn" style={{ flex: 1, background: danger ? 'var(--lehua)' : 'var(--primary)', color: '#fff', borderColor: 'transparent' }} onClick={onYes}>{yes}</button>
        </div>
      </div>
    </div>
  );
}
