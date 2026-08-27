import { z } from 'zod';

export const appEnvironmentSchema = z.enum(['local', 'development', 'staging', 'production']);

export const healthStatusSchema = z.object({
  environment: appEnvironmentSchema,
  service: z.literal('local-missions-api'),
  status: z.literal('ok'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const apiRequestIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/);
export const apiCorrelationIdSchema = apiRequestIdSchema;
export const apiCursorSchema = z.string().regex(/^[A-Za-z0-9_-]{8,512}$/);
export const apiPageLimitSchema = z.coerce.number().int().min(1).max(100).default(20);
export const apiPaginationQuerySchema = z.object({
  cursor: apiCursorSchema.optional(),
  limit: apiPageLimitSchema,
});

export const apiErrorCodeSchema = z.enum([
  'ACCESS_DENIED',
  'AUTHENTICATION_REQUIRED',
  'DEPENDENCY_UNAVAILABLE',
  'IDEMPOTENCY_KEY_REQUIRED',
  'INTERNAL_ERROR',
  'NOT_FOUND',
  'RATE_LIMITED',
  'STATE_CONFLICT',
  'VALIDATION_FAILED',
  'VERSION_CONFLICT',
]);
export const apiErrorDetailSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]+$/),
  path: z.string().min(1).max(160),
});
export const apiErrorEnvelopeSchema = z.object({
  correlationId: apiCorrelationIdSchema,
  error: z.object({
    code: apiErrorCodeSchema,
    details: z.array(apiErrorDetailSchema).max(25).optional(),
    message: z.string().min(1).max(240),
  }),
  requestId: apiRequestIdSchema,
});

export const apiPageSchema = z.object({
  hasMore: z.boolean(),
  limit: z.int().min(1).max(100),
  nextCursor: apiCursorSchema.nullable(),
});

