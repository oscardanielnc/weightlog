import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pe.oscar.mipeso',
  appName: 'Mi Peso',
  webDir: 'dist',
  android: {
    // La app vive entera dentro del APK: sin red, sin servidor.
    allowMixedContent: false,
  },
};

export default config;
