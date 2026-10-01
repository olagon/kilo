import { useEffect, useState } from 'react';
import { DEFAULT_ROUND_SECONDS, ISLAND_BY_ID, ISLANDS, scoreGuess, type IslandId, type LatLon, type Spot } from '@huli/shared';
import { RoundPlayer } from '../components/RoundPlayer';
import { Seg, Spinner, Switch, TopBar } from '../components/ui';
import { formatPoints } from '../format';
import { t } from '../i18n/t';
import { loadPack } from '../practicePack';
import { useStore } from '../store';

type Diff = 0 | 1 | 2 | 3 | 4 | 5;

export function Practice() {
  const go = useStore((s) => s.go);
  const [spots, setSpots] = useState<Spot[] | null | undefined>(undefined);
  const [island, setIsland] = useState<IslandId | 'any'>('any');
  const [diff, setDiff] = useState<Diff>(0);
  const [timer, setTimer] = useState(false);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [session, setSession] = useState({ n: 0, pts: 0 });

  useEffect(() => {
    void loadPack().then((p) => setSpots(p?.spots.filter((s) => s.mode === 'sky') ?? null));
  }, []);

  function pick() {
    const pool = (spots ?? []).filter((s) => (island === 'any' || s.island === island) && (diff === 0 || s.difficulty === diff));
    const next = pool.length ? pool[Math.floor(Math.random() * pool.length)]! : null;
    setSpot(next);
  }

  if (spot) {
    const view = { mode: 'sky' as const, lat: spot.lat, lon: spot.lon, zoom: spot.zoom ?? 16.5, pitch: spot.pitch ?? 55, bearing: spot.bearing ?? 0 };
    return (
      <RoundPlayer
        key={spot.id}
        view={view}
        title={t('round.practice')}
        sub={t('practice.session', { n: session.n, pts: formatPoints(session.pts) })}
        deadline={timer ? Date.now() + DEFAULT_ROUND_SECONDS * 1000 : null}
        timerSeconds={DEFAULT_ROUND_SECONDS}
        hint={t('round.hint_island', { island: ISLAND_BY_ID[spot.island].name })}
        onGuess={async (pin: LatLon | null) => {
          const s = pin ? scoreGuess(pin, spot) : { points: 0, distanceM: 0 };
          setSession((x) => ({ n: x.n + 1, pts: x.pts + s.points }));
          return { ...s, guess: pin, answer: { lat: spot.lat, lon: spot.lon, placeName: spot.placeName, near: spot.near, island: spot.island, funFact: spot.funFact } };
        }}
        nextLabel={t('reveal.again')}
        onNext={pick}
      />
    );
  }

  return (
    <div className="screen">
      <div className="screen-pad">
        <TopBar title={t('practice.title')} />
        <p className="muted" style={{ marginBottom: 20 }}>{t('practice.body')}</p>
        {spots === undefined && <Spinner />}
        {spots === null && <p role="alert" className="error">{t('practice.missing')}</p>}
        {spots && (
          <>
            <p className="label" style={{ fontWeight: 500, marginBottom: 8 }}>{t('practice.island')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }} role="group" aria-label={t('practice.island')}>
              {[{ id: 'any' as const, name: t('practice.any') }, ...ISLANDS.filter((i) => i.inPool)].map((i) => (
                <button key={i.id} className="btn btn-sm" aria-pressed={island === i.id} style={island === i.id ? { background: 'var(--primary)', color: 'var(--on-primary)', borderColor: 'transparent' } : {}} onClick={() => setIsland(i.id)}>
                  {i.name}
                </button>
              ))}
            </div>
            <p style={{ fontWeight: 500, marginBottom: 8 }}>{t('practice.difficulty')}</p>
            <Seg value={String(diff)} label={t('practice.difficulty')} onChange={(v) => setDiff(Number(v) as Diff)} options={[{ value: '0', label: t('practice.any_difficulty') }, ...[1, 2, 3, 4, 5].map((d) => ({ value: String(d), label: String(d) }))]} />
            <div className="row" style={{ marginTop: 20 }}>
              <span className="grow label">{t('practice.timer')}</span>
              <Switch checked={timer} onChange={setTimer} label={t('practice.timer')} />
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={pick}>{t('practice.start')}</button>
            {session.n > 0 && <p className="muted num" style={{ textAlign: 'center', marginTop: 12 }}>{t('practice.session', { n: session.n, pts: formatPoints(session.pts) })}</p>}
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => go('home', true)}>{t('reveal.home')}</button>
          </>
        )}
      </div>
    </div>
  );
}