export const livenessStatusSchema = z.object({
  service: z.literal('local-missions-api'),
  status: z.literal('ok'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});
export const readinessStatusSchema = z.object({
  dependencies: z.object({ database: z.literal('up') }),
  service: z.literal('local-missions-api'),
  status: z.literal('ready'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});
export const buildInfoSchema = z.object({
  builtAt: z.union([z.iso.datetime({ offset: true }), z.literal('local')]),
  commit: z.union([z.string().regex(/^[a-f0-9]{7,40}$/), z.literal('local')]),
  service: z.literal('local-missions-api'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const apiResourceSchema = z.enum(['mission-templates']);
export const v1IndexSchema = z.object({
  resources: z.array(apiResourceSchema),
  version: z.literal('v1'),
});
export const missionTemplateSummarySchema = z.object({
  code: z.enum(['visit_create', 'visit_share', 'event_attendance', 'private_experience_feedback']),
  name: z.string().min(1).max(120),
  version: z.int().positive(),
});
export const missionTemplatePageSchema = z.object({
  data: z.array(missionTemplateSummarySchema),
  page: apiPageSchema,
});

export const localDevRoleSchema = z.enum([
  'creator',
  'business_owner',
  'business_manager',
  'venue_staff',
  'platform_admin',
]);
export const localDevTokenRequestSchema = z
  .object({
    role: localDevRoleSchema,
    subjectPublicId: z.string().regex(/^usr_synthetic_[a-z0-9_]{3,80}$/),
    tenantPublicId: z
      .string()
      .regex(/^biz_synthetic_[a-z0-9_]{3,80}$/)
      .optional(),
  })
  .superRefine((value, context) => {
    const tenantRole = ['business_owner', 'business_manager', 'venue_staff'].includes(value.role);
    if (tenantRole && !value.tenantPublicId) {
      context.addIssue({
        code: 'custom',
        message: 'A synthetic tenant is required for Business and Venue Staff roles.',
        path: ['tenantPublicId'],
      });
    }
    if (!tenantRole && value.tenantPublicId) {
      context.addIssue({
        code: 'custom',
        message: 'This role cannot assume a Business tenant.',
        path: ['tenantPublicId'],
      });
    }
  });
export const localDevTokenResponseSchema = z.object({
  accessToken: z.string().min(32),
  expiresIn: z.literal(900),
  tokenType: z.literal('Bearer'),
});

export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/);
export const optimisticVersionSchema = z.int().positive();

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
  'no_payout',
  'canceled',
]);
export const reachLevelSchema = z.enum(['level_1', 'level_2', 'level_3']);
export const missionApplicationStatusSchema = z.enum([
  'submitted',
  'accepted',
  'completed',
  'no_payout',
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
  'no_payout',
]);
export const venueStaffAssignmentStatusSchema = z.enum(['active', 'revoked']);
export const checkInChallengeMethodSchema = z.enum(['qr', 'staff_code']);
export const checkInChallengeStatusSchema = z.enum(['active', 'consumed', 'expired', 'revoked']);
export const checkInAccuracyClassSchema = z.enum(['unavailable', 'coarse', 'precise']);
export const deliverableRequirementTypeSchema = z.enum([
  'photo',
  'raw_clip',
  'edited_video',
  'social_post',
  'private_response',
  'attendance_proof',
]);
export const mediaOrientationSchema = z.enum(['any', 'portrait_9_16']);
export const mediaAssetStatusSchema = z.enum([
  'pending_scan',
  'verified',
  'quarantined',
  'rejected',
]);
export const submissionEvidenceKindSchema = z.enum([
  'platform_post',
  'structured_response',
  'check_in_reference',
]);
export const submissionStatusSchema = z.enum([
  'under_review',
  'correction_requested',
  'approved',
  'auto_approved',
  'disputed',
  'resolved_approved',
  'resolved_no_payout',
]);
export const submissionReviewDecisionTypeSchema = z.enum([
  'approved',
  'correction_requested',
  'auto_approved',
]);
export const correctionReasonCodeSchema = z.enum([
  'missing_count',
  'corrupt_file',
  'duration_out_of_range',
  'wrong_orientation',
  'insufficient_resolution',
  'wrong_subject',
  'unrelated_brand_watermark',
  'missing_disclosure',
]);
export const platformStaffRoleSchema = z.enum([
  'dispute_reviewer',
  'finance_operator',
  'verification_reviewer',
  'admin',
]);
export const platformStaffStatusSchema = z.enum(['active', 'revoked']);
export const disputeOpenedBySchema = z.enum(['creator', 'business']);
export const disputeReasonCodeSchema = z.enum([
  'correction_outside_contract',
  'requirement_already_satisfied',
  'false_check_in',
  'missing_count',
  'corrupt_file',
  'duration_out_of_range',
  'wrong_orientation',
  'insufficient_resolution',
  'wrong_subject',
  'unrelated_brand_watermark',
  'missing_disclosure',
  'suspected_fraud',
]);
export const disputeEvidenceKindSchema = z.enum([
  'deliverable_requirement',
  'media_asset',
  'check_in_event',
  'correction_request',
  'submission_attempt',
  'submission_evidence',
]);
export const disputeStatusSchema = z.enum(['open', 'resolved_earned_full', 'resolved_no_payout']);
export const disputeResolutionOutcomeSchema = z.enum(['earned_full', 'no_payout']);
export const financialActionIntentTypeSchema = z.enum(['creator_payable_full', 'slot_refund_full']);
export const financialActionIntentStatusSchema = z.enum(['pending_ledger', 'posted']);
export const paymentProviderSchema = z.enum(['stripe']);
export const paymentProviderObjectTypeSchema = z.enum([
  'payment_intent',
  'charge',
  'transfer',
  'refund',
  'payout',
  'dispute',
]);
export const ledgerAccountCodeSchema = z.enum([
  'provider_clearing',
  'campaign_funds',
  'creator_payable',
  'business_refund_payable',
  'platform_fee_revenue',
  'finance_adjustment_control',
]);
export const ledgerTransactionTypeSchema = z.enum([
  'campaign_funding',
  'slot_completion',
  'slot_refund',
  'finance_adjustment',
]);
export const ledgerTransactionSourceTypeSchema = z.enum([
  'provider_funding',
  'financial_action_intent',
  'finance_adjustment',
]);
export const ledgerEntryDirectionSchema = z.enum(['debit', 'credit']);
export const localPassOfferStatusSchema = z.enum([
  'configured',
  'active',
  'claims_paused',
  'closed',
]);
export const localPassLinkStatusSchema = z.enum(['active', 'revoked']);
export const localPassClaimStatusSchema = z.enum(['active', 'redeemed', 'expired']);
export const localPassClaimTokenStatusSchema = z.enum(['active', 'consumed', 'expired', 'revoked']);
export const localPassEvidenceKindSchema = z.enum([
  'link_open',
  'pass_claimed',
  'verified_pass_redemption',
]);
export const localPassFulfillmentKindSchema = z.enum([
  'original_offer',
  'preapproved_substitute',
  'customer_accepted_substitute',
]);
export const legalDocumentTypeSchema = z.enum(['creator_terms', 'sponsorship_disclosure']);
export const contentLicenseKindSchema = z.enum([
  'organic_owned_social_90d',
  'extended_owned_media_12m',
  'paid_advertising_30d',
]);
export const contentLicenseStatusSchema = z.enum(['active', 'expired', 'suspended', 'revoked']);
export const contentLicenseChannelSchema = z.enum([
  'owned_social',
  'business_website',
  'business_email',
  'paid_advertising',
]);
export const rightsConflictCodeSchema = z.enum([
  'RIGHTS_ACCESS_DENIED',
  'RIGHTS_ACCEPTANCE_INVALID',
  'RIGHTS_ALREADY_ACCEPTED',
  'RIGHTS_ALREADY_ACTIVATED',
  'RIGHTS_DOCUMENT_INVALID',
  'RIGHTS_LICENSE_NOT_READY',
  'RIGHTS_NO_CONTENT',
  'RIGHTS_NOT_FOUND',
  'RIGHTS_OFFER_INVALID',
  'RIGHTS_TRANSITION_CONFLICT',
]);
export const notificationEventTypeSchema = z.enum([
  'mission_accepted',
  'mission_reminder',
  'check_in_reminder',
  'submission_due',
  'revision_requested',
  'mission_approved',
  'payout_available',
  'dispute_update',
  'security_alert',
]);
export const notificationCategorySchema = z.enum([
  'mission_action',
  'mission_reminder',
  'money',
  'dispute',
  'security',
]);
export const notificationAudienceSchema = z.enum([
  'creator',
  'business_member',
  'platform_staff',
  'account_owner',
]);
export const notificationChannelSchema = z.enum(['in_app', 'push', 'email']);
export const notificationAggregateTypeSchema = z.enum([
  'user',
  'mission_application',
  'mission_assignment',
]);
export const notificationOutboxStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'dead_letter',
]);
export const notificationDeliveryStatusSchema = z.enum([
  'suppressed',
  'no_send',
  'failed',
  'delivered',
]);
export const notificationConflictCodeSchema = z.enum([
  'NOTIFICATION_ACCESS_DENIED',
  'NOTIFICATION_CLAIM_INVALID',
  'NOTIFICATION_DEAD_LETTER_REQUIRED',
  'NOTIFICATION_EVENT_INVALID',
  'NOTIFICATION_NOT_FOUND',
  'NOTIFICATION_PREFERENCE_INVALID',
  'NOTIFICATION_TRANSITION_CONFLICT',
]);
export const localityVerificationMethodSchema = z.enum([
  'utility_bill',
  'lease_or_mortgage',
  'government_mail',
  'accessible_manual_review',
]);
export const localityVerificationStatusSchema = z.enum([
  'pending_review',
  'correction_needed',
  'verified',
  'rejected',
  'appeal_pending',
  'final_rejected',
  'expired',
  'invalidated',
]);
export const localityReviewReasonSchema = z.enum([
  'approved',
  'unreadable',
  'document_too_old',
  'postal_area_mismatch',
  'unsupported_proof',
  'ineligible_area',
  'suspected_tampering',
]);
export const localityAppealReasonSchema = z.enum([
  'review_error',
  'accessibility_issue',
  'newer_evidence',
]);
export const localityEvidenceDeletionStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'dead_letter',
]);
export const localityConflictCodeSchema = z.enum([
  'LOCALITY_ACCESS_DENIED',
  'LOCALITY_ACTIVE_REVIEW_EXISTS',
  'LOCALITY_APPEAL_INVALID',
  'LOCALITY_CLAIM_INVALID',
  'LOCALITY_EVIDENCE_INVALID',
  'LOCALITY_HOLD_INVALID',
  'LOCALITY_NOT_FOUND',
  'LOCALITY_REVIEW_INVALID',
  'LOCALITY_TRANSITION_CONFLICT',
]);

