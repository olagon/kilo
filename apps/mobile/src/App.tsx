import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { buildStats } from './game/stats';
import { reschedule } from './notifications';
import { todayHawaii, useStore } from './store';
import { About } from './screens/About';
import { Home } from './screens/Home';
import { Leaderboard } from './screens/Leaderboard';
import { Practice } from './screens/Practice';
import { Round } from './screens/Round';
import { Settings } from './screens/Settings';
import { Stats } from './screens/Stats';
import { Summary } from './screens/Summary';
import { TutorialCards, TutorialRound } from './screens/Tutorial';
import { Welcome } from './screens/Welcome';

const SCREENS = {
  welcome: Welcome, cards: TutorialCards, tutorial: TutorialRound, home: Home, round: Round, summary: Summary,
  board: Leaderboard, stats: Stats, settings: Settings, about: About, practice: Practice,
};

export function App() {
  const { booted, screen, settings, boot, back, go, setOnline } = useStore();

  useEffect(() => {
    void boot().then(() => SplashScreen.hide().catch(() => {}));
    const subs = [
      CapApp.addListener('backButton', () => {
        const s = useStore.getState();
        if (s.screen === 'home' || s.screen === 'welcome' || !s.back()) void CapApp.exitApp();
      }),
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return;
        const s = useStore.getState();
        void s.refreshDaily();
        void reschedule(s.settings, { playedToday: s.daily?.finished ?? false, streak: buildStats(s.history, todayHawaii()).currentStreak });
      }),
      Network.addListener('networkStatusChange', (st) => setOnline(st.connected)),
      LocalNotifications.addListener('localNotificationActionPerformed', () => {
        const s = useStore.getState();
        if (s.session) go(s.daily?.finished ? 'home' : 'round', true);
      }),
    ];
    void Network.getStatus().then((st) => setOnline(st.connected)).catch(() => {});
    return () => void Promise.all(subs).then((hs) => hs.forEach((h) => h.remove()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!booted) return;
    const s = useStore.getState();
    void reschedule(s.settings, { playedToday: s.daily?.finished ?? false, streak: buildStats(s.history, todayHawaii()).currentStreak });
  }, [booted]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion);
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    const imagery = screen === 'home' || screen === 'round' || screen === 'practice' || screen === 'tutorial';
    StatusBar.setStyle({ style: dark || imagery ? Style.Dark : Style.Light }).catch(() => {});
  }, [settings.theme, screen]);

  if (!booted) return null;
  const Screen = SCREENS[screen];
  return <Screen />;
}
