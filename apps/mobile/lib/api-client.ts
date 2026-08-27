import { createLocalMissionsApiClient } from '@local-missions/api-client';

export function createMobileApiClient(
  baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:4000',
) {
  return createLocalMissionsApiClient({ baseUrl });
}
