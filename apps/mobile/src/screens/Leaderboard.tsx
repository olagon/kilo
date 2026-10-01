import { useEffect, useState } from 'react';
import { hawaiiMonth, type BoardRow, type DayBoard, type MonthBoard } from '@huli/shared';
import { api } from '../api/client';
import { Confirm, Seg, Spinner, TopBar } from '../components/ui';
import { formatPoints } from '../format';
import { t } from '../i18n/t';
import { todayHawaii, useStore } from '../store';

export function Leaderboard() {
  const session = useStore((s) => s.session);
  const [tab, setTab] = useState<'day' | 'month'>('day');
  const [day, setDay] = useState<DayBoard | null>(null);
  const [month, setMonth] = useState<MonthBoard | null>(null);
  const [error, setError] = useState(false);
  const [report, setReport] = useState<BoardRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const today = todayHawaii();

  useEffect(() => {
    setError(false);
    const p = tab === 'day' ? api.dayBoard(today).then(setDay) : api.monthBoard(hawaiiMonth(today)).then(setMonth);
    void p.catch(() => setError(true));
  }, [tab, today]);

  const board = tab === 'day' ? day : month;
  const rows = board?.rows ?? [];
  const me = board?.me ?? null;
  const meInRows = me && rows.some((r) => r.playerId === me.playerId);

  function Row({ r, big }: { r: BoardRow; big?: boolean }) {
    const mine = r.playerId === session?.playerId;
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (
      <div
        className="row"
        style={{ background: mine ? 'color-mix(in srgb, var(--ilima) 14%, transparent)' : undefined, borderRadius: 10, padding: '0 8px', minHeight: big ? 64 : 48 }}
        onPointerDown={() => { if (!mine) timer = setTimeout(() => setReport(r), 600); }}
        onPointerUp={() => clearTimeout(timer)}
        onPointerLeave={() => clearTimeout(timer)}
        onContextMenu={(e) => { e.preventDefault(); if (!mine) setReport(r); }}
        aria-label={`${r.rank}. ${r.name}, ${formatPoints(r.total)}`}
      >
        <span className="num muted" style={{ width: 36, fontSize: big ? '1.25rem' : undefined }}>{r.rank}</span>
        <span className="grow label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: big ? '1.125rem' : undefined }}>
          {r.name}{mine && <span className="muted"> · {t('board.you')}</span>}
        </span>
        <span className={`num ${big ? 'display' : ''}`} style={{ fontWeight: 600, fontSize: big ? '1.5rem' : undefined }}>{formatPoints(r.total)}</span>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-pad">
        <TopBar title={t('board.title')} />
        <Seg value={tab} label={t('board.title')} onChange={setTab} options={[{ value: 'day', label: t('board.today') }, { value: 'month', label: t('board.month') }]} />
        <p className="muted" style={{ margin: '12px 0' }}>
          {tab === 'month' && month ? (month.mode === 'best_day' ? t('board.mode_best_day') : t('board.mode_best5')) + ' · ' : ''}
          {board ? t('board.players', { n: board.players }) : ''}
        </p>
        {!board && !error && <Spinner label={t('board.loading')} />}
        {error && <p className="error" role="alert">{t('board.error')}</p>}
        {board && rows.length === 0 && <p className="muted">{t('board.empty')}</p>}
        <div className="card" style={{ padding: '4px 8px' }}>
          {rows.map((r) => <Row key={r.playerId} r={r} big={tab === 'month'} />)}
          {me && !meInRows && (
            <>
              <div style={{ borderTop: '1px dashed var(--line)', margin: '4px 0' }} />
              <Row r={me} />
            </>
          )}
        </div>
      </div>
      {report && (
        <Confirm
          title={t('board.report')}
          body={t('board.report_body')}
          yes={t('board.report_yes')}
          onNo={() => setReport(null)}
          onYes={() => {
            void api.report(report.playerId).catch(() => {});
            setReport(null);
            setToast(t('board.reported'));
            setTimeout(() => setToast(null), 2500);
          }}
        />
      )}
      {toast && <div className="pill-scrim fade-in" role="status" style={{ position: 'fixed', left: 20, right: 20, bottom: 'calc(var(--safe-bottom) + 20px)', textAlign: 'center', zIndex: 50 }}>{toast}</div>}
    </div>
  );
}
