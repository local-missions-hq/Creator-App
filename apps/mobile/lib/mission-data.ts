import type { LocalMissionsApiClient, operations } from '@local-missions/api-client';

import { createMobileApiClient } from './api-client';
import { authenticatedMobileApiHeaders, type MobileApiAuthorizationContext } from './auth-session';

export type CreatorMissionFeed =
  operations['DomainController_listCreatorMissions']['responses'][200]['content']['application/json'];
export type CreatorMissionDetail =
  operations['DomainController_getCreatorMission']['responses'][200]['content']['application/json'];
export type BusinessCampaignPage =
  operations['DomainController_listBusinessCampaigns']['responses'][200]['content']['application/json'];

export type MobileDataResult<T> = {
  data: T;
  source: 'api' | 'local-preview';
};

export const localCreatorMissionFeed: CreatorMissionFeed = {
  data: [
    {
      availableCommunitySlots: 3,
      baseRewardMinor: 5_000,
      businessName: 'Demo Family Fun Center',
      currency: 'USD',
      publicId: 'cmp_orlando_synthetic_001',
      title: 'Family Adventure Preview',
      totalCommunitySlots: 10,
      venue: { city: 'Orlando', name: 'Demo Family Fun Center', region: 'FL' },
    },
  ],
  page: { hasMore: false, limit: 20, nextCursor: null },
};

export const localCreatorMissionDetail: CreatorMissionDetail = {
  ...localCreatorMissionFeed.data[0]!,
  brief: 'Visit the family activity center and capture honest, useful local content.',
  checklist: { clips: 2, photos: 5 },
  requirements: [
    {
      description: 'Provide five clear original photos.',
      ordinal: 1,
      requiredCount: 5,
      type: 'photo',
    },
    {
      description: 'Provide two original vertical clips.',
      ordinal: 2,
      requiredCount: 2,
      type: 'raw_clip',
    },
  ],
};

export const localBusinessCampaignPage: BusinessCampaignPage = {
  data: [
    {
      availableCommunitySlots: 10,
      creatorRewardPoolMinor: 50_000,
      currency: 'USD',
      platformFeeMinor: 7_500,
      publicId: 'cmp_orlando_synthetic_001',
      slotCount: 10,
      status: 'draft',
      title: 'Family Adventure Preview',
      totalDueMinor: 57_500,
      version: 1,
    },
  ],
  page: { hasMore: false, limit: 20, nextCursor: null },
};

export type MobileMissionDataAdapterOptions = {
  accessToken?: string;
  authorizationContext?: MobileApiAuthorizationContext;
  client?: LocalMissionsApiClient;
  mode?: 'api' | 'local-preview';
  sessionPublicId?: string;
};

export function createMobileMissionDataAdapter(options: MobileMissionDataAdapterOptions = {}) {
  const mode =
    options.mode ?? (process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'local-preview');
  const client = options.client ?? createMobileApiClient();

  function authorizationHeaders() {
    return authenticatedMobileApiHeaders(
      options.accessToken,
      options.sessionPublicId,
      options.authorizationContext,
    );
  }

  return {
    async getBusinessCampaigns(): Promise<MobileDataResult<BusinessCampaignPage>> {
      if (mode === 'local-preview') return { data: localBusinessCampaignPage, source: mode };
      const response = await client.GET('/v1/business/campaigns', {
        headers: authorizationHeaders(),
        params: { query: { limit: 20 } },
      });
      if (!response.data) throw new Error('Business campaigns could not be loaded.');
      return { data: response.data, source: 'api' };
    },

    async getCreatorMission(
      campaignPublicId: string,
    ): Promise<MobileDataResult<CreatorMissionDetail>> {
      if (mode === 'local-preview') return { data: localCreatorMissionDetail, source: mode };
      const response = await client.GET('/v1/creator/missions/{campaignPublicId}', {
        headers: authorizationHeaders(),
        params: { path: { campaignPublicId } },
      });
      if (!response.data) throw new Error('Mission details could not be loaded.');
      return { data: response.data, source: 'api' };
    },

    async getCreatorMissions(): Promise<MobileDataResult<CreatorMissionFeed>> {
      if (mode === 'local-preview') return { data: localCreatorMissionFeed, source: mode };
      const response = await client.GET('/v1/creator/missions', {
        headers: authorizationHeaders(),
        params: { query: { limit: 20 } },
      });
      if (!response.data) throw new Error('Creator missions could not be loaded.');
      return { data: response.data, source: 'api' };
    },
  };
}