export const localPassConflictCodeSchema = z.enum([
  'LOCAL_PASS_ACCESS_DENIED',
  'LOCAL_PASS_ALREADY_CLAIMED',
  'LOCAL_PASS_ALREADY_REDEEMED',
  'LOCAL_PASS_ATTRIBUTION_LOCKED',
  'LOCAL_PASS_CLAIMS_PAUSED',
  'LOCAL_PASS_INVENTORY_FULL',
  'LOCAL_PASS_NOT_FOUND',
  'LOCAL_PASS_NOT_READY',
  'LOCAL_PASS_OFFER_INVALID',
  'LOCAL_PASS_OUTSIDE_WINDOW',
  'LOCAL_PASS_TOKEN_EXPIRED',
  'LOCAL_PASS_TOKEN_INVALID',
  'LOCAL_PASS_TOKEN_REPLAYED',
  'LOCAL_PASS_WRONG_VENUE',
]);

export const ledgerConflictCodeSchema = z.enum([
  'LEDGER_ACCESS_DENIED',
  'LEDGER_ADJUSTMENT_INVALID',
  'LEDGER_ALLOCATION_INVALID',
  'LEDGER_ALREADY_FUNDED',
  'LEDGER_CURRENCY_MISMATCH',
  'LEDGER_IDEMPOTENCY_CONFLICT',
  'LEDGER_INTENT_NOT_FOUND',
  'LEDGER_INTENT_NOT_READY',
  'LEDGER_PROVIDER_CONFLICT',
  'LEDGER_TRANSITION_CONFLICT',
]);

