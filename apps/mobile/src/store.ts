import { create } from 'zustand';
import { hawaiiDate, type DailyInfo, type DayRecord, type PlayerSession } from '@huli/shared';
import { api, setToken } from './api/client';
import { load, remove, save } from './storage';
import { configureFeedback } from './sound';

export type Screen =
  | 'welcome' | 'cards' | 'tutorial' | 'home' | 'round' | 'summary'
  | 'board' | 'stats' | 'settings' | 'about' | 'practice';

export interface Settings {
  reminders: boolean;
  reminderTime: string; // "07:00"
  onlyUnplayed: boolean;
  eveningReminder: boolean;
  units: 'mi' | 'km';
  hawaiianNames: boolean;
  sound: boolean;
  haptics: boolean;
  theme: 'system' | 'light' | 'dark';
  reduceMotion: boolean;
  dataSaver: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  reminders: false,
  reminderTime: '07:00',
  onlyUnplayed: true,
  eveningReminder: false,
  units: 'mi',
  hawaiianNames: true,
  sound: true,
  haptics: true,
  theme: 'system',
  reduceMotion: false,
  dataSaver: false,
};

interface State {
  booted: boolean;
  screen: Screen;
  stack: Screen[];
  session: PlayerSession | null;
  settings: Settings;
  history: DayRecord[];
  onboarded: boolean;
  online: boolean;
  daily: DailyInfo | null;
  dailyError: string | null;
  /** serverNow - Date.now() */
  clockOffset: number;

  boot: () => Promise<void>;
  go: (s: Screen, replace?: boolean) => void;
  back: () => boolean;
  setSession: (s: PlayerSession | null) => Promise<void>;
  setSettings: (p: Partial<Settings>) => Promise<void>;
  setOnboarded: (v: boolean) => Promise<void>;
  setOnline: (v: boolean) => void;
  refreshDaily: () => Promise<DailyInfo | null>;
  setDaily: (d: DailyInfo | null) => void;
  addDayRecord: (r: DayRecord) => Promise<void>;
  deleteEverything: () => Promise<void>;
}

const K = { session: 'session', settings: 'settings', history: 'history', onboarded: 'onboarded' };

export function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export const useStore = create<State>((set, get) => ({
  booted: false,
  screen: 'home',
  stack: [],
  session: null,
  settings: DEFAULT_SETTINGS,
  history: [],
  onboarded: false,
  online: true,
  daily: null,
  dailyError: null,
  clockOffset: 0,

  boot: async () => {
    const [session, settings, history, onboarded] = await Promise.all([
      load<PlayerSession | null>(K.session, null),
      load<Settings>(K.settings, DEFAULT_SETTINGS),
      load<DayRecord[]>(K.history, []),
      load<boolean>(K.onboarded, false),
    ]);
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    setToken(session?.token ?? null);
    applyTheme(merged.theme);
    configureFeedback({ sound: merged.sound, haptics: merged.haptics });
    set({ session, settings: merged, history, onboarded, booted: true, screen: session ? 'home' : 'welcome' });
  },

  go: (screen, replace = false) =>
    set((s) => ({ screen, stack: replace ? s.stack : [...s.stack, s.screen].slice(-10) })),

  back: () => {
    const { stack } = get();
    if (!stack.length) return false;
    set({ screen: stack[stack.length - 1]!, stack: stack.slice(0, -1) });
    return true;
  },

  setSession: async (session) => {
    setToken(session?.token ?? null);
    set({ session });
    if (session) await save(K.session, session);
    else await remove(K.session);
  },

  setSettings: async (p) => {
    const settings = { ...get().settings, ...p };
    set({ settings });
    applyTheme(settings.theme);
    configureFeedback({ sound: settings.sound, haptics: settings.haptics });
    await save(K.settings, settings);
  },

  setOnboarded: async (v) => {
    set({ onboarded: v });
    await save(K.onboarded, v);
  },

  setOnline: (online) => set({ online }),

  refreshDaily: async () => {
    try {
      const daily = await api.daily();
      set({ daily, dailyError: null, clockOffset: daily.serverNow - Date.now() });
      return daily;
    } catch (e) {
      set({ dailyError: (e as Error).message ?? 'error' });
      return null;
    }
  },

  setDaily: (daily) => set({ daily }),

  addDayRecord: async (r) => {
    const history = [...get().history.filter((h) => h.date !== r.date), r];
    set({ history });
    await save(K.history, history);
  },

  deleteEverything: async () => {
    try {
      await api.deletePlayer();
    } catch {
      /* server copy may already be gone */
    }
    setToken(null);
    await Promise.all([remove(K.session), remove(K.history), remove(K.onboarded)]);
    set({ session: null, history: [], onboarded: false, daily: null, screen: 'welcome', stack: [] });
  },
}));

export const todayHawaii = () => hawaiiDate(Date.now() + useStore.getState().clockOffset);
