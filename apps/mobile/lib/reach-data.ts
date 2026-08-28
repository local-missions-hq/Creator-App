import type { LocalMissionsApiClient, operations } from '@local-missions/api-client';

import { createMobileApiClient } from './api-client';

export type CreatorReachOverview =
  operations['DomainController_getCreatorReach']['responses'][200]['content']['application/json'];
export type BusinessReachOptions =
  operations['DomainController_getBusinessReachOptions']['responses'][200]['content']['application/json'];
export type ReachPlatform = CreatorReachOverview['platforms'][number]['platform'];

export type MobileReachDataResult<T> = {
  data: T;
  source: 'api' | 'local-preview';
};

export const localCreatorReachOverview: CreatorReachOverview = {
  communityAccessIndependent: true,
  platforms: ['instagram', 'tiktok', 'youtube'].map((platform) => ({
    capabilityStatus: 'disabled',
    connectionAvailable: false,
    consentStatus: null,
    platform: platform as ReachPlatform,
    qualification: null,
  })),
};

export const localBusinessReachOptions: BusinessReachOptions = {
  communityMinimumPercent: 80,
  packages: [
    { bonusMultiplierBps: 5_000, creatorRewardMultiplierBps: 15_000, level: 'level_1' },
    { bonusMultiplierBps: 10_000, creatorRewardMultiplierBps: 20_000, level: 'level_2' },
    { bonusMultiplierBps: 20_000, creatorRewardMultiplierBps: 30_000, level: 'level_3' },
  ],
  platforms: ['instagram', 'tiktok', 'youtube'].map((platform) => ({
    bookingAvailable: false,
    capabilityStatus: 'disabled',
    platform: platform as ReachPlatform,
  })),
  rawAudienceFiltersAllowed: false,
};

export type MobileReachDataAdapterOptions = {
  accessToken?: string;
  client?: LocalMissionsApiClient;
  mode?: 'api' | 'local-preview';
};

export function createMobileReachDataAdapter(options: MobileReachDataAdapterOptions = {}) {
  const mode =
    options.mode ?? (process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'local-preview');
  const client = options.client ?? createMobileApiClient();

  function authorizationHeaders() {
    if (!options.accessToken) {
      throw new Error('API data mode requires an authenticated session token.');
    }
    return { Authorization: `Bearer ${options.accessToken}` };
  }

  async function requireData<T>(data: T | undefined, message: string): Promise<T> {
    if (!data) throw new Error(message);
    return data;
  }

  return {
    async getBusinessReachOptions(): Promise<MobileReachDataResult<BusinessReachOptions>> {
      if (mode === 'local-preview') return { data: localBusinessReachOptions, source: mode };
      const response = await client.GET('/v1/business/reach-options', {
        headers: authorizationHeaders(),
      });
      return {
        data: await requireData(response.data, 'Reach campaign options could not be loaded.'),
        source: 'api',
      };
    },

    async getCreatorReach(): Promise<MobileReachDataResult<CreatorReachOverview>> {
      if (mode === 'local-preview') return { data: localCreatorReachOverview, source: mode };
      const response = await client.GET('/v1/creator/reach', {
        headers: authorizationHeaders(),
      });
      return {
        data: await requireData(response.data, 'Creator Reach status could not be loaded.'),
        source: 'api',
      };
    },

    async grantConsent(
      platform: ReachPlatform,
    ): Promise<MobileReachDataResult<CreatorReachOverview>> {
      if (mode === 'local-preview') {
        throw new Error('Local preview never records Reach consent.');
      }
      const response = await client.POST('/v1/creator/reach/{platform}/consent', {
        headers: authorizationHeaders(),
        params: { path: { platform } },
      });
      return {
        data: await requireData(response.data, 'Reach consent could not be recorded.'),
        source: 'api',
      };
    },

    async revokeConsent(
      platform: ReachPlatform,
    ): Promise<MobileReachDataResult<CreatorReachOverview>> {
      if (mode === 'local-preview') {
        throw new Error('Local preview never revokes persisted Reach consent.');
      }
      const response = await client.DELETE('/v1/creator/reach/{platform}/consent', {
        headers: authorizationHeaders(),
        params: { path: { platform } },
      });
      return {
        data: await requireData(response.data, 'Reach consent could not be revoked.'),
        source: 'api',
      };
    },
  };
}
