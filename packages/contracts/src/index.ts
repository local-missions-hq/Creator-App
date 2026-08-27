import { z } from 'zod';

export const appEnvironmentSchema = z.enum(['local', 'development', 'staging', 'production']);

export const healthStatusSchema = z.object({
  environment: appEnvironmentSchema,
  service: z.literal('local-missions-api'),
  status: z.literal('ok'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const campaignStatusSchema = z.enum([
  'draft',
  'submitted',
  'approved',
  'funded',
  'published',
  'canceled',
]);

export const campaignConflictCodeSchema = z.enum([
  'CAMPAIGN_ACCESS_DENIED',
  'CAMPAIGN_NOT_FOUND',
  'CAMPAIGN_TRANSITION_CONFLICT',
  'CAMPAIGN_VERSION_CONFLICT',
  'IDEMPOTENCY_KEY_REUSE',
]);

export const campaignRecordSchema = z
  .object({
    businessId: z.uuid(),
    creatorRewardPoolMinor: z.int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    id: z.uuid(),
    platformFeeMinor: z.int().nonnegative(),
    publicId: z.string().min(1),
    slotCount: z.int().min(1).max(20),
    status: campaignStatusSchema,
    title: z.string().min(1),
    totalDueMinor: z.int().nonnegative(),
    version: z.int().positive(),
  })
  .refine(
    (campaign) =>
      campaign.totalDueMinor === campaign.creatorRewardPoolMinor + campaign.platformFeeMinor,
    {
      message: 'Total due must equal creator reward pool plus platform fee.',
      path: ['totalDueMinor'],
    },
  );

export const identityProviderSchema = z.enum([
  'apple',
  'google',
  'microsoft',
  'passwordless_email',
]);

export const userStatusSchema = z.enum(['active', 'disabled', 'deletion_requested']);
export const creatorProfileStatusSchema = z.enum([
  'invited',
  'onboarding',
  'approved',
  'paused',
  'denied',
]);
export const localityStatusSchema = z.enum([
  'unverified',
  'pending',
  'verified',
  'expired',
  'rejected',
]);
export const payoutOnboardingStatusSchema = z.enum([
  'not_started',
  'pending',
  'ready',
  'restricted',
]);
export const businessMembershipRoleSchema = z.enum(['owner', 'manager', 'venue_staff']);
export const businessMembershipStatusSchema = z.enum(['invited', 'active', 'disabled']);

export const identityTenantConflictCodeSchema = z.enum([
  'BUSINESS_ACCESS_DENIED',
  'IDENTITY_ALREADY_BOUND',
  'USER_IDENTITY_PROVIDER_ALREADY_LINKED',
  'USER_NOT_FOUND',
  'USER_PUBLIC_ID_EXISTS',
]);

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;
export type BusinessMembershipRole = z.infer<typeof businessMembershipRoleSchema>;
export type BusinessMembershipStatus = z.infer<typeof businessMembershipStatusSchema>;
export type CampaignConflictCode = z.infer<typeof campaignConflictCodeSchema>;
export type CampaignRecord = z.infer<typeof campaignRecordSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type CreatorProfileStatus = z.infer<typeof creatorProfileStatusSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type IdentityProvider = z.infer<typeof identityProviderSchema>;
export type IdentityTenantConflictCode = z.infer<typeof identityTenantConflictCodeSchema>;
export type LocalityStatus = z.infer<typeof localityStatusSchema>;
export type PayoutOnboardingStatus = z.infer<typeof payoutOnboardingStatusSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