export const disputeConflictCodeSchema = z.enum([
  'DISPUTE_ACCESS_DENIED',
  'DISPUTE_ALREADY_EXISTS',
  'DISPUTE_EVIDENCE_INVALID',
  'DISPUTE_NOT_FOUND',
  'DISPUTE_REVIEW_EXPIRED',
  'DISPUTE_REVIEWER_CONFLICT',
  'DISPUTE_TRANSITION_CONFLICT',
]);

export const submissionConflictCodeSchema = z.enum([
  'MEDIA_ASSET_CONFLICT',
  'SUBMISSION_ACCESS_DENIED',
  'SUBMISSION_ALREADY_EXISTS',
  'SUBMISSION_ASSET_INVALID',
  'SUBMISSION_ASSET_NOT_VERIFIED',
  'SUBMISSION_CHECK_IN_REQUIRED',
  'SUBMISSION_CONTRACT_INCOMPLETE',
  'SUBMISSION_NOT_FOUND',
  'SUBMISSION_REVIEW_EXPIRED',
  'SUBMISSION_REVIEW_NOT_DUE',
  'SUBMISSION_SECOND_CORRECTION_NOT_ALLOWED',
  'SUBMISSION_TRANSITION_CONFLICT',
]);

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
  campaignBriefVersionId: z.uuid(),
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
export type ApiCorrelationId = z.infer<typeof apiCorrelationIdSchema>;
export type ApiCursor = z.infer<typeof apiCursorSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;
export type ApiPaginationQuery = z.infer<typeof apiPaginationQuerySchema>;
export type ApiRequestId = z.infer<typeof apiRequestIdSchema>;
export type BuildInfo = z.infer<typeof buildInfoSchema>;
export type LivenessStatus = z.infer<typeof livenessStatusSchema>;
export type LocalDevRole = z.infer<typeof localDevRoleSchema>;
export type LocalDevTokenRequest = z.infer<typeof localDevTokenRequestSchema>;
export type LocalDevTokenResponse = z.infer<typeof localDevTokenResponseSchema>;
export type MissionTemplatePage = z.infer<typeof missionTemplatePageSchema>;
export type MissionTemplateSummary = z.infer<typeof missionTemplateSummarySchema>;
export type ReadinessStatus = z.infer<typeof readinessStatusSchema>;
export type V1Index = z.infer<typeof v1IndexSchema>;
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
export type CorrectionReasonCode = z.infer<typeof correctionReasonCodeSchema>;
export type CreatorProfileStatus = z.infer<typeof creatorProfileStatusSchema>;
export type DisputeConflictCode = z.infer<typeof disputeConflictCodeSchema>;
export type DisputeEvidenceKind = z.infer<typeof disputeEvidenceKindSchema>;
export type DisputeOpenedBy = z.infer<typeof disputeOpenedBySchema>;
export type DisputeReasonCode = z.infer<typeof disputeReasonCodeSchema>;
export type DisputeResolutionOutcome = z.infer<typeof disputeResolutionOutcomeSchema>;
export type DisputeStatus = z.infer<typeof disputeStatusSchema>;
export type FinancialActionIntentStatus = z.infer<typeof financialActionIntentStatusSchema>;
export type FinancialActionIntentType = z.infer<typeof financialActionIntentTypeSchema>;
export type LedgerAccountCode = z.infer<typeof ledgerAccountCodeSchema>;
export type LedgerConflictCode = z.infer<typeof ledgerConflictCodeSchema>;
export type LedgerEntryDirection = z.infer<typeof ledgerEntryDirectionSchema>;
export type LedgerTransactionSourceType = z.infer<typeof ledgerTransactionSourceTypeSchema>;
export type LedgerTransactionType = z.infer<typeof ledgerTransactionTypeSchema>;
export type ContentLicenseChannel = z.infer<typeof contentLicenseChannelSchema>;
export type ContentLicenseKind = z.infer<typeof contentLicenseKindSchema>;
export type ContentLicenseStatus = z.infer<typeof contentLicenseStatusSchema>;
export type LegalDocumentType = z.infer<typeof legalDocumentTypeSchema>;
export type LocalPassClaimStatus = z.infer<typeof localPassClaimStatusSchema>;
export type LocalPassClaimTokenStatus = z.infer<typeof localPassClaimTokenStatusSchema>;
export type LocalPassConflictCode = z.infer<typeof localPassConflictCodeSchema>;
export type LocalPassEvidenceKind = z.infer<typeof localPassEvidenceKindSchema>;
export type LocalPassFulfillmentKind = z.infer<typeof localPassFulfillmentKindSchema>;
export type LocalPassLinkStatus = z.infer<typeof localPassLinkStatusSchema>;
export type LocalPassOfferStatus = z.infer<typeof localPassOfferStatusSchema>;
export type LocalityAppealReason = z.infer<typeof localityAppealReasonSchema>;
export type LocalityConflictCode = z.infer<typeof localityConflictCodeSchema>;
export type LocalityEvidenceDeletionStatus = z.infer<typeof localityEvidenceDeletionStatusSchema>;
export type LocalityReviewReason = z.infer<typeof localityReviewReasonSchema>;
export type LocalityVerificationMethod = z.infer<typeof localityVerificationMethodSchema>;
export type LocalityVerificationStatus = z.infer<typeof localityVerificationStatusSchema>;
export type RightsConflictCode = z.infer<typeof rightsConflictCodeSchema>;
export type NotificationAggregateType = z.infer<typeof notificationAggregateTypeSchema>;
export type NotificationAudience = z.infer<typeof notificationAudienceSchema>;
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationConflictCode = z.infer<typeof notificationConflictCodeSchema>;
export type NotificationDeliveryStatus = z.infer<typeof notificationDeliveryStatusSchema>;
export type NotificationEventType = z.infer<typeof notificationEventTypeSchema>;
export type NotificationOutboxStatus = z.infer<typeof notificationOutboxStatusSchema>;
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type PaymentProviderObjectType = z.infer<typeof paymentProviderObjectTypeSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type IdentityProvider = z.infer<typeof identityProviderSchema>;
export type IdentityTenantConflictCode = z.infer<typeof identityTenantConflictCodeSchema>;
export type LocalityStatus = z.infer<typeof localityStatusSchema>;
export type DeliverableRequirementType = z.infer<typeof deliverableRequirementTypeSchema>;
export type MediaAssetStatus = z.infer<typeof mediaAssetStatusSchema>;
export type MediaOrientation = z.infer<typeof mediaOrientationSchema>;
export type SubmissionEvidenceKind = z.infer<typeof submissionEvidenceKindSchema>;
export type MissionApplicationConflictCode = z.infer<typeof missionApplicationConflictCodeSchema>;
export type MissionApplicationRecord = z.infer<typeof missionApplicationRecordSchema>;
export type MissionApplicationStatus = z.infer<typeof missionApplicationStatusSchema>;
export type MissionAssignmentRecord = z.infer<typeof missionAssignmentRecordSchema>;
export type MissionAssignmentStatus = z.infer<typeof missionAssignmentStatusSchema>;
export type MissionSlotStatus = z.infer<typeof missionSlotStatusSchema>;
export type MissionSlotType = z.infer<typeof missionSlotTypeSchema>;
export type MissionTemplateCode = z.infer<typeof missionTemplateCodeSchema>;
export type PayoutOnboardingStatus = z.infer<typeof payoutOnboardingStatusSchema>;
export type PlatformStaffRole = z.infer<typeof platformStaffRoleSchema>;
export type PlatformStaffStatus = z.infer<typeof platformStaffStatusSchema>;
export type ReachLevel = z.infer<typeof reachLevelSchema>;
export type SlotReservationStatus = z.infer<typeof slotReservationStatusSchema>;
export type SubmissionConflictCode = z.infer<typeof submissionConflictCodeSchema>;
export type SubmissionReviewDecisionType = z.infer<typeof submissionReviewDecisionTypeSchema>;
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type VenueStaffAssignmentStatus = z.infer<typeof venueStaffAssignmentStatusSchema>;
