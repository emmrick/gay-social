import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c10c4842aa1548c6808049e5d19de924',
  appName: 'gay-connect',
  webDir: 'dist',
  server: {
    url: 'https://c10c4842-aa15-48c6-8080-49e5d19de924.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0f',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f'
    }
  }
};

export default config;
