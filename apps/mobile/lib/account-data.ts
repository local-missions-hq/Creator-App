import type { LocalMissionsApiClient, operations } from '@local-missions/api-client';

import { createMobileApiClient } from './api-client';

export type AccountOverview =
  operations['DomainController_getAccountOverview']['responses'][200]['content']['application/json'];
export type AccountIdentityMutationResponse =
  operations['DomainController_linkAccountIdentity']['responses'][201]['content']['application/json'];
export type AccountSessionMutationResponse =
  operations['DomainController_revokeAccountSession']['responses'][200]['content']['application/json'];
export type AccountRequestMutationResponse =
  operations['DomainController_createAccountRequest']['responses'][201]['content']['application/json'];
export type AccountIdentityProvider = AccountOverview['identities'][number]['provider'];

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

  function authorizationHeaders() {
    if (!options.accessToken) {
      throw new Error('API data mode requires an authenticated session token.');
    }
    return { Authorization: `Bearer ${options.accessToken}` };
  }

  function rejectLocalMutation(): never {
    throw new Error('Local preview never persists account or identity changes.');
  }

  return {
    async createAccountRequest(input: {
      publicId: string;
      recentAuthGrantPublicId?: string;
      sessionPublicId: string;
      type: 'deletion' | 'export';
    }): Promise<AccountRequestMutationResponse> {
      if (mode === 'local-preview') return rejectLocalMutation();
      const response = await client.POST('/v1/account/requests', {
        body: input,
        headers: authorizationHeaders(),
      });
      if (!response.data) throw new Error('The account request could not be created.');
      return response.data;
    },

    async getAccountOverview(): Promise<MobileAccountDataResult> {
      if (mode === 'local-preview') return { data: localAccountOverview, source: mode };
      const response = await client.GET('/v1/account', {
        headers: authorizationHeaders(),
      });
      if (!response.data) throw new Error('Account details could not be loaded.');
      return { data: response.data, source: 'api' };
    },

    async linkIdentity(input: {
      providerProofToken: string;
      recentAuthGrantPublicId: string;
    }): Promise<AccountIdentityMutationResponse> {
      if (mode === 'local-preview') return rejectLocalMutation();
      const response = await client.POST('/v1/account/identities', {
        body: input,
        headers: authorizationHeaders(),
      });
      if (!response.data) throw new Error('The sign-in method could not be linked.');
      return response.data;
    },

    async revokeSession(sessionPublicId: string): Promise<AccountSessionMutationResponse> {
      if (mode === 'local-preview') return rejectLocalMutation();
      const response = await client.POST('/v1/account/logout', {
        body: { sessionPublicId },
        headers: authorizationHeaders(),
      });
      if (!response.data) throw new Error('The session could not be revoked.');
      return response.data;
    },

    async unlinkIdentity(
      provider: AccountIdentityProvider,
      recentAuthGrantPublicId: string,
    ): Promise<AccountIdentityMutationResponse> {
      if (mode === 'local-preview') return rejectLocalMutation();
      const response = await client.DELETE('/v1/account/identities/{provider}', {
        body: { recentAuthGrantPublicId },
        headers: authorizationHeaders(),
        params: { path: { provider } },
      });
      if (!response.data) throw new Error('The sign-in method could not be unlinked.');
      return response.data;
    },
  };
}
