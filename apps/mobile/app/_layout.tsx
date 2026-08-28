import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { MobileAuthSessionProvider } from '../lib/auth-session-context';

export default function RootLayout() {
  return (
    <MobileAuthSessionProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </MobileAuthSessionProvider>
  );
}
