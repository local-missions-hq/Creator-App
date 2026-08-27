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
  'CAMPAIGN_CONTRACT_INCOMPLETE',
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

export const missionTemplateCodeSchema = z.enum([
  'visit_create',
  'visit_share',
  'event_attendance',
  'private_experience_feedback',
]);
export const missionSlotTypeSchema = z.enum(['community', 'reach']);
export const missionSlotStatusSchema = z.enum([
  'available',
  'reserved',
  'accepted',
  'in_progress',
  'completed',
  'canceled',
]);
export const reachLevelSchema = z.enum(['level_1', 'level_2', 'level_3']);
export const missionApplicationStatusSchema = z.enum([
  'submitted',
  'accepted',
  'withdrawn',
  'rejected',
  'expired',
  'canceled',
]);
export const slotReservationStatusSchema = z.enum(['active', 'converted', 'released', 'expired']);
export const missionAssignmentStatusSchema = z.enum([
  'scheduled',
  'checked_in',
  'canceled',
  'completed',
]);
export const venueStaffAssignmentStatusSchema = z.enum(['active', 'revoked']);
export const checkInChallengeMethodSchema = z.enum(['qr', 'staff_code']);
export const checkInChallengeStatusSchema = z.enum(['active', 'consumed', 'expired', 'revoked']);
export const checkInAccuracyClassSchema = z.enum(['unavailable', 'coarse', 'precise']);

export const checkInConflictCodeSchema = z.enum([
  'CHECK_IN_ACCESS_DENIED',
  'CHECK_IN_ALREADY_RECORDED',
  'CHECK_IN_ASSIGNMENT_NOT_FOUND',
  'CHECK_IN_CHALLENGE_EXPIRED',
  'CHECK_IN_CHALLENGE_INVALID',
  'CHECK_IN_CHALLENGE_REPLAYED',
  'CHECK_IN_OUTSIDE_WINDOW',
  'CHECK_IN_WRONG_VENUE',
  'MISSION_SCHEDULE_CONFLICT',
  'VENUE_STAFF_ACCESS_DENIED',
]);

export const missionAssignmentRecordSchema = z.object({
  applicationId: z.uuid(),
  businessLocationId: z.uuid(),
  campaignId: z.uuid(),
  creatorUserId: z.uuid(),
  id: z.uuid(),
  missionSlotId: z.uuid(),
  publicId: z.string().min(1),
  status: missionAssignmentStatusSchema,
  timezone: z.string().min(1),
  version: z.int().positive(),
  windowEndsAt: z.date(),
  windowStartsAt: z.date(),
});

export const checkInEventRecordSchema = z.object({
  accuracyClass: checkInAccuracyClassSchema,
  applicationId: z.uuid(),
  businessLocationId: z.uuid(),
  challengeId: z.uuid(),
  creatorUserId: z.uuid(),
  id: z.uuid(),
  missionAssignmentId: z.uuid(),
  missionSlotId: z.uuid(),
  occurredAt: z.date(),
  publicId: z.string().min(1),
  verificationMethod: checkInChallengeMethodSchema,
});

export const missionApplicationConflictCodeSchema = z.enum([
  'APPLICATION_ACCESS_DENIED',
  'APPLICATION_ALREADY_EXISTS',
  'APPLICATION_NOT_FOUND',
  'APPLICATION_TRANSITION_CONFLICT',
  'CAMPAIGN_CONTRACT_INCOMPLETE',
  'CAMPAIGN_NOT_AVAILABLE',
  'CREATOR_NOT_QUALIFIED',
  'MISSION_CAPACITY_FULL',
]);

export const missionApplicationRecordSchema = z.object({
  campaignId: z.uuid(),
  creatorUserId: z.uuid(),
  id: z.uuid(),
  publicId: z.string().min(1),
  reservedSlotId: z.uuid(),
  slotType: missionSlotTypeSchema,
  status: missionApplicationStatusSchema,
  version: z.int().positive(),
});

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
export type CheckInAccuracyClass = z.infer<typeof checkInAccuracyClassSchema>;
export type CheckInChallengeMethod = z.infer<typeof checkInChallengeMethodSchema>;
export type CheckInChallengeStatus = z.infer<typeof checkInChallengeStatusSchema>;
export type CheckInConflictCode = z.infer<typeof checkInConflictCodeSchema>;
export type CheckInEventRecord = z.infer<typeof checkInEventRecordSchema>;
export type CreatorProfileStatus = z.infer<typeof creatorProfileStatusSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type IdentityProvider = z.infer<typeof identityProviderSchema>;
export type IdentityTenantConflictCode = z.infer<typeof identityTenantConflictCodeSchema>;
export type LocalityStatus = z.infer<typeof localityStatusSchema>;
export type MissionApplicationConflictCode = z.infer<typeof missionApplicationConflictCodeSchema>;
export type MissionApplicationRecord = z.infer<typeof missionApplicationRecordSchema>;
export type MissionApplicationStatus = z.infer<typeof missionApplicationStatusSchema>;
export type MissionAssignmentRecord = z.infer<typeof missionAssignmentRecordSchema>;
export type MissionAssignmentStatus = z.infer<typeof missionAssignmentStatusSchema>;
export type MissionSlotStatus = z.infer<typeof missionSlotStatusSchema>;
export type MissionSlotType = z.infer<typeof missionSlotTypeSchema>;
export type MissionTemplateCode = z.infer<typeof missionTemplateCodeSchema>;
export type PayoutOnboardingStatus = z.infer<typeof payoutOnboardingStatusSchema>;
export type ReachLevel = z.infer<typeof reachLevelSchema>;
export type SlotReservationStatus = z.infer<typeof slotReservationStatusSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type VenueStaffAssignmentStatus = z.infer<typeof venueStaffAssignmentStatusSchema>;
