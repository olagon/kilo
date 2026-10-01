import { LocalNotifications } from '@capacitor/local-notifications';
import { hawaiiDate } from '@huli/shared';
import { t } from '../i18n/t';
import type { Settings } from '../store';

const MORNING = 1000;
const EVENING = 2000;
const DAYS = 7;

/** Ask only when the player turns reminders on. Returns true if granted. */
export async function requestPermission(): Promise<boolean> {
  try {
    let s = await LocalNotifications.checkPermissions();
    if (s.display !== 'granted') s = await LocalNotifications.requestPermissions();
    return s.display === 'granted';
  } catch {
    return false;
  }
}

async function cancelAll() {
  try {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications.length) await LocalNotifications.cancel({ notifications });
  } catch {
    /* ignore */
  }
}

/**
 * Reschedule the next 7 days. Call on app start, on settings change, after finishing the daily.
 * Today's morning reminder is skipped when the day is already played.
 */
export async function reschedule(settings: Settings, opts: { playedToday: boolean; streak: number }) {
  await cancelAll();
  if (!settings.reminders && !settings.eveningReminder) return;
  const [hh, mm] = settings.reminderTime.split(':').map(Number) as [number, number];
  const now = new Date();
  const todayHst = hawaiiDate();
  const list = [];
  for (let d = 0; d < DAYS; d++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hh, mm, 0, 0);
    const isToday = hawaiiDate(at.getTime()) === todayHst;
    if (at.getTime() > now.getTime() && settings.reminders && !(isToday && opts.playedToday)) {
      const body = isToday && settings.onlyUnplayed ? t('notif.unplayed') : t(d % 2 ? 'notif.morning2' : 'notif.morning1');
      list.push({ id: MORNING + d, title: t('app.name'), body, schedule: { at, allowWhileIdle: false }, extra: { route: 'round' } });
    }
    if (settings.eveningReminder && opts.streak > 0 && !(isToday && opts.playedToday)) {
      const eve = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, 19, 0, 0, 0);
      if (eve.getTime() > now.getTime())
        list.push({ id: EVENING + d, title: t('app.name'), body: t('notif.streak', { n: opts.streak }), schedule: { at: eve, allowWhileIdle: false }, extra: { route: 'round' } });
    }
  }
  if (!list.length) return;
  try {
    await LocalNotifications.schedule({ notifications: list });
  } catch {
    /* permission revoked in system settings */
  }
}
