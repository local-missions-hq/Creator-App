import { createLocalMissionsApiClient } from '@local-missions/api-client';

export function createDashboardApiClient(
  baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000',
) {
  return createLocalMissionsApiClient({ baseUrl });
}
