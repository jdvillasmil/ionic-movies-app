import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cineapp.app',
  appName: 'ionic-movies-app',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
