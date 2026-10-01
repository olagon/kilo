import { useMemo } from 'react';
import { ISLAND_BY_ID } from '@huli/shared';
import { TopBar } from '../components/ui';
import { formatDistance, formatPoints } from '../format';
import { buildStats } from '../game/stats';
import { t } from '../i18n/t';
import { todayHawaii, useStore } from '../store';

export function Stats() {
  const { history, settings } = useStore();
  const s = useMemo(() => buildStats(history, todayHawaii()), [history]);
  const tiles: [string, string][] = [
    [t('stats.days'), String(s.daysPlayed)],
    [t('stats.streak'), String(s.currentStreak)],
    [t('stats.best_streak'), String(s.bestStreak)],
    [t('stats.best_day'), formatPoints(s.bestDay)],
    [t('stats.average'), formatPoints(s.averageDay)],
    [t('stats.perfect'), String(s.perfectRounds)],
  ];
  const maxM = Math.max(1, ...s.islands.map((i) => i.avgM));
  return (
    <div className="screen">
      <div className="screen-pad">
        <TopBar title={t('stats.title')} />
        {s.daysPlayed === 0 && <p className="muted">{t('stats.empty')}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {tiles.map(([k, v]) => (
            <div className="card" key={k}>
              <p className="muted" style={{ fontSize: '0.875rem' }}>{k}</p>
              <p className="display num" style={{ fontSize: '2rem', lineHeight: 1.1 }}>{v}</p>
            </div>
          ))}
        </div>
        {s.islands.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{t('stats.islands')}</h2>
            <p className="muted" style={{ marginBottom: 12 }}>{t('stats.islands_hint')}</p>
            <div className="card" style={{ padding: '4px 16px' }}>
              {s.islands.map((i) => (
                <div className="row" key={i.island} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">{ISLAND_BY_ID[i.island]?.name}</span>
                    <span className="num muted">{formatDistance(i.avgM, settings.units)} · {i.rounds}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--line)' }} aria-hidden>
                    <div style={{ height: 6, borderRadius: 3, width: `${Math.max(4, 100 - (i.avgM / maxM) * 90)}%`, background: 'var(--kalo)' }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
