import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tlis.app',
  appName: 'TLIS Luxury Intelligence',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;

