import { useEffect, useRef, useState } from 'react';
import type { LatLon } from '@huli/shared';
import { GuessMap } from '../map/GuessMap';
import { t } from '../i18n/t';
import { searchPlaces } from '../practicePack';
import { useStore } from '../store';
import { haptic, sfx } from '../sound';

interface Props {
  open: boolean;
  pin: LatLon | null;
  onPin: (p: LatLon) => void;
  onLock: () => void;
  onClose: () => void;
  locking?: boolean;
  coach?: 'pin' | 'lock' | null;
}

/** Bottom sheet with the guess map. Half height by default, drag the handle up for full. */
export function GuessSheet({ open, pin, onPin, onLock, onClose, locking, coach }: Props) {
  const [full, setFull] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ name: string; point: LatLon }[]>([]);
  const settings = useStore((s) => s.settings);
  const drag = useRef<{ y: number; full: boolean } | null>(null);

  useEffect(() => {
    if (!open) {
      setFull(false);
      setQ('');
      setHits([]);
    }
  }, [open]);

  useEffect(() => {
    let live = true;
    void searchPlaces(q).then((r) => live && setHits(r));
    return () => {
      live = false;
    };
  }, [q]);

  if (!open) return null;
  const height = full ? 'calc(100% - var(--safe-top) - 8px)' : '56%';

  return (
    <section className="sheet" style={{ height }} aria-label={t('round.guess')}>
      <div
        className="sheet-grab"
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, full };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          const dy = e.clientY - drag.current.y;
          if (dy < -40) setFull(true);
          else if (dy > 40) (drag.current.full ? setFull(false) : onClose());
          drag.current = null;
        }}
        onClick={() => setFull((f) => !f)}
        role="button"
        aria-label={full ? t('round.close') : t('round.guess')}
      >
        <div className="sheet-handle" />
      </div>
      <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          style={{ minHeight: 44, flex: 1 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('round.search')}
          aria-label={t('round.search_hint')}
          autoComplete="off"
        />
        <button className="icon-btn" aria-label={t('round.close')} onClick={onClose}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      {hits.length > 0 && q && (
        <ul role="listbox" style={{ listStyle: 'none', margin: '0 16px 8px', padding: 0, maxHeight: 160, overflowY: 'auto' }}>
          {hits.map((h) => (
            <li key={h.name}>
              <button
                role="option"
                aria-selected={false}
                className="row"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => {
                  onPin(h.point);
                  setQ('');
                  void haptic.light();
                  sfx.pinDrop();
                }}
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ flex: 1, position: 'relative', margin: '0 0 0', overflow: 'hidden' }}>
        <GuessMap
          pin={pin}
          onPin={(p) => {
            onPin(p);
            sfx.pinDrop();
          }}
          hawaiianNames={settings.hawaiianNames}
          reducedMotion={settings.reduceMotion}
          className="fill"
        />
        {coach === 'pin' && <div className="hud pill-scrim fade-in" style={{ top: 12, left: 16, right: 16, textAlign: 'center' }}>{t('coach.pin')}</div>}
      </div>
      <div style={{ padding: '12px 16px calc(var(--safe-bottom) + 12px)', position: 'relative' }}>
        {coach === 'lock' && <div className="pill-scrim fade-in" style={{ position: 'absolute', top: -40, left: 16, right: 16, textAlign: 'center' }}>{t('coach.lock')}</div>}
        <button className="btn btn-accent btn-block" disabled={!pin || locking} onClick={onLock} aria-describedby="lock-hint">
          {locking ? t('round.sending') : t('round.lock')}
        </button>
        {!pin && <p id="lock-hint" className="muted" style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: 8 }}>{t('round.lock_hint')}</p>}
      </div>
    </section>
  );
}
