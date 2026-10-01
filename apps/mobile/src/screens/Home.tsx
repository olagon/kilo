import { Wordmark } from '../components/Wordmark';
import { useEffect, useMemo } from 'react';
import { longDateLabel } from '@huli/shared';
import { SkyView } from '../map/SkyView';
import { NextSetCountdown, Spinner } from '../components/ui';
import { buildStats } from '../game/stats';
import { t } from '../i18n/t';
import { todayHawaii, useStore } from '../store';

/** Scenic camera presets for the backdrop, rotated by day. */
const SCENIC = [
  { lat: 21.2592, lon: -157.8117, bearing: 300 }, // Lēʻahi
  { lat: 21.269, lon: -157.6938, bearing: 160 }, // Hanauma Bay
  { lat: 20.7097, lon: -156.2533, bearing: 60 }, // Haleakalā
  { lat: 22.076, lon: -159.668, bearing: 20 }, // Waimea Canyon
  { lat: 19.4069, lon: -155.2834, bearing: 200 }, // Kīlauea
  { lat: 22.1535, lon: -159.645, bearing: 340 }, // Kalalau lookout
].map((s) => ({ mode: 'sky' as const, zoom: 15.5, pitch: 60, ...s }));

export function Home() {
  const { session, settings, history, daily, dailyError, online, go, refreshDaily } = useStore();
  const today = todayHawaii();
  const stats = useMemo(() => buildStats(history, today), [history, today]);
  const scenic = SCENIC[Number(today.replaceAll('-', '')) % SCENIC.length]!;

  useEffect(() => {
    if (online && (!daily || daily.date !== today)) void refreshDaily();
  }, [online, daily, today, refreshDaily]);

  const finished = daily?.finished ?? false;
  const started = !!daily && !finished && daily.rounds.some((r) => r.startedAt);
  const ready = !!daily && daily.date === today;

  return (
    <div className="screen" style={{ background: 'var(--kai-po)' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.9 }} aria-hidden>
        <SkyView view={scenic} interactive={false} autoSwivel dataSaver={settings.dataSaver} reducedMotion={settings.reduceMotion} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,26,36,0.55) 0%, rgba(10,26,36,0) 30%, rgba(10,26,36,0.2) 55%, rgba(10,26,36,0.92) 100%)', pointerEvents: 'none' }} />

      <div className="hud" style={{ top: 'calc(var(--safe-top) + 8px)', left: 20, right: 12, display: 'flex', alignItems: 'center', color: '#eef5f3' }}>
        <h1 style={{ flex: 1, margin: 0, lineHeight: 0 }}><Wordmark height={30} /></h1>
        <button className="icon-btn" aria-label={t('home.settings')} onClick={() => go('settings')} style={{ color: '#eef5f3' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </div>

      <div className="hud" style={{ left: 20, right: 20, bottom: 'calc(var(--safe-bottom) + 20px)', color: '#eef5f3', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <p style={{ fontSize: '1.375rem', fontWeight: 600 }}>{t('home.todays')}</p>
          <p style={{ opacity: 0.8 }}>{longDateLabel(today)}</p>
        </div>

        {!online && <p role="status" style={{ opacity: 0.9 }}>{t('home.offline')}</p>}
        {online && !ready && !dailyError && <Spinner label={t('home.loading')} />}
        {online && dailyError && !ready && (
          <button className="btn btn-ghost" style={{ color: '#eef5f3' }} onClick={() => void refreshDaily()}>{t('common.retry')}</button>
        )}
        {ready && (
          <button className="btn btn-accent btn-block" style={{ minHeight: 58, fontSize: '1.125rem' }} onClick={() => go(finished ? 'summary' : 'round')} aria-label={session?.name ? `${t(finished ? 'home.results' : started ? 'home.resume' : 'home.play')}, ${session.name}` : undefined}>
            {t(finished ? 'home.results' : started ? 'home.resume' : 'home.play')}
          </button>
        )}

        <p className="num" style={{ opacity: 0.9 }}>
          {stats.currentStreak === 0 ? t('home.streak_none') : stats.currentStreak === 1 ? t('home.streak_one') : t('home.streak', { n: stats.currentStreak })}
          {finished && (
            <>
              {' · '}
              <NextSetCountdown />
            </>
          )}
        </p>

        <nav style={{ display: 'flex', gap: 8 }} aria-label="Sections">
          {(['practice', 'board', 'stats'] as const).map((s) => (
            <button key={s} className="btn btn-sm" style={{ flex: 1, background: 'rgba(238,245,243,0.12)', color: '#eef5f3', borderColor: 'rgba(238,245,243,0.2)', backdropFilter: 'blur(8px)' }} onClick={() => go(s)}>
              {t(s === 'board' ? 'home.leaderboard' : `home.${s}`)}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
