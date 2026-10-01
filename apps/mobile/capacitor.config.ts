import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.olinlagon.kilo',
  appName: 'Kilo',
  webDir: 'dist',
  android: { allowMixedContent: false, backgroundColor: '#0A1A24' },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#0A1A24', launchAutoHide: true },
    StatusBar: { overlaysWebView: true, style: 'DARK' },
    LocalNotifications: { smallIcon: 'ic_stat_kilo', iconColor: '#F2A900' },
  },
};

export default config;
