import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.protlys.hub',
  appName: 'Protlys Hub',
  webDir: 'public',
  server: {
    url: 'https://hub.protlys.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
