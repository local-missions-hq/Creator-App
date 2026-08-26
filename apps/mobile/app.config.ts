import type { ExpoConfig } from 'expo/config';

const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'local';

const config: ExpoConfig = {
  name: 'Local Missions',
  slug: 'local-missions',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'localmissions',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.stratios.localmissions.dev',
    supportsTablet: false,
  },
  web: {
    bundler: 'metro',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnvironment,
  },
};

export default config;
