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

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;
export type CampaignConflictCode = z.infer<typeof campaignConflictCodeSchema>;
export type CampaignRecord = z.infer<typeof campaignRecordSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
