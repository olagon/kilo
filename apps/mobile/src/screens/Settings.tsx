import { useState } from 'react';
import { validateName } from '@huli/shared';
import { api, ApiError } from '../api/client';
import { API_BASE } from '../api/base';
import { Confirm, Seg, Switch, TopBar } from '../components/ui';
import { buildStats } from '../game/stats';
import { t } from '../i18n/t';
import { tileStats } from '../map/imagery';
import { requestPermission, reschedule } from '../notifications';
import { todayHawaii, useStore, type Settings as S } from '../store';

const VERSION = '1.0.0';
const REPO = 'https://github.com/olagon/kilo';

function Row({ label, sub, children }: { label: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="row">
      <div className="grow">
        <div className="label">{label}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Settings() {
  const { settings, setSettings, session, setSession, history, daily, go, deleteEverything } = useStore();
  const [name, setName] = useState(session?.name ?? '');
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [notifDenied, setNotifDenied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [taps, setTaps] = useState(0);
  const debug = taps >= 7;

  const set = (p: Partial<S>) => {
    void setSettings(p).then(() => {
      const s = { ...settings, ...p };
      const stats = buildStats(history, todayHawaii());
      void reschedule(s, { playedToday: daily?.finished ?? false, streak: stats.currentStreak });
    });
  };

  async function toggleReminders(on: boolean) {
    if (on && !(await requestPermission())) return setNotifDenied(true);
    setNotifDenied(false);
    set({ reminders: on });
  }

  async function saveName() {
    const v = validateName(name);
    if (!v.ok) return setNameMsg(t(`name.${v.error}`));
    try {
      const r = await api.renamePlayer(v.name);
      await setSession({ ...session!, name: r.name });
      setNameMsg(t('common.ok'));
    } catch (e) {
      setNameMsg(e instanceof ApiError ? t(`name.${e.code.replace('name_', '')}`) : t('common.error'));
    }
  }

  return (
    <div className="screen">
      <div className="screen-pad">
        <TopBar title={t('settings.title')} />

        <Row label={t('settings.name')} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input className="input" value={name} onChange={(e) => { setName(e.target.value); setNameMsg(null); }} aria-label={t('settings.name')} maxLength={24} />
          <button className="btn btn-primary" disabled={name === session?.name} onClick={() => void saveName()}>{t('settings.name_save')}</button>
        </div>
        {nameMsg && <p className={nameMsg === t('common.ok') ? 'muted' : 'error'} role="status" style={{ marginBottom: 8 }}>{nameMsg}</p>}

        <Row label={t('settings.reminders')}><Switch checked={settings.reminders} onChange={(v) => void toggleReminders(v)} label={t('settings.reminders')} /></Row>
        {notifDenied && <p className="error" role="alert" style={{ padding: '6px 0' }}>{t('settings.notif_denied')}</p>}
        {settings.reminders && (
          <>
            <Row label={t('settings.reminder_time')}>
              <input type="time" className="input" style={{ width: 'auto', minHeight: 44 }} value={settings.reminderTime} onChange={(e) => set({ reminderTime: e.target.value || '07:00' })} aria-label={t('settings.reminder_time')} />
            </Row>
            <Row label={t('settings.only_unplayed')}><Switch checked={settings.onlyUnplayed} onChange={(v) => set({ onlyUnplayed: v })} label={t('settings.only_unplayed')} /></Row>
          </>
        )}
        <Row label={t('settings.evening')}><Switch checked={settings.eveningReminder} onChange={(v) => void (v && !settings.reminders ? toggleReminders(true).then(() => set({ eveningReminder: true })) : set({ eveningReminder: v }))} label={t('settings.evening')} /></Row>

        <Row label={t('settings.units')}>
          <Seg value={settings.units} label={t('settings.units')} onChange={(units) => set({ units })} options={[{ value: 'mi', label: t('settings.units_mi') }, { value: 'km', label: t('settings.units_km') }]} />
        </Row>
        <Row label={t('settings.hawaiian_names')}><Switch checked={settings.hawaiianNames} onChange={(v) => set({ hawaiianNames: v })} label={t('settings.hawaiian_names')} /></Row>
        <Row label={t('settings.sound')}><Switch checked={settings.sound} onChange={(v) => set({ sound: v })} label={t('settings.sound')} /></Row>
        <Row label={t('settings.haptics')}><Switch checked={settings.haptics} onChange={(v) => set({ haptics: v })} label={t('settings.haptics')} /></Row>
        <Row label={t('settings.theme')}>
          <Seg value={settings.theme} label={t('settings.theme')} onChange={(theme) => set({ theme })} options={[{ value: 'system', label: t('settings.theme_system') }, { value: 'light', label: t('settings.theme_light') }, { value: 'dark', label: t('settings.theme_dark') }]} />
        </Row>
        <Row label={t('settings.reduce_motion')}><Switch checked={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} label={t('settings.reduce_motion')} /></Row>
        <Row label={t('settings.data_saver')} sub={t('settings.data_saver_hint')}><Switch checked={settings.dataSaver} onChange={(v) => set({ dataSaver: v })} label={t('settings.data_saver')} /></Row>

        <button className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('tutorial')}><span className="grow label">{t('settings.replay')}</span><Chevron /></button>

        <Row label={t('settings.privacy')} sub={t('settings.privacy_body')} />
        <button className="row" style={{ width: '100%', textAlign: 'left', color: 'var(--bad)' }} onClick={() => setConfirmDelete(true)}><span className="grow label">{t('settings.delete')}</span></button>

        <button className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('about')}><span className="grow label">{t('settings.about')}</span><Chevron /></button>
        <a className="row" href={REPO} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}><span className="grow label">{t('settings.source')}</span><Chevron /></a>
        <a className="row" href="market://details?id=com.olinlagon.kilo" style={{ textDecoration: 'none', color: 'inherit' }}><span className="grow label">{t('settings.rate')}</span><Chevron /></a>
        <button className="row muted" style={{ width: '100%', textAlign: 'left' }} onClick={() => setTaps((n) => n + 1)} aria-label={t('settings.version', { v: VERSION })}>
          <span className="grow sub">{t('settings.version', { v: VERSION })}</span>
        </button>

        {debug && (
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t('settings.debug')}</p>
            <p className="sub num">{t('settings.debug_tiles')}: {tileStats.roundRequested} / {tileStats.requested} / {tileStats.failed}</p>
            <p className="sub">{t('settings.debug_provider')}: {tileStats.provider}</p>
            <p className="sub" style={{ wordBreak: 'break-all' }}>{t('settings.debug_api')}: {API_BASE}</p>
            <p className="sub">{t('settings.debug_glyphs')}: <span style={{ fontFamily: 'var(--font-ui)' }}>ʻ ā ē ī ō ū Ā Ē Ī Ō Ū</span> · <span className="display">ʻ ā ē ī ō ū Ā Ē Ī Ō Ū</span></p>
            <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => { localStorage.clear(); void caches?.keys?.().then((ks) => ks.forEach((k) => void caches.delete(k))); }}>{t('settings.debug_clear')}</button>
          </div>
        )}
      </div>
      {confirmDelete && (
        <Confirm title={t('settings.delete')} body={t('settings.delete_confirm')} yes={t('settings.delete_yes')} danger onNo={() => setConfirmDelete(false)} onYes={() => { setConfirmDelete(false); void deleteEverything(); }} />
      )}
    </div>
  );
}

function Chevron() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>;
}
