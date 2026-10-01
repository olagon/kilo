import { useEffect, useState } from 'react';
import { Share } from '@capacitor/share';
import { hawaiiMonth, ISLAND_BY_ID, shareText, shortDateLabel, tierForPoints, type DayBoard, type MonthBoard } from '@huli/shared';
import { api } from '../api/client';
import { NextSetCountdown, TopBar } from '../components/ui';
import { formatDistance, formatPoints } from '../format';
import { t } from '../i18n/t';
import { todayHawaii, useStore } from '../store';

const REPO = 'https://github.com/olagon/huli-geo';

export function Summary() {
  const { history, settings, go } = useStore();
  const today = todayHawaii();
  const rec = history.find((h) => h.date === today);
  const [day, setDay] = useState<DayBoard | null>(null);
  const [month, setMonth] = useState<MonthBoard | null>(null);

  useEffect(() => {
    void api.dayBoard(today).then(setDay).catch(() => {});
    void api.monthBoard(hawaiiMonth(today)).then(setMonth).catch(() => {});
  }, [today]);

  if (!rec)
    return (
      <div className="screen"><div className="screen-pad"><TopBar title={t('summary.title')} /><p className="muted">{t('stats.empty')}</p></div></div>
    );

  const rank = (b: { me: { rank: number } | null; players: number } | null) => (b?.me ? t('summary.rank', { rank: b.me.rank, n: b.players }) : t('summary.rank_none'));

  async function share() {
    const text = shareText({ dateLabel: shortDateLabel(today), total: rec!.total, rounds: rec!.rounds.map((r) => r.points), link: REPO });
    try {
      await Share.share({ text });
    } catch {
      try { await navigator.clipboard.writeText(text); } catch { /* no clipboard */ }
    }
  }

  return (
    <div className="screen">
      <div className="screen-pad">
        <TopBar title={t('summary.title')} />
        <p className="muted">{shortDateLabel(today)}</p>
        <p className="display num" style={{ fontSize: '4rem', lineHeight: 1, margin: '6px 0 2px', color: rec.total >= 25000 ? 'var(--accent)' : 'var(--fg)' }}>{formatPoints(rec.total)}</p>
        <p className="muted" style={{ marginBottom: 20 }}>{rec.total >= 25000 ? t('summary.perfect_day') : t('summary.of')}</p>

        <div className="card" style={{ padding: '4px 16px', marginBottom: 16 }}>
          {rec.rounds.map((r, i) => (
            <div className="row" key={i}>
              <span className={`tier tier-${tierForPoints(r.points)}`} aria-hidden />
              <span className="grow label">{t('summary.round', { n: i + 1 })} · <span className="muted">{ISLAND_BY_ID[r.island]?.name}</span></span>
              <span className="muted num">{formatDistance(r.distanceM, settings.units)}</span>
              <span className="num" style={{ fontWeight: 600, minWidth: 56, textAlign: 'right' }}>{formatPoints(r.points)}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[[t('summary.rank_today'), rank(day)], [t('summary.rank_month'), rank(month)]].map(([k, v]) => (
            <div className="card" key={k} style={{ flex: 1 }}>
              <p className="muted" style={{ fontSize: '0.875rem' }}>{k}</p>
              <p className="num" style={{ fontSize: '1.375rem', fontWeight: 600 }}>{v}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary btn-block" onClick={() => void share()}>{t('summary.share')}</button>
          <button className="btn btn-block" onClick={() => go('board')}>{t('summary.leaderboard')}</button>
          <button className="btn btn-ghost btn-block" onClick={() => go('home', true)}>{t('summary.home')}</button>
          <p style={{ textAlign: 'center', marginTop: 8 }}><NextSetCountdown /></p>
        </div>
      </div>
    </div>
  );
}
