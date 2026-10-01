import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLon, SkyView as SkyViewData } from '@huli/shared';
import { api } from '../api/client';
import { RoundPlayer, type RoundResult } from '../components/RoundPlayer';
import { Spinner } from '../components/ui';
import { loadPartial, savePartial, toDayRecord, type PartialDay } from '../game/dayRecord';
import { buildStats } from '../game/stats';
import { nextRoundIndex, secondsLeft, sumPoints } from '../game/time';
import { t } from '../i18n/t';
import { reschedule } from '../notifications';
import { formatPoints } from '../format';
import { todayHawaii, useStore } from '../store';
import { sfx } from '../sound';

interface Live { index: number; view: SkyViewData; deadline: number | null }

/** The daily: starts or resumes the open round, scores on the server, moves on. */
export function Round() {
  const { daily, setDaily, refreshDaily, clockOffset, go, addDayRecord, settings } = useStore();
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState(false);
  const partial = useRef<PartialDay | null>(null);
  const today = todayHawaii();

  const startNext = useCallback(async () => {
    setError(false);
    try {
      const cur = useStore.getState().daily;
      let d = cur && cur.date === today ? cur : await refreshDaily();
      if (!d) throw new Error('no daily');
      if (d.finished) return go('summary', true);
      const index = nextRoundIndex(d.rounds) ?? 1;
      const r = await api.startRound(index);
      if (r.view.mode !== 'sky') throw new Error('ground rounds are not supported yet');
      const left = secondsLeft(r.startedAt, d.timerSeconds, r.serverNow);
      if (left <= 0) {
        // the round expired while the app was closed; the server scores it 0
        const res = await api.guess(index, { timeout: true });
        d = { ...d, rounds: d.rounds.map((x) => (x.index === index ? { ...x, startedAt: r.startedAt, points: res.points, distanceM: res.distanceM } : x)), finished: res.finished, total: res.dayTotal };
        setDaily(d);
        if (res.finished) return finishDay(d.total ?? sumPoints(d.rounds));
        return startNext();
      }
      setDaily({ ...d, rounds: d.rounds.map((x) => (x.index === index ? { ...x, startedAt: r.startedAt } : x)) });
      setLive({ index, view: r.view, deadline: d.timerSeconds > 0 ? Date.now() + left * 1000 : null });
    } catch {
      setError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, clockOffset]);

  useEffect(() => {
    void loadPartial(today).then((p) => (partial.current = p));
    void startNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishDay(total: number) {
    const p = partial.current ?? { date: today, rounds: {} };
    await addDayRecord(toDayRecord(p, total));
    sfx.dayComplete();
    const stats = buildStats(useStore.getState().history, today);
    void reschedule(settings, { playedToday: true, streak: stats.currentStreak });
    go('summary', true);
  }

  async function onGuess(pin: LatLon | null): Promise<RoundResult> {
    if (!live) throw new Error('no round');
    const res = await api.guess(live.index, pin ? { lat: pin.lat, lon: pin.lon } : { timeout: true });
    const p = partial.current ?? { date: today, rounds: {} };
    p.rounds[live.index] = { points: res.points, distanceM: res.distanceM, island: res.answer.island };
    partial.current = p;
    void savePartial(p);
    const d = useStore.getState().daily;
    if (d)
      setDaily({ ...d, finished: res.finished, total: res.dayTotal, rounds: d.rounds.map((x) => (x.index === live.index ? { ...x, points: res.points, distanceM: res.distanceM } : x)) });
    return { points: res.points, distanceM: res.distanceM, answer: res.answer, guess: res.guess ?? pin };
  }

  if (error)
    return (
      <div className="screen">
        <div className="screen-pad" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p role="alert">{t('round.error')}</p>
          <button className="btn btn-primary" onClick={() => void startNext()}>{t('round.retry')}</button>
          <button className="btn btn-ghost" onClick={() => go('home', true)}>{t('reveal.home')}</button>
        </div>
      </div>
    );
  if (!live || !daily) return <div className="screen"><Spinner /></div>;

  const soFar = sumPoints(daily.rounds.filter((r) => r.index < live.index));
  const isLast = live.index === 5;
  const seconds = daily.timerSeconds;

  return (
    <RoundPlayer
      key={live.index}
      view={live.view}
      title={t('round.title', { n: live.index })}
      sub={t('round.so_far', { pts: formatPoints(soFar) })}
      deadline={live.deadline}
      timerSeconds={seconds}
      onGuess={onGuess}
      nextLabel={isLast ? t('reveal.results') : t('reveal.next')}
      onNext={() => {
        const d = useStore.getState().daily;
        if (isLast || d?.finished) void finishDay(d?.total ?? 0);
        else void startNext();
      }}
    />
  );
}
