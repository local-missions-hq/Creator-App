import type { LocalMissionsApiClient, operations } from '@local-missions/api-client';

import { createMobileApiClient } from './api-client';

export type AccountOverview =
  operations['DomainController_getAccountOverview']['responses'][200]['content']['application/json'];

export type MobileAccountDataResult = {
  data: AccountOverview;
  source: 'api' | 'local-preview';
};

export const localAccountOverview: AccountOverview = {
  identities: [
    {
      provider: 'apple',
      status: 'active',
      verifiedAt: '2026-08-27T12:00:00.000Z',
    },
    {
      provider: 'google',
      status: 'active',
      verifiedAt: '2026-08-27T12:05:00.000Z',
    },
  ],
  requests: [],
  role: 'creator',
  sensitiveHoldActive: false,
  sessions: [
    {
      authenticatedAt: '2026-08-28T00:45:00.000Z',
      expiresAt: '2026-09-27T00:45:00.000Z',
      provider: 'apple',
      publicId: 'ses_synthetic_creator_001',
      status: 'active',
    },
  ],
  status: 'active',
  userPublicId: 'usr_synthetic_creator_001',
};

export type MobileAccountDataAdapterOptions = {
  accessToken?: string;
  client?: LocalMissionsApiClient;
  mode?: 'api' | 'local-preview';
};

export function createMobileAccountDataAdapter(options: MobileAccountDataAdapterOptions = {}) {
  const mode =
    options.mode ?? (process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'local-preview');
  const client = options.client ?? createMobileApiClient();

  return {
    async getAccountOverview(): Promise<MobileAccountDataResult> {
      if (mode === 'local-preview') return { data: localAccountOverview, source: mode };
      if (!options.accessToken) {
        throw new Error('API data mode requires an authenticated session token.');
      }
      const response = await client.GET('/v1/account', {
        headers: { Authorization: `Bearer ${options.accessToken}` },
      });
      if (!response.data) throw new Error('Account details could not be loaded.');
      return { data: response.data, source: 'api' };
    },
  };
}
