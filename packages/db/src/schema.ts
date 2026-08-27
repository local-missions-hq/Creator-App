import { sql } from 'drizzle-orm';
import {
  check,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const campaignStatusValues = [
  'draft',
  'submitted',
  'approved',
  'funded',
  'published',
  'canceled',
] as const;

export const campaignStatus = pgEnum('campaign_status', campaignStatusValues);
export const auditActorType = pgEnum('audit_actor_type', ['user', 'service', 'provider']);
export const identityProvider = pgEnum('identity_provider', [
  'apple',
  'google',
  'microsoft',
  'passwordless_email',
]);
export const userStatus = pgEnum('user_status', ['active', 'disabled', 'deletion_requested']);
export const creatorProfileStatus = pgEnum('creator_profile_status', [
  'invited',
  'onboarding',
  'approved',
  'paused',
  'denied',
]);
export const localityStatus = pgEnum('locality_status', [
  'unverified',
  'pending',
  'verified',
  'expired',
  'rejected',
]);
export const payoutOnboardingStatus = pgEnum('payout_onboarding_status', [
  'not_started',
  'pending',
  'ready',
  'restricted',
]);
export const businessMembershipRole = pgEnum('business_membership_role', [
  'owner',
  'manager',
  'venue_staff',
]);
export const businessMembershipStatus = pgEnum('business_membership_status', [
  'invited',
  'active',
  'disabled',
]);
export const missionTemplateCode = pgEnum('mission_template_code', [
  'visit_create',
  'visit_share',
  'event_attendance',
  'private_experience_feedback',
]);
export const missionTemplateStatus = pgEnum('mission_template_status', ['active', 'retired']);
export const missionSlotType = pgEnum('mission_slot_type', ['community', 'reach']);
export const missionSlotStatus = pgEnum('mission_slot_status', [
  'available',
  'reserved',
  'accepted',
  'in_progress',
  'completed',
  'no_payout',
  'canceled',
]);
export const reachLevel = pgEnum('reach_level', ['level_1', 'level_2', 'level_3']);
export const missionApplicationStatus = pgEnum('mission_application_status', [
  'submitted',
  'accepted',
  'completed',
  'no_payout',
  'withdrawn',
  'rejected',
  'expired',
  'canceled',
]);
export const slotReservationStatus = pgEnum('slot_reservation_status', [
  'active',
  'converted',
  'released',
  'expired',
]);
export const missionAssignmentStatus = pgEnum('mission_assignment_status', [
  'scheduled',
  'checked_in',
  'canceled',
  'completed',
  'no_payout',
]);
export const venueStaffAssignmentStatus = pgEnum('venue_staff_assignment_status', [
  'active',
  'revoked',
]);
export const checkInChallengeMethod = pgEnum('check_in_challenge_method', ['qr', 'staff_code']);
export const checkInChallengeStatus = pgEnum('check_in_challenge_status', [
  'active',
  'consumed',
  'expired',
  'revoked',
]);
export const checkInAccuracyClass = pgEnum('check_in_accuracy_class', [
  'unavailable',
  'coarse',
  'precise',
]);
export const deliverableRequirementType = pgEnum('deliverable_requirement_type', [
  'photo',
  'raw_clip',
  'edited_video',
  'social_post',
  'private_response',
  'attendance_proof',
]);
export const mediaOrientation = pgEnum('media_orientation', ['any', 'portrait_9_16']);
export const mediaAssetStatus = pgEnum('media_asset_status', [
  'pending_scan',
  'verified',
  'quarantined',
  'rejected',
]);
export const submissionEvidenceKind = pgEnum('submission_evidence_kind', [
  'platform_post',
  'structured_response',
  'check_in_reference',
]);
export const submissionStatus = pgEnum('submission_status', [
  'under_review',
  'correction_requested',
  'approved',
  'auto_approved',
  'disputed',
  'resolved_approved',
  'resolved_no_payout',
]);
export const submissionReviewDecisionType = pgEnum('submission_review_decision_type', [
  'approved',
  'correction_requested',
  'auto_approved',
]);
export const correctionReasonCode = pgEnum('correction_reason_code', [
  'missing_count',
  'corrupt_file',
  'duration_out_of_range',
  'wrong_orientation',
  'insufficient_resolution',
  'wrong_subject',
  'unrelated_brand_watermark',
  'missing_disclosure',
]);
export const platformStaffRole = pgEnum('platform_staff_role', [
  'dispute_reviewer',
  'finance_operator',
  'verification_reviewer',
  'trust_safety_reviewer',
  'admin',
]);
export const platformStaffStatus = pgEnum('platform_staff_status', ['active', 'revoked']);
export const disputeOpenedBy = pgEnum('dispute_opened_by', ['creator', 'business']);
export const disputeReasonCode = pgEnum('dispute_reason_code', [
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
export const disputeEvidenceKind = pgEnum('dispute_evidence_kind', [
  'deliverable_requirement',
  'media_asset',
  'check_in_event',
  'correction_request',
  'submission_attempt',
  'submission_evidence',
]);
export const disputeStatus = pgEnum('dispute_status', [
  'open',
  'resolved_earned_full',
  'resolved_no_payout',
]);
export const disputeResolutionOutcome = pgEnum('dispute_resolution_outcome', [
  'earned_full',
  'no_payout',
]);
export const financialActionIntentSourceType = pgEnum('financial_action_intent_source_type', [
  'submission_approval',
  'dispute_resolution',
]);
export const financialActionIntentType = pgEnum('financial_action_intent_type', [
  'creator_payable_full',
  'slot_refund_full',
]);
export const financialActionIntentStatus = pgEnum('financial_action_intent_status', [
  'pending_ledger',
  'posted',
]);
export const paymentProvider = pgEnum('payment_provider', ['stripe']);
export const paymentProviderObjectType = pgEnum('payment_provider_object_type', [
  'payment_intent',
  'charge',
  'transfer',
  'refund',
  'payout',
  'dispute',
]);
export const ledgerAccountCode = pgEnum('ledger_account_code', [
  'provider_clearing',
  'campaign_funds',
  'creator_payable',
  'business_refund_payable',
  'platform_fee_revenue',
  'finance_adjustment_control',
]);
export const ledgerTransactionType = pgEnum('ledger_transaction_type', [
  'campaign_funding',
  'slot_completion',
  'slot_refund',
  'finance_adjustment',
]);
export const ledgerTransactionSourceType = pgEnum('ledger_transaction_source_type', [
  'provider_funding',
  'financial_action_intent',
  'finance_adjustment',
]);
export const ledgerEntryDirection = pgEnum('ledger_entry_direction', ['debit', 'credit']);
export const localPassOfferStatus = pgEnum('local_pass_offer_status', [
  'configured',
  'active',
  'claims_paused',
  'closed',
]);
export const localPassLinkStatus = pgEnum('local_pass_link_status', ['active', 'revoked']);
export const localPassClaimStatus = pgEnum('local_pass_claim_status', [
  'active',
  'redeemed',
  'expired',
]);
export const localPassClaimTokenStatus = pgEnum('local_pass_claim_token_status', [
  'active',
  'consumed',
  'expired',
  'revoked',
]);
export const localPassEvidenceKind = pgEnum('local_pass_evidence_kind', [
  'link_open',
  'pass_claimed',
  'verified_pass_redemption',
]);
export const localPassFulfillmentKind = pgEnum('local_pass_fulfillment_kind', [
  'original_offer',
  'preapproved_substitute',
  'customer_accepted_substitute',
]);
export const localPassChallengePurpose = pgEnum('local_pass_challenge_purpose', [
  'claim',
  'recovery',
  'refusal_report',
  'substitute_acceptance',
  'status_access',
]);
export const localPassChallengeStatus = pgEnum('local_pass_challenge_status', [
  'pending',
  'verified',
  'consumed',
  'superseded',
  'locked',
  'expired',
]);
export const localPassIncidentReason = pgEnum('local_pass_incident_reason', [
  'offer_refused',
  'incorrect_substitute',
  'incorrect_redemption',
]);
export const localPassIncidentStatus = pgEnum('local_pass_incident_status', [
  'open',
  'confirmed',
  'dismissed',
]);
export const legalDocumentType = pgEnum('legal_document_type', [
  'creator_terms',
  'sponsorship_disclosure',
]);
export const contentLicenseKind = pgEnum('content_license_kind', [
  'organic_owned_social_90d',
  'extended_owned_media_12m',
  'paid_advertising_30d',
]);
export const contentLicenseStatus = pgEnum('content_license_status', [
  'active',
  'expired',
  'suspended',
  'revoked',
]);
export const contentLicenseChannel = pgEnum('content_license_channel', [
  'owned_social',
  'business_website',
  'business_email',
  'paid_advertising',
]);
export const notificationEventType = pgEnum('notification_event_type', [
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
export const notificationCategory = pgEnum('notification_category', [
  'mission_action',
  'mission_reminder',
  'money',
  'dispute',
  'security',
]);
export const notificationAudience = pgEnum('notification_audience', [
  'creator',
  'business_member',
  'platform_staff',
  'account_owner',
]);
export const notificationChannel = pgEnum('notification_channel', ['in_app', 'push', 'email']);
export const notificationAggregateType = pgEnum('notification_aggregate_type', [
  'user',
  'mission_application',
  'mission_assignment',
]);
export const notificationOutboxStatus = pgEnum('notification_outbox_status', [
  'pending',
  'processing',
  'completed',
  'dead_letter',
]);
export const notificationDeliveryStatus = pgEnum('notification_delivery_status', [
  'suppressed',
  'no_send',
  'failed',
  'delivered',
]);
export const localityVerificationMethod = pgEnum('locality_verification_method', [
  'utility_bill',
  'lease_or_mortgage',
  'government_mail',
  'accessible_manual_review',
]);
export const localityVerificationStatus = pgEnum('locality_verification_status', [
  'pending_review',
  'correction_needed',
  'verified',
  'rejected',
  'appeal_pending',
  'final_rejected',
  'expired',
  'invalidated',
]);
export const localityReviewReason = pgEnum('locality_review_reason', [
  'approved',
  'unreadable',
  'document_too_old',
  'postal_area_mismatch',
  'unsupported_proof',
  'ineligible_area',
  'suspected_tampering',
]);
export const localityAppealReason = pgEnum('locality_appeal_reason', [
  'review_error',
  'accessibility_issue',
  'newer_evidence',
]);
export const localityEvidenceDeletionStatus = pgEnum('locality_evidence_deletion_status', [
  'pending',
  'processing',
  'completed',
  'dead_letter',
]);
export const localityEvidenceDeletionOutcome = pgEnum('locality_evidence_deletion_outcome', [
  'deleted',
  'no_object',
  'failed',
]);
export const localityLegalHoldReason = pgEnum('locality_legal_hold_reason', [
  'binding_legal_request',
  'litigation_preservation',
  'security_incident',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    status: userStatus('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('users_public_id_uq').on(table.publicId),
    check('users_public_id_nonempty_ck', sql`length(btrim(${table.publicId})) > 0`),
    check('users_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const externalIdentities = pgTable(
  'external_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    provider: identityProvider('provider').notNull(),
    issuer: text('issuer').notNull(),
    subject: text('subject').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('external_identities_issuer_subject_uq').on(table.issuer, table.subject),
    uniqueIndex('external_identities_user_provider_uq').on(table.userId, table.provider),
    index('external_identities_user_idx').on(table.userId),
    check('external_identities_issuer_nonempty_ck', sql`length(btrim(${table.issuer})) > 0`),
    check('external_identities_subject_nonempty_ck', sql`length(btrim(${table.subject})) > 0`),
  ],
);

export const creatorProfiles = pgTable(
  'creator_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'restrict' }),
    publicId: text('public_id').notNull(),
    status: creatorProfileStatus('status').default('invited').notNull(),
    localityStatus: localityStatus('locality_status').default('unverified').notNull(),
    verifiedPostalArea: text('verified_postal_area'),
    localityVerifiedAt: timestamp('locality_verified_at', { withTimezone: true }),
    localityExpiresAt: timestamp('locality_expires_at', { withTimezone: true }),
    payoutOnboardingStatus: payoutOnboardingStatus('payout_onboarding_status')
      .default('not_started')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('creator_profiles_public_id_uq').on(table.publicId),
    index('creator_profiles_locality_status_idx').on(table.localityStatus),
    check(
      'creator_profiles_postal_area_ck',
      sql`${table.verifiedPostalArea} IS NULL OR ${table.verifiedPostalArea} ~ '^[0-9]{5}$'`,
    ),
    check(
      'creator_profiles_verified_locality_ck',
      sql`${table.localityStatus} <> 'verified' OR (
        ${table.verifiedPostalArea} IS NOT NULL AND
        ${table.localityVerifiedAt} IS NOT NULL AND
        ${table.localityExpiresAt} > ${table.localityVerifiedAt}
      )`,
    ),
    check('creator_profiles_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('businesses_public_id_uq').on(table.publicId),
    check('businesses_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const businessMemberships = pgTable(
  'business_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: businessMembershipRole('role').notNull(),
    status: businessMembershipStatus('status').default('invited').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('business_memberships_business_user_uq').on(table.businessId, table.userId),
    index('business_memberships_user_status_idx').on(table.userId, table.status),
    check('business_memberships_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const platformStaffMemberships = pgTable(
  'platform_staff_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: platformStaffRole('role').notNull(),
    status: platformStaffStatus('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('platform_staff_memberships_public_id_uq').on(table.publicId),
    uniqueIndex('platform_staff_memberships_user_uq').on(table.userId),
    index('platform_staff_memberships_role_status_idx').on(table.role, table.status),
    check('platform_staff_memberships_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const businessLocations = pgTable(
  'business_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    addressLine1: text('address_line_1').notNull(),
    addressLine2: text('address_line_2'),
    city: text('city').notNull(),
    region: text('region').notNull(),
    postalCode: text('postal_code').notNull(),
    timezone: text('timezone').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('business_locations_public_id_uq').on(table.publicId),
    index('business_locations_business_active_idx').on(table.businessId, table.isActive),
    check('business_locations_name_nonempty_ck', sql`length(btrim(${table.name})) > 0`),
    check('business_locations_region_ck', sql`${table.region} ~ '^[A-Z]{2}$'`),
    check('business_locations_postal_code_ck', sql`${table.postalCode} ~ '^[0-9]{5}$'`),
    check('business_locations_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    status: campaignStatus('status').default('draft').notNull(),
    creatorRewardPoolMinor: integer('creator_reward_pool_minor').notNull(),
    platformFeeMinor: integer('platform_fee_minor').notNull(),
    totalDueMinor: integer('total_due_minor').notNull(),
    currency: text('currency').default('USD').notNull(),
    slotCount: integer('slot_count').notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('campaigns_public_id_uq').on(table.publicId),
    index('campaigns_business_status_idx').on(table.businessId, table.status),
    check('campaigns_reward_pool_nonnegative_ck', sql`${table.creatorRewardPoolMinor} >= 0`),
    check('campaigns_platform_fee_nonnegative_ck', sql`${table.platformFeeMinor} >= 0`),
    check(
      'campaigns_total_due_matches_ck',
      sql`${table.totalDueMinor} = ${table.creatorRewardPoolMinor} + ${table.platformFeeMinor}`,
    ),
    check('campaigns_slot_count_pilot_ck', sql`${table.slotCount} BETWEEN 1 AND 20`),
    check('campaigns_version_positive_ck', sql`${table.version} > 0`),
    check('campaigns_currency_iso_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const campaignStatusHistory = pgTable(
  'campaign_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    fromStatus: campaignStatus('from_status'),
    toStatus: campaignStatus('to_status').notNull(),
    campaignVersion: integer('campaign_version').notNull(),
    actorId: uuid('actor_id'),
    reason: text('reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('campaign_status_history_version_uq').on(table.campaignId, table.campaignVersion),
    index('campaign_status_history_timeline_idx').on(table.campaignId, table.occurredAt),
    check('campaign_status_history_version_positive_ck', sql`${table.campaignVersion} > 0`),
  ],
);

export const missionTemplates = pgTable(
  'mission_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: missionTemplateCode('code').notNull(),
    version: integer('version').notNull(),
    name: text('name').notNull(),
    checklistSchema: jsonb('checklist_schema').$type<Record<string, unknown>>().notNull(),
    status: missionTemplateStatus('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mission_templates_code_version_uq').on(table.code, table.version),
    check('mission_templates_version_positive_ck', sql`${table.version} > 0`),
    check('mission_templates_name_nonempty_ck', sql`length(btrim(${table.name})) > 0`),
  ],
);

export const campaignBriefVersions = pgTable(
  'campaign_brief_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    version: integer('version').notNull(),
    missionTemplateId: uuid('mission_template_id')
      .notNull()
      .references(() => missionTemplates.id, { onDelete: 'restrict' }),
    plainLanguageBrief: text('plain_language_brief').notNull(),
    checklist: jsonb('checklist').$type<Record<string, unknown>>().notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('campaign_brief_versions_campaign_version_uq').on(table.campaignId, table.version),
    index('campaign_brief_versions_template_idx').on(table.missionTemplateId),
    check('campaign_brief_versions_version_positive_ck', sql`${table.version} > 0`),
    check(
      'campaign_brief_versions_plain_brief_nonempty_ck',
      sql`length(btrim(${table.plainLanguageBrief})) > 0`,
    ),
  ],
);

export const deliverableRequirements = pgTable(
  'deliverable_requirements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    campaignBriefVersionId: uuid('campaign_brief_version_id')
      .notNull()
      .references(() => campaignBriefVersions.id, { onDelete: 'restrict' }),
    ordinal: integer('ordinal').notNull(),
    type: deliverableRequirementType('type').notNull(),
    requiredCount: integer('required_count').notNull(),
    allowedMimeTypes: jsonb('allowed_mime_types').$type<string[]>().notNull(),
    minDurationSeconds: integer('min_duration_seconds'),
    maxDurationSeconds: integer('max_duration_seconds'),
    orientation: mediaOrientation('orientation').default('any').notNull(),
    minWidthPixels: integer('min_width_pixels').default(0).notNull(),
    minHeightPixels: integer('min_height_pixels').default(0).notNull(),
    requiresDisclosure: boolean('requires_disclosure').default(false).notNull(),
    objectiveDescription: text('objective_description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('deliverable_requirements_public_id_uq').on(table.publicId),
    uniqueIndex('deliverable_requirements_brief_ordinal_uq').on(
      table.campaignBriefVersionId,
      table.ordinal,
    ),
    index('deliverable_requirements_brief_type_idx').on(table.campaignBriefVersionId, table.type),
    check('deliverable_requirements_ordinal_positive_ck', sql`${table.ordinal} > 0`),
    check('deliverable_requirements_count_positive_ck', sql`${table.requiredCount} > 0`),
    check(
      'deliverable_requirements_mime_types_ck',
      sql`jsonb_typeof(${table.allowedMimeTypes}) = 'array' AND jsonb_array_length(${table.allowedMimeTypes}) > 0`,
    ),
    check(
      'deliverable_requirements_duration_ck',
      sql`(${table.minDurationSeconds} IS NULL AND ${table.maxDurationSeconds} IS NULL) OR
          (${table.minDurationSeconds} > 0 AND ${table.maxDurationSeconds} >= ${table.minDurationSeconds})`,
    ),
    check(
      'deliverable_requirements_dimensions_ck',
      sql`${table.minWidthPixels} >= 0 AND ${table.minHeightPixels} >= 0`,
    ),
    check(
      'deliverable_requirements_description_nonempty_ck',
      sql`length(btrim(${table.objectiveDescription})) > 0`,
    ),
  ],
);

export const missionSlots = pgTable(
  'mission_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    ordinal: integer('ordinal').notNull(),
    type: missionSlotType('type').notNull(),
    status: missionSlotStatus('status').default('available').notNull(),
    baseRewardMinor: integer('base_reward_minor').notNull(),
    reachBonusMinor: integer('reach_bonus_minor').default(0).notNull(),
    contractAddOnBonusMinor: integer('contract_add_on_bonus_minor').default(0).notNull(),
    bonusRewardMinor: integer('bonus_reward_minor').default(0).notNull(),
    rewardMinor: integer('reward_minor').notNull(),
    reachLevel: reachLevel('reach_level'),
    currency: text('currency').default('USD').notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mission_slots_public_id_uq').on(table.publicId),
    uniqueIndex('mission_slots_campaign_ordinal_uq').on(table.campaignId, table.ordinal),
    index('mission_slots_campaign_status_type_idx').on(table.campaignId, table.status, table.type),
    check('mission_slots_ordinal_positive_ck', sql`${table.ordinal} > 0`),
    check('mission_slots_base_reward_positive_ck', sql`${table.baseRewardMinor} > 0`),
    check(
      'mission_slots_bonus_nonnegative_ck',
      sql`${table.reachBonusMinor} >= 0 AND ${table.contractAddOnBonusMinor} >= 0
          AND ${table.bonusRewardMinor} >= 0`,
    ),
    check(
      'mission_slots_bonus_components_ck',
      sql`${table.bonusRewardMinor} = ${table.reachBonusMinor} + ${table.contractAddOnBonusMinor}`,
    ),
    check(
      'mission_slots_reward_total_ck',
      sql`${table.rewardMinor} = ${table.baseRewardMinor} + ${table.bonusRewardMinor}`,
    ),
    check(
      'mission_slots_community_reach_ck',
      sql`(
        ${table.type} = 'community' AND ${table.reachLevel} IS NULL AND ${table.reachBonusMinor} = 0
      ) OR (
        ${table.type} = 'reach' AND ${table.reachLevel} IS NOT NULL AND ${table.reachBonusMinor} > 0
      )`,
    ),
    check(
      'mission_slots_reach_bonus_ck',
      sql`${table.type} = 'community' OR (
        (${table.reachLevel} = 'level_1' AND ${table.reachBonusMinor} * 2 = ${table.baseRewardMinor}) OR
        (${table.reachLevel} = 'level_2' AND ${table.reachBonusMinor} = ${table.baseRewardMinor}) OR
        (${table.reachLevel} = 'level_3' AND ${table.reachBonusMinor} = ${table.baseRewardMinor} * 2)
      )`,
    ),
    check('mission_slots_currency_iso_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check('mission_slots_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const missionApplications = pgTable(
  'mission_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: missionApplicationStatus('status').default('submitted').notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mission_applications_public_id_uq').on(table.publicId),
    uniqueIndex('mission_applications_campaign_creator_uq').on(
      table.campaignId,
      table.creatorUserId,
    ),
    index('mission_applications_campaign_status_idx').on(table.campaignId, table.status),
    check('mission_applications_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const slotReservations = pgTable(
  'slot_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    missionSlotId: uuid('mission_slot_id')
      .notNull()
      .references(() => missionSlots.id, { onDelete: 'restrict' }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => missionApplications.id, { onDelete: 'restrict' }),
    status: slotReservationStatus('status').default('active').notNull(),
    reservedAt: timestamp('reserved_at', { withTimezone: true }).defaultNow().notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('slot_reservations_application_uq').on(table.applicationId),
    uniqueIndex('slot_reservations_live_slot_uq')
      .on(table.missionSlotId)
      .where(sql`${table.status} IN ('active', 'converted')`),
    index('slot_reservations_slot_status_idx').on(table.missionSlotId, table.status),
    check(
      'slot_reservations_release_ck',
      sql`(${table.status} IN ('active', 'converted') AND ${table.releasedAt} IS NULL) OR
          (${table.status} IN ('released', 'expired') AND ${table.releasedAt} IS NOT NULL)`,
    ),
  ],
);

export const missionApplicationStatusHistory = pgTable(
  'mission_application_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => missionApplications.id, { onDelete: 'restrict' }),
    fromStatus: missionApplicationStatus('from_status'),
    toStatus: missionApplicationStatus('to_status').notNull(),
    applicationVersion: integer('application_version').notNull(),
    actorId: uuid('actor_id'),
    actorType: auditActorType('actor_type').default('user').notNull(),
    reason: text('reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mission_application_status_history_version_uq').on(
      table.applicationId,
      table.applicationVersion,
    ),
    index('mission_application_status_history_timeline_idx').on(
      table.applicationId,
      table.occurredAt,
    ),
    check(
      'mission_application_status_history_version_positive_ck',
      sql`${table.applicationVersion} > 0`,
    ),
  ],
);

export const missionAssignments = pgTable(
  'mission_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => missionApplications.id, { onDelete: 'restrict' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    campaignBriefVersionId: uuid('campaign_brief_version_id')
      .notNull()
      .references(() => campaignBriefVersions.id, { onDelete: 'restrict' }),
    missionSlotId: uuid('mission_slot_id')
      .notNull()
      .references(() => missionSlots.id, { onDelete: 'restrict' }),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    businessLocationId: uuid('business_location_id')
      .notNull()
      .references(() => businessLocations.id, { onDelete: 'restrict' }),
    windowStartsAt: timestamp('window_starts_at', { withTimezone: true }).notNull(),
    windowEndsAt: timestamp('window_ends_at', { withTimezone: true }).notNull(),
    timezone: text('timezone').notNull(),
    status: missionAssignmentStatus('status').default('scheduled').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mission_assignments_public_id_uq').on(table.publicId),
    uniqueIndex('mission_assignments_application_uq').on(table.applicationId),
    uniqueIndex('mission_assignments_slot_uq').on(table.missionSlotId),
    index('mission_assignments_creator_status_idx').on(table.creatorUserId, table.status),
    index('mission_assignments_location_window_idx').on(
      table.businessLocationId,
      table.windowStartsAt,
      table.windowEndsAt,
    ),
    check('mission_assignments_window_ck', sql`${table.windowEndsAt} > ${table.windowStartsAt}`),
    check('mission_assignments_timezone_nonempty_ck', sql`length(btrim(${table.timezone})) > 0`),
    check('mission_assignments_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const missionAssignmentStatusHistory = pgTable(
  'mission_assignment_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    fromStatus: missionAssignmentStatus('from_status'),
    toStatus: missionAssignmentStatus('to_status').notNull(),
    assignmentVersion: integer('assignment_version').notNull(),
    actorId: uuid('actor_id'),
    actorType: auditActorType('actor_type').default('user').notNull(),
    reason: text('reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mission_assignment_status_history_version_uq').on(
      table.missionAssignmentId,
      table.assignmentVersion,
    ),
    index('mission_assignment_status_history_timeline_idx').on(
      table.missionAssignmentId,
      table.occurredAt,
    ),
    check(
      'mission_assignment_status_history_version_positive_ck',
      sql`${table.assignmentVersion} > 0`,
    ),
  ],
);

export const venueStaffAssignments = pgTable(
  'venue_staff_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    businessMembershipId: uuid('business_membership_id')
      .notNull()
      .references(() => businessMemberships.id, { onDelete: 'restrict' }),
    businessLocationId: uuid('business_location_id')
      .notNull()
      .references(() => businessLocations.id, { onDelete: 'restrict' }),
    windowStartsAt: timestamp('window_starts_at', { withTimezone: true }).notNull(),
    windowEndsAt: timestamp('window_ends_at', { withTimezone: true }).notNull(),
    status: venueStaffAssignmentStatus('status').default('active').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('venue_staff_assignments_public_id_uq').on(table.publicId),
    uniqueIndex('venue_staff_assignments_scope_uq').on(
      table.businessMembershipId,
      table.businessLocationId,
      table.windowStartsAt,
      table.windowEndsAt,
    ),
    index('venue_staff_assignments_location_window_idx').on(
      table.businessLocationId,
      table.windowStartsAt,
      table.windowEndsAt,
      table.status,
    ),
    check(
      'venue_staff_assignments_window_ck',
      sql`${table.windowEndsAt} > ${table.windowStartsAt}`,
    ),
  ],
);

export const checkInChallenges = pgTable(
  'check_in_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    tokenHash: text('token_hash').notNull(),
    method: checkInChallengeMethod('method').notNull(),
    status: checkInChallengeStatus('status').default('active').notNull(),
    fallbackReason: text('fallback_reason'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('check_in_challenges_public_id_uq').on(table.publicId),
    uniqueIndex('check_in_challenges_token_hash_uq').on(table.tokenHash),
    uniqueIndex('check_in_challenges_active_assignment_uq')
      .on(table.missionAssignmentId)
      .where(sql`${table.status} = 'active'`),
    index('check_in_challenges_assignment_timeline_idx').on(
      table.missionAssignmentId,
      table.createdAt,
    ),
    check('check_in_challenges_expiry_ck', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'check_in_challenges_fallback_reason_ck',
      sql`(${table.method} = 'qr' AND ${table.fallbackReason} IS NULL) OR
          (${table.method} = 'staff_code' AND length(btrim(${table.fallbackReason})) > 0)`,
    ),
    check(
      'check_in_challenges_consumed_at_ck',
      sql`(${table.status} = 'consumed' AND ${table.consumedAt} IS NOT NULL) OR
          (${table.status} <> 'consumed' AND ${table.consumedAt} IS NULL)`,
    ),
  ],
);

export const checkInEvents = pgTable(
  'check_in_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => checkInChallenges.id, { onDelete: 'restrict' }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => missionApplications.id, { onDelete: 'restrict' }),
    missionSlotId: uuid('mission_slot_id')
      .notNull()
      .references(() => missionSlots.id, { onDelete: 'restrict' }),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    businessLocationId: uuid('business_location_id')
      .notNull()
      .references(() => businessLocations.id, { onDelete: 'restrict' }),
    verificationMethod: checkInChallengeMethod('verification_method').notNull(),
    accuracyClass: checkInAccuracyClass('accuracy_class').default('unavailable').notNull(),
    derivedStatement: text('derived_statement').notNull(),
    verifiedByUserId: uuid('verified_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('check_in_events_public_id_uq').on(table.publicId),
    uniqueIndex('check_in_events_assignment_uq').on(table.missionAssignmentId),
    uniqueIndex('check_in_events_challenge_uq').on(table.challengeId),
    index('check_in_events_location_timeline_idx').on(table.businessLocationId, table.occurredAt),
    check(
      'check_in_events_derived_statement_nonempty_ck',
      sql`length(btrim(${table.derivedStatement})) > 0`,
    ),
  ],
);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    storageObjectKey: text('storage_object_key').notNull(),
    checksumSha256: text('checksum_sha256').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    durationSeconds: integer('duration_seconds'),
    widthPixels: integer('width_pixels').notNull(),
    heightPixels: integer('height_pixels').notNull(),
    orientation: mediaOrientation('orientation').notNull(),
    status: mediaAssetStatus('status').default('pending_scan').notNull(),
    validationReason: text('validation_reason'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('media_assets_public_id_uq').on(table.publicId),
    uniqueIndex('media_assets_creator_object_uq').on(table.creatorUserId, table.storageObjectKey),
    uniqueIndex('media_assets_assignment_checksum_uq').on(
      table.missionAssignmentId,
      table.checksumSha256,
    ),
    index('media_assets_assignment_status_idx').on(table.missionAssignmentId, table.status),
    check('media_assets_object_key_nonempty_ck', sql`length(btrim(${table.storageObjectKey})) > 0`),
    check('media_assets_checksum_sha256_ck', sql`${table.checksumSha256} ~ '^[a-f0-9]{64}$'`),
    check('media_assets_mime_type_nonempty_ck', sql`length(btrim(${table.mimeType})) > 0`),
    check('media_assets_byte_size_positive_ck', sql`${table.byteSize} > 0`),
    check(
      'media_assets_duration_positive_ck',
      sql`${table.durationSeconds} IS NULL OR ${table.durationSeconds} > 0`,
    ),
    check(
      'media_assets_dimensions_positive_ck',
      sql`${table.widthPixels} > 0 AND ${table.heightPixels} > 0`,
    ),
    check(
      'media_assets_validation_state_ck',
      sql`(${table.status} = 'pending_scan' AND ${table.validationReason} IS NULL AND ${table.verifiedAt} IS NULL) OR
          (${table.status} = 'verified' AND ${table.validationReason} IS NULL AND ${table.verifiedAt} IS NOT NULL) OR
          (${table.status} IN ('quarantined', 'rejected') AND length(btrim(${table.validationReason})) > 0 AND ${table.verifiedAt} IS NULL)`,
    ),
  ],
);

export const submissionAttempts = pgTable(
  'submission_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    attemptNumber: integer('attempt_number').notNull(),
    status: submissionStatus('status').default('under_review').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
    reviewDeadlineAt: timestamp('review_deadline_at', { withTimezone: true }).notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('submission_attempts_public_id_uq').on(table.publicId),
    uniqueIndex('submission_attempts_assignment_number_uq').on(
      table.missionAssignmentId,
      table.attemptNumber,
    ),
    index('submission_attempts_review_queue_idx').on(table.status, table.reviewDeadlineAt),
    check('submission_attempts_number_ck', sql`${table.attemptNumber} BETWEEN 1 AND 2`),
    check(
      'submission_attempts_review_deadline_ck',
      sql`${table.reviewDeadlineAt} = ${table.submittedAt} + interval '48 hours'`,
    ),
    check('submission_attempts_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const submissionAssets = pgTable(
  'submission_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionAttemptId: uuid('submission_attempt_id')
      .notNull()
      .references(() => submissionAttempts.id, { onDelete: 'restrict' }),
    deliverableRequirementId: uuid('deliverable_requirement_id')
      .notNull()
      .references(() => deliverableRequirements.id, { onDelete: 'restrict' }),
    mediaAssetId: uuid('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('submission_assets_attempt_asset_uq').on(
      table.submissionAttemptId,
      table.mediaAssetId,
    ),
    uniqueIndex('submission_assets_attempt_requirement_position_uq').on(
      table.submissionAttemptId,
      table.deliverableRequirementId,
      table.position,
    ),
    index('submission_assets_requirement_idx').on(table.deliverableRequirementId),
    check('submission_assets_position_positive_ck', sql`${table.position} > 0`),
  ],
);

export const submissionEvidence = pgTable(
  'submission_evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionAttemptId: uuid('submission_attempt_id')
      .notNull()
      .references(() => submissionAttempts.id, { onDelete: 'restrict' }),
    deliverableRequirementId: uuid('deliverable_requirement_id')
      .notNull()
      .references(() => deliverableRequirements.id, { onDelete: 'restrict' }),
    kind: submissionEvidenceKind('kind').notNull(),
    position: integer('position').notNull(),
    evidenceData: jsonb('evidence_data').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('submission_evidence_attempt_requirement_position_uq').on(
      table.submissionAttemptId,
      table.deliverableRequirementId,
      table.position,
    ),
    index('submission_evidence_requirement_idx').on(table.deliverableRequirementId),
    check('submission_evidence_position_positive_ck', sql`${table.position} > 0`),
    check('submission_evidence_object_ck', sql`jsonb_typeof(${table.evidenceData}) = 'object'`),
  ],
);

export const submissionStatusHistory = pgTable(
  'submission_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionAttemptId: uuid('submission_attempt_id')
      .notNull()
      .references(() => submissionAttempts.id, { onDelete: 'restrict' }),
    fromStatus: submissionStatus('from_status'),
    toStatus: submissionStatus('to_status').notNull(),
    submissionVersion: integer('submission_version').notNull(),
    actorId: uuid('actor_id'),
    actorType: auditActorType('actor_type').notNull(),
    reason: text('reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('submission_status_history_version_uq').on(
      table.submissionAttemptId,
      table.submissionVersion,
    ),
    index('submission_status_history_timeline_idx').on(table.submissionAttemptId, table.occurredAt),
    check('submission_status_history_version_positive_ck', sql`${table.submissionVersion} > 0`),
  ],
);

export const correctionRequests = pgTable(
  'correction_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    sourceSubmissionAttemptId: uuid('source_submission_attempt_id')
      .notNull()
      .references(() => submissionAttempts.id, { onDelete: 'restrict' }),
    deliverableRequirementId: uuid('deliverable_requirement_id')
      .notNull()
      .references(() => deliverableRequirements.id, { onDelete: 'restrict' }),
    reasonCode: correctionReasonCode('reason_code').notNull(),
    explanation: text('explanation').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('correction_requests_public_id_uq').on(table.publicId),
    uniqueIndex('correction_requests_assignment_uq').on(table.missionAssignmentId),
    uniqueIndex('correction_requests_source_submission_uq').on(table.sourceSubmissionAttemptId),
    check(
      'correction_requests_explanation_nonempty_ck',
      sql`length(btrim(${table.explanation})) > 0`,
    ),
    check('correction_requests_due_after_created_ck', sql`${table.dueAt} > ${table.createdAt}`),
  ],
);

export const submissionReviewDecisions = pgTable(
  'submission_review_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    submissionAttemptId: uuid('submission_attempt_id')
      .notNull()
      .references(() => submissionAttempts.id, { onDelete: 'restrict' }),
    decision: submissionReviewDecisionType('decision').notNull(),
    reasonCode: correctionReasonCode('reason_code'),
    explanation: text('explanation'),
    actorId: uuid('actor_id'),
    actorType: auditActorType('actor_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('submission_review_decisions_public_id_uq').on(table.publicId),
    uniqueIndex('submission_review_decisions_submission_uq').on(table.submissionAttemptId),
    index('submission_review_decisions_timeline_idx').on(table.occurredAt),
    check(
      'submission_review_decisions_reason_ck',
      sql`(${table.decision} = 'correction_requested' AND ${table.reasonCode} IS NOT NULL AND length(btrim(${table.explanation})) > 0) OR
          (${table.decision} IN ('approved', 'auto_approved') AND ${table.reasonCode} IS NULL)`,
    ),
    check(
      'submission_review_decisions_actor_ck',
      sql`(${table.actorType} = 'user' AND ${table.actorId} IS NOT NULL) OR
          (${table.actorType} = 'service' AND ${table.actorId} IS NULL)`,
    ),
  ],
);

export const submissionDisputes = pgTable(
  'submission_disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    submissionAttemptId: uuid('submission_attempt_id')
      .notNull()
      .references(() => submissionAttempts.id, { onDelete: 'restrict' }),
    correctionRequestId: uuid('correction_request_id').references(() => correctionRequests.id, {
      onDelete: 'restrict',
    }),
    deliverableRequirementId: uuid('deliverable_requirement_id')
      .notNull()
      .references(() => deliverableRequirements.id, { onDelete: 'restrict' }),
    openedBy: disputeOpenedBy('opened_by').notNull(),
    openedByUserId: uuid('opened_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reasonCode: disputeReasonCode('reason_code').notNull(),
    explanation: text('explanation').notNull(),
    status: disputeStatus('status').default('open').notNull(),
    version: integer('version').default(1).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('submission_disputes_public_id_uq').on(table.publicId),
    uniqueIndex('submission_disputes_assignment_uq').on(table.missionAssignmentId),
    uniqueIndex('submission_disputes_submission_uq').on(table.submissionAttemptId),
    uniqueIndex('submission_disputes_correction_uq').on(table.correctionRequestId),
    index('submission_disputes_status_opened_idx').on(table.status, table.openedAt),
    check(
      'submission_disputes_explanation_nonempty_ck',
      sql`length(btrim(${table.explanation})) > 0`,
    ),
    check('submission_disputes_version_positive_ck', sql`${table.version} > 0`),
    check(
      'submission_disputes_resolution_time_ck',
      sql`(${table.status} = 'open' AND ${table.resolvedAt} IS NULL) OR
          (${table.status} <> 'open' AND ${table.resolvedAt} IS NOT NULL)`,
    ),
    check(
      'submission_disputes_opener_shape_ck',
      sql`(${table.openedBy} = 'creator' AND ${table.correctionRequestId} IS NOT NULL) OR
          (${table.openedBy} = 'business' AND ${table.correctionRequestId} IS NULL)`,
    ),
  ],
);

export const disputeEvidenceItems = pgTable(
  'dispute_evidence_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    disputeId: uuid('dispute_id')
      .notNull()
      .references(() => submissionDisputes.id, { onDelete: 'restrict' }),
    kind: disputeEvidenceKind('kind').notNull(),
    referenceId: uuid('reference_id').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('dispute_evidence_items_public_id_uq').on(table.publicId),
    uniqueIndex('dispute_evidence_items_dispute_position_uq').on(table.disputeId, table.position),
    uniqueIndex('dispute_evidence_items_dispute_reference_uq').on(
      table.disputeId,
      table.kind,
      table.referenceId,
    ),
    index('dispute_evidence_items_reference_idx').on(table.kind, table.referenceId),
    check('dispute_evidence_items_position_positive_ck', sql`${table.position} > 0`),
  ],
);

export const disputeStatusHistory = pgTable(
  'dispute_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disputeId: uuid('dispute_id')
      .notNull()
      .references(() => submissionDisputes.id, { onDelete: 'restrict' }),
    fromStatus: disputeStatus('from_status'),
    toStatus: disputeStatus('to_status').notNull(),
    disputeVersion: integer('dispute_version').notNull(),
    actorId: uuid('actor_id').notNull(),
    actorType: auditActorType('actor_type').default('user').notNull(),
    reason: text('reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('dispute_status_history_version_uq').on(table.disputeId, table.disputeVersion),
    index('dispute_status_history_timeline_idx').on(table.disputeId, table.occurredAt),
    check('dispute_status_history_version_positive_ck', sql`${table.disputeVersion} > 0`),
    check('dispute_status_history_user_actor_ck', sql`${table.actorType} = 'user'`),
  ],
);

export const disputeResolutions = pgTable(
  'dispute_resolutions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    disputeId: uuid('dispute_id')
      .notNull()
      .references(() => submissionDisputes.id, { onDelete: 'restrict' }),
    outcome: disputeResolutionOutcome('outcome').notNull(),
    explanation: text('explanation').notNull(),
    resolvedByUserId: uuid('resolved_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('dispute_resolutions_public_id_uq').on(table.publicId),
    uniqueIndex('dispute_resolutions_dispute_uq').on(table.disputeId),
    check(
      'dispute_resolutions_explanation_nonempty_ck',
      sql`length(btrim(${table.explanation})) > 0`,
    ),
  ],
);

export const financialActionIntents = pgTable(
  'financial_action_intents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    sourceType: financialActionIntentSourceType('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    action: financialActionIntentType('action').notNull(),
    status: financialActionIntentStatus('status').default('pending_ledger').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('financial_action_intents_public_id_uq').on(table.publicId),
    uniqueIndex('financial_action_intents_assignment_uq').on(table.missionAssignmentId),
    uniqueIndex('financial_action_intents_source_uq').on(table.sourceType, table.sourceId),
    index('financial_action_intents_status_created_idx').on(table.status, table.createdAt),
    check(
      'financial_action_intents_source_action_ck',
      sql`(${table.sourceType} = 'submission_approval' AND ${table.action} = 'creator_payable_full') OR
          (${table.sourceType} = 'dispute_resolution')`,
    ),
    check(
      'financial_action_intents_posted_shape_ck',
      sql`(${table.status} = 'pending_ledger' AND ${table.postedAt} IS NULL) OR
          (${table.status} = 'posted' AND ${table.postedAt} IS NOT NULL)`,
    ),
    check('financial_action_intents_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const paymentProviderReferences = pgTable(
  'payment_provider_references',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    provider: paymentProvider('provider').notNull(),
    providerAccountReference: text('provider_account_reference').notNull(),
    objectType: paymentProviderObjectType('object_type').notNull(),
    providerObjectId: text('provider_object_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('payment_provider_references_public_id_uq').on(table.publicId),
    uniqueIndex('payment_provider_references_object_uq').on(
      table.provider,
      table.providerAccountReference,
      table.objectType,
      table.providerObjectId,
    ),
    check(
      'payment_provider_references_account_nonempty_ck',
      sql`length(btrim(${table.providerAccountReference})) > 0`,
    ),
    check(
      'payment_provider_references_object_nonempty_ck',
      sql`length(btrim(${table.providerObjectId})) > 0`,
    ),
  ],
);

export const campaignFundingSnapshots = pgTable(
  'campaign_funding_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    paymentProviderReferenceId: uuid('payment_provider_reference_id')
      .notNull()
      .references(() => paymentProviderReferences.id, { onDelete: 'restrict' }),
    providerEventId: text('provider_event_id').notNull(),
    transferGroup: text('transfer_group').notNull(),
    creatorRewardPoolMinor: integer('creator_reward_pool_minor').notNull(),
    platformFeeMinor: integer('platform_fee_minor').notNull(),
    totalDueMinor: integer('total_due_minor').notNull(),
    currency: text('currency').notNull(),
    fundedAt: timestamp('funded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('campaign_funding_snapshots_public_id_uq').on(table.publicId),
    uniqueIndex('campaign_funding_snapshots_campaign_uq').on(table.campaignId),
    uniqueIndex('campaign_funding_snapshots_provider_reference_uq').on(
      table.paymentProviderReferenceId,
    ),
    uniqueIndex('campaign_funding_snapshots_provider_event_uq').on(table.providerEventId),
    uniqueIndex('campaign_funding_snapshots_transfer_group_uq').on(table.transferGroup),
    check(
      'campaign_funding_snapshots_total_ck',
      sql`${table.totalDueMinor} = ${table.creatorRewardPoolMinor} + ${table.platformFeeMinor}`,
    ),
    check(
      'campaign_funding_snapshots_amounts_positive_ck',
      sql`${table.creatorRewardPoolMinor} > 0 AND ${table.platformFeeMinor} > 0`,
    ),
    check('campaign_funding_snapshots_currency_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'campaign_funding_snapshots_provider_event_nonempty_ck',
      sql`length(btrim(${table.providerEventId})) > 0`,
    ),
    check(
      'campaign_funding_snapshots_transfer_group_nonempty_ck',
      sql`length(btrim(${table.transferGroup})) > 0`,
    ),
  ],
);

export const slotFundingAllocations = pgTable(
  'slot_funding_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    campaignFundingSnapshotId: uuid('campaign_funding_snapshot_id')
      .notNull()
      .references(() => campaignFundingSnapshots.id, { onDelete: 'restrict' }),
    missionSlotId: uuid('mission_slot_id')
      .notNull()
      .references(() => missionSlots.id, { onDelete: 'restrict' }),
    creatorRewardMinor: integer('creator_reward_minor').notNull(),
    platformFeeMinor: integer('platform_fee_minor').notNull(),
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('slot_funding_allocations_public_id_uq').on(table.publicId),
    uniqueIndex('slot_funding_allocations_slot_uq').on(table.missionSlotId),
    uniqueIndex('slot_funding_allocations_snapshot_slot_uq').on(
      table.campaignFundingSnapshotId,
      table.missionSlotId,
    ),
    index('slot_funding_allocations_snapshot_idx').on(table.campaignFundingSnapshotId),
    check(
      'slot_funding_allocations_total_ck',
      sql`${table.totalMinor} = ${table.creatorRewardMinor} + ${table.platformFeeMinor}`,
    ),
    check(
      'slot_funding_allocations_amounts_positive_ck',
      sql`${table.creatorRewardMinor} > 0 AND ${table.platformFeeMinor} > 0`,
    ),
    check('slot_funding_allocations_currency_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const ledgerAccounts = pgTable(
  'ledger_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    code: ledgerAccountCode('code').notNull(),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'restrict' }),
    creatorUserId: uuid('creator_user_id').references(() => users.id, { onDelete: 'restrict' }),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'restrict' }),
    currency: text('currency').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ledger_accounts_public_id_uq').on(table.publicId),
    uniqueIndex('ledger_accounts_platform_code_currency_uq')
      .on(table.code, table.currency)
      .where(
        sql`${table.campaignId} IS NULL AND ${table.creatorUserId} IS NULL AND ${table.businessId} IS NULL`,
      ),
    uniqueIndex('ledger_accounts_campaign_code_currency_uq')
      .on(table.code, table.campaignId, table.currency)
      .where(sql`${table.campaignId} IS NOT NULL`),
    uniqueIndex('ledger_accounts_creator_code_currency_uq')
      .on(table.code, table.creatorUserId, table.currency)
      .where(sql`${table.creatorUserId} IS NOT NULL`),
    uniqueIndex('ledger_accounts_business_code_currency_uq')
      .on(table.code, table.businessId, table.currency)
      .where(sql`${table.businessId} IS NOT NULL`),
    check('ledger_accounts_currency_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'ledger_accounts_scope_ck',
      sql`(
        ${table.code} IN ('provider_clearing', 'platform_fee_revenue', 'finance_adjustment_control')
        AND ${table.campaignId} IS NULL AND ${table.creatorUserId} IS NULL AND ${table.businessId} IS NULL
      ) OR (
        ${table.code} = 'campaign_funds' AND ${table.campaignId} IS NOT NULL
        AND ${table.creatorUserId} IS NULL AND ${table.businessId} IS NULL
      ) OR (
        ${table.code} = 'creator_payable' AND ${table.creatorUserId} IS NOT NULL
        AND ${table.campaignId} IS NULL AND ${table.businessId} IS NULL
      ) OR (
        ${table.code} = 'business_refund_payable' AND ${table.businessId} IS NOT NULL
        AND ${table.campaignId} IS NULL AND ${table.creatorUserId} IS NULL
      )`,
    ),
  ],
);

export const ledgerTransactions = pgTable(
  'ledger_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    type: ledgerTransactionType('type').notNull(),
    sourceType: ledgerTransactionSourceType('source_type').notNull(),
    sourcePublicId: text('source_public_id').notNull(),
    requestHash: text('request_hash').notNull(),
    paymentProviderReferenceId: uuid('payment_provider_reference_id').references(
      () => paymentProviderReferences.id,
      { onDelete: 'restrict' },
    ),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'restrict' }),
    missionAssignmentId: uuid('mission_assignment_id').references(() => missionAssignments.id, {
      onDelete: 'restrict',
    }),
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ledger_transactions_public_id_uq').on(table.publicId),
    uniqueIndex('ledger_transactions_source_uq').on(table.sourceType, table.sourcePublicId),
    index('ledger_transactions_campaign_created_idx').on(table.campaignId, table.createdAt),
    index('ledger_transactions_assignment_created_idx').on(
      table.missionAssignmentId,
      table.createdAt,
    ),
    check('ledger_transactions_total_positive_ck', sql`${table.totalMinor} > 0`),
    check('ledger_transactions_currency_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'ledger_transactions_source_nonempty_ck',
      sql`length(btrim(${table.sourcePublicId})) > 0 AND length(btrim(${table.requestHash})) > 0`,
    ),
    check(
      'ledger_transactions_shape_ck',
      sql`(
        ${table.type} = 'campaign_funding' AND ${table.sourceType} = 'provider_funding'
        AND ${table.paymentProviderReferenceId} IS NOT NULL AND ${table.campaignId} IS NOT NULL
        AND ${table.missionAssignmentId} IS NULL AND ${table.createdByUserId} IS NULL
      ) OR (
        ${table.type} IN ('slot_completion', 'slot_refund')
        AND ${table.sourceType} = 'financial_action_intent'
        AND ${table.paymentProviderReferenceId} IS NULL AND ${table.campaignId} IS NOT NULL
        AND ${table.missionAssignmentId} IS NOT NULL AND ${table.createdByUserId} IS NULL
      ) OR (
        ${table.type} = 'finance_adjustment' AND ${table.sourceType} = 'finance_adjustment'
        AND ${table.paymentProviderReferenceId} IS NULL AND ${table.createdByUserId} IS NOT NULL
        AND length(btrim(${table.reason})) > 0
      )`,
    ),
  ],
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    ledgerTransactionId: uuid('ledger_transaction_id')
      .notNull()
      .references(() => ledgerTransactions.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    ledgerAccountId: uuid('ledger_account_id')
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'restrict' }),
    direction: ledgerEntryDirection('direction').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    slotFundingAllocationId: uuid('slot_funding_allocation_id').references(
      () => slotFundingAllocations.id,
      { onDelete: 'restrict' },
    ),
    missionAssignmentId: uuid('mission_assignment_id').references(() => missionAssignments.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ledger_entries_public_id_uq').on(table.publicId),
    uniqueIndex('ledger_entries_transaction_position_uq').on(
      table.ledgerTransactionId,
      table.position,
    ),
    index('ledger_entries_account_created_idx').on(table.ledgerAccountId, table.createdAt),
    index('ledger_entries_allocation_idx').on(table.slotFundingAllocationId),
    check('ledger_entries_position_positive_ck', sql`${table.position} > 0`),
    check('ledger_entries_amount_positive_ck', sql`${table.amountMinor} > 0`),
    check('ledger_entries_currency_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const localPassOffers = pgTable(
  'local_pass_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    businessLocationId: uuid('business_location_id')
      .notNull()
      .references(() => businessLocations.id, { onDelete: 'restrict' }),
    status: localPassOfferStatus('status').default('configured').notNull(),
    title: text('title').notNull(),
    offerDescription: text('offer_description').notNull(),
    purchaseRequirement: text('purchase_requirement'),
    exclusions: text('exclusions').notNull(),
    statedRetailValueMinor: integer('stated_retail_value_minor').notNull(),
    currency: text('currency').notNull(),
    totalQuantity: integer('total_quantity').notNull(),
    committedQuantity: integer('committed_quantity').default(0).notNull(),
    redeemedQuantity: integer('redeemed_quantity').default(0).notNull(),
    availableStartsAt: timestamp('available_starts_at', { withTimezone: true }).notNull(),
    availableEndsAt: timestamp('available_ends_at', { withTimezone: true }).notNull(),
    preapprovedSubstituteDescription: text('preapproved_substitute_description'),
    preapprovedSubstituteValueMinor: integer('preapproved_substitute_value_minor'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_offers_public_id_uq').on(table.publicId),
    uniqueIndex('local_pass_offers_campaign_uq').on(table.campaignId),
    index('local_pass_offers_location_status_idx').on(table.businessLocationId, table.status),
    check('local_pass_offers_title_nonempty_ck', sql`length(btrim(${table.title})) > 0`),
    check(
      'local_pass_offers_description_nonempty_ck',
      sql`length(btrim(${table.offerDescription})) > 0 AND length(btrim(${table.exclusions})) > 0`,
    ),
    check('local_pass_offers_value_nonnegative_ck', sql`${table.statedRetailValueMinor} >= 0`),
    check('local_pass_offers_currency_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check('local_pass_offers_quantity_ck', sql`${table.totalQuantity} BETWEEN 1 AND 500`),
    check(
      'local_pass_offers_inventory_ck',
      sql`${table.committedQuantity} >= 0 AND ${table.redeemedQuantity} >= 0
          AND ${table.redeemedQuantity} <= ${table.committedQuantity}
          AND ${table.committedQuantity} <= ${table.totalQuantity}`,
    ),
    check(
      'local_pass_offers_window_ck',
      sql`${table.availableEndsAt} > ${table.availableStartsAt}`,
    ),
    check(
      'local_pass_offers_substitute_ck',
      sql`(${table.preapprovedSubstituteDescription} IS NULL AND ${table.preapprovedSubstituteValueMinor} IS NULL) OR
          (length(btrim(${table.preapprovedSubstituteDescription})) > 0
           AND ${table.preapprovedSubstituteValueMinor} >= ${table.statedRetailValueMinor})`,
    ),
    check('local_pass_offers_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const localPassOfferStatusHistory = pgTable(
  'local_pass_offer_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    localPassOfferId: uuid('local_pass_offer_id')
      .notNull()
      .references(() => localPassOffers.id, { onDelete: 'restrict' }),
    fromStatus: localPassOfferStatus('from_status'),
    toStatus: localPassOfferStatus('to_status').notNull(),
    offerVersion: integer('offer_version').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'restrict' }),
    actorType: auditActorType('actor_type').default('user').notNull(),
    reason: text('reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_offer_status_history_version_uq').on(
      table.localPassOfferId,
      table.offerVersion,
    ),
    index('local_pass_offer_status_history_timeline_idx').on(
      table.localPassOfferId,
      table.occurredAt,
    ),
    check('local_pass_offer_status_history_version_ck', sql`${table.offerVersion} > 0`),
  ],
);

export const localPassLinks = pgTable(
  'local_pass_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localPassOfferId: uuid('local_pass_offer_id')
      .notNull()
      .references(() => localPassOffers.id, { onDelete: 'restrict' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: text('token_hash').notNull(),
    status: localPassLinkStatus('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('local_pass_links_public_id_uq').on(table.publicId),
    uniqueIndex('local_pass_links_token_hash_uq').on(table.tokenHash),
    uniqueIndex('local_pass_links_assignment_uq').on(table.missionAssignmentId),
    uniqueIndex('local_pass_links_campaign_creator_uq').on(table.campaignId, table.creatorUserId),
    index('local_pass_links_offer_status_idx').on(table.localPassOfferId, table.status),
    check('local_pass_links_token_hash_ck', sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`),
    check(
      'local_pass_links_revoked_shape_ck',
      sql`(${table.status} = 'active' AND ${table.revokedAt} IS NULL) OR
          (${table.status} = 'revoked' AND ${table.revokedAt} IS NOT NULL)`,
    ),
  ],
);

export const localPassClaims = pgTable(
  'local_pass_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localPassOfferId: uuid('local_pass_offer_id')
      .notNull()
      .references(() => localPassOffers.id, { onDelete: 'restrict' }),
    localPassLinkId: uuid('local_pass_link_id')
      .notNull()
      .references(() => localPassLinks.id, { onDelete: 'restrict' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    customerDedupToken: text('customer_dedup_token'),
    tokenKeyVersion: integer('token_key_version'),
    status: localPassClaimStatus('status').default('active').notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
    customerLinkageDeleteAfter: timestamp('customer_linkage_delete_after', { withTimezone: true }),
    customerLinkageDeletedAt: timestamp('customer_linkage_deleted_at', { withTimezone: true }),
    version: integer('version').default(1).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_claims_public_id_uq').on(table.publicId),
    uniqueIndex('local_pass_claims_campaign_customer_uq').on(
      table.campaignId,
      table.customerDedupToken,
    ),
    index('local_pass_claims_offer_status_expiry_idx').on(
      table.localPassOfferId,
      table.status,
      table.expiresAt,
    ),
    index('local_pass_claims_creator_status_idx').on(table.creatorUserId, table.status),
    check(
      'local_pass_claims_customer_token_ck',
      sql`${table.customerDedupToken} IS NULL OR ${table.customerDedupToken} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'local_pass_claims_key_version_ck',
      sql`(${table.customerDedupToken} IS NULL AND ${table.tokenKeyVersion} IS NULL) OR
          (${table.customerDedupToken} IS NOT NULL AND ${table.tokenKeyVersion} > 0)`,
    ),
    check(
      'local_pass_claims_seven_day_ck',
      sql`${table.expiresAt} = ${table.claimedAt} + interval '7 days'`,
    ),
    check(
      'local_pass_claims_status_shape_ck',
      sql`(${table.status} = 'active' AND ${table.redeemedAt} IS NULL AND ${table.expiredAt} IS NULL) OR
          (${table.status} = 'redeemed' AND ${table.redeemedAt} IS NOT NULL AND ${table.expiredAt} IS NULL) OR
          (${table.status} = 'expired' AND ${table.redeemedAt} IS NULL AND ${table.expiredAt} IS NOT NULL)`,
    ),
    check('local_pass_claims_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const localPassClaimTokens = pgTable(
  'local_pass_claim_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localPassClaimId: uuid('local_pass_claim_id')
      .notNull()
      .references(() => localPassClaims.id, { onDelete: 'restrict' }),
    rotation: integer('rotation').notNull(),
    tokenHash: text('token_hash').notNull(),
    status: localPassClaimTokenStatus('status').default('active').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('local_pass_claim_tokens_public_id_uq').on(table.publicId),
    uniqueIndex('local_pass_claim_tokens_hash_uq').on(table.tokenHash),
    uniqueIndex('local_pass_claim_tokens_claim_rotation_uq').on(
      table.localPassClaimId,
      table.rotation,
    ),
    uniqueIndex('local_pass_claim_tokens_one_active_uq')
      .on(table.localPassClaimId)
      .where(sql`${table.status} = 'active'`),
    index('local_pass_claim_tokens_status_expiry_idx').on(table.status, table.expiresAt),
    check('local_pass_claim_tokens_rotation_ck', sql`${table.rotation} > 0`),
    check('local_pass_claim_tokens_hash_ck', sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`),
    check(
      'local_pass_claim_tokens_lifetime_ck',
      sql`${table.expiresAt} > ${table.issuedAt} AND ${table.expiresAt} <= ${table.issuedAt} + interval '5 minutes'`,
    ),
    check(
      'local_pass_claim_tokens_consumed_shape_ck',
      sql`(${table.status} = 'consumed' AND ${table.consumedAt} IS NOT NULL) OR
          (${table.status} <> 'consumed' AND ${table.consumedAt} IS NULL)`,
    ),
  ],
);

export const localPassClaimStatusHistory = pgTable(
  'local_pass_claim_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    localPassClaimId: uuid('local_pass_claim_id')
      .notNull()
      .references(() => localPassClaims.id, { onDelete: 'restrict' }),
    fromStatus: localPassClaimStatus('from_status'),
    toStatus: localPassClaimStatus('to_status').notNull(),
    claimVersion: integer('claim_version').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'restrict' }),
    actorType: auditActorType('actor_type').notNull(),
    reason: text('reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_claim_status_history_version_uq').on(
      table.localPassClaimId,
      table.claimVersion,
    ),
    index('local_pass_claim_status_history_timeline_idx').on(
      table.localPassClaimId,
      table.occurredAt,
    ),
    check('local_pass_claim_status_history_version_ck', sql`${table.claimVersion} > 0`),
  ],
);

export const localPassRedemptions = pgTable(
  'local_pass_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localPassClaimId: uuid('local_pass_claim_id')
      .notNull()
      .references(() => localPassClaims.id, { onDelete: 'restrict' }),
    localPassClaimTokenId: uuid('local_pass_claim_token_id')
      .notNull()
      .references(() => localPassClaimTokens.id, { onDelete: 'restrict' }),
    localPassOfferId: uuid('local_pass_offer_id')
      .notNull()
      .references(() => localPassOffers.id, { onDelete: 'restrict' }),
    businessLocationId: uuid('business_location_id')
      .notNull()
      .references(() => businessLocations.id, { onDelete: 'restrict' }),
    redeemedByUserId: uuid('redeemed_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    fulfillmentKind: localPassFulfillmentKind('fulfillment_kind').notNull(),
    substituteDescription: text('substitute_description'),
    substituteValueMinor: integer('substitute_value_minor'),
    offerConfirmed: boolean('offer_confirmed').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_redemptions_public_id_uq').on(table.publicId),
    uniqueIndex('local_pass_redemptions_claim_uq').on(table.localPassClaimId),
    uniqueIndex('local_pass_redemptions_token_uq').on(table.localPassClaimTokenId),
    index('local_pass_redemptions_offer_occurred_idx').on(table.localPassOfferId, table.occurredAt),
    check('local_pass_redemptions_offer_confirmed_ck', sql`${table.offerConfirmed} = true`),
    check(
      'local_pass_redemptions_fulfillment_ck',
      sql`(${table.fulfillmentKind} = 'original_offer'
           AND ${table.substituteDescription} IS NULL AND ${table.substituteValueMinor} IS NULL) OR
          (${table.fulfillmentKind} <> 'original_offer'
           AND length(btrim(${table.substituteDescription})) > 0
           AND ${table.substituteValueMinor} >= 0)`,
    ),
  ],
);

export const localPassAttributionEvents = pgTable(
  'local_pass_attribution_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    kind: localPassEvidenceKind('kind').notNull(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    localPassLinkId: uuid('local_pass_link_id')
      .notNull()
      .references(() => localPassLinks.id, { onDelete: 'restrict' }),
    localPassClaimId: uuid('local_pass_claim_id').references(() => localPassClaims.id, {
      onDelete: 'restrict',
    }),
    localPassRedemptionId: uuid('local_pass_redemption_id').references(
      () => localPassRedemptions.id,
      { onDelete: 'restrict' },
    ),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_attribution_events_public_id_uq').on(table.publicId),
    uniqueIndex('local_pass_attribution_events_claim_kind_uq')
      .on(table.localPassClaimId, table.kind)
      .where(sql`${table.localPassClaimId} IS NOT NULL`),
    index('local_pass_attribution_events_campaign_kind_idx').on(
      table.campaignId,
      table.kind,
      table.occurredAt,
    ),
    index('local_pass_attribution_events_creator_kind_idx').on(
      table.creatorUserId,
      table.kind,
      table.occurredAt,
    ),
    check(
      'local_pass_attribution_events_shape_ck',
      sql`(${table.kind} = 'link_open'
           AND ${table.localPassClaimId} IS NULL AND ${table.localPassRedemptionId} IS NULL) OR
          (${table.kind} = 'pass_claimed'
           AND ${table.localPassClaimId} IS NOT NULL AND ${table.localPassRedemptionId} IS NULL) OR
          (${table.kind} = 'verified_pass_redemption'
           AND ${table.localPassClaimId} IS NOT NULL AND ${table.localPassRedemptionId} IS NOT NULL)`,
    ),
  ],
);

export const localPassCustomerChallenges = pgTable(
  'local_pass_customer_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localPassLinkId: uuid('local_pass_link_id').references(() => localPassLinks.id, {
      onDelete: 'restrict',
    }),
    localPassClaimId: uuid('local_pass_claim_id').references(() => localPassClaims.id, {
      onDelete: 'restrict',
    }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    purpose: localPassChallengePurpose('purpose').notNull(),
    status: localPassChallengeStatus('status').default('pending').notNull(),
    destinationDedupToken: text('destination_dedup_token'),
    destinationTokenKeyVersion: integer('destination_token_key_version'),
    destinationCiphertext: text('destination_ciphertext'),
    riskDedupToken: text('risk_dedup_token'),
    riskTokenKeyVersion: integer('risk_token_key_version'),
    otpDigest: text('otp_digest'),
    sendNumber: integer('send_number').notNull(),
    verifyAttemptCount: integer('verify_attempt_count').default(0).notNull(),
    maxVerifyAttempts: integer('max_verify_attempts').default(5).notNull(),
    marketingConsent: boolean('marketing_consent').default(false).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    resendNotBefore: timestamp('resend_not_before', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    contactDeleteAfter: timestamp('contact_delete_after', { withTimezone: true }).notNull(),
    contactDeletedAt: timestamp('contact_deleted_at', { withTimezone: true }),
    linkageDeleteAfter: timestamp('linkage_delete_after', { withTimezone: true }).notNull(),
    linkageDeletedAt: timestamp('linkage_deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_customer_challenges_public_id_uq').on(table.publicId),
    index('local_pass_customer_challenges_destination_rate_idx').on(
      table.destinationDedupToken,
      table.issuedAt,
    ),
    index('local_pass_customer_challenges_risk_rate_idx').on(table.riskDedupToken, table.issuedAt),
    index('local_pass_customer_challenges_claim_idx').on(table.localPassClaimId, table.createdAt),
    check(
      'local_pass_customer_challenges_target_ck',
      sql`(${table.purpose} = 'claim' AND ${table.localPassLinkId} IS NOT NULL AND ${table.localPassClaimId} IS NULL)
          OR (${table.purpose} <> 'claim' AND ${table.localPassClaimId} IS NOT NULL)`,
    ),
    check(
      'local_pass_customer_challenges_private_tokens_ck',
      sql`(${table.destinationDedupToken} IS NULL AND ${table.destinationTokenKeyVersion} IS NULL
           AND ${table.riskDedupToken} IS NULL AND ${table.riskTokenKeyVersion} IS NULL AND ${table.otpDigest} IS NULL)
          OR (${table.destinationDedupToken} ~ '^[a-f0-9]{64}$' AND ${table.destinationTokenKeyVersion} > 0
              AND ${table.riskDedupToken} ~ '^[a-f0-9]{64}$' AND ${table.riskTokenKeyVersion} > 0
              AND ${table.otpDigest} ~ '^[a-f0-9]{64}$')`,
    ),
    check(
      'local_pass_customer_challenges_ciphertext_ck',
      sql`${table.destinationCiphertext} IS NULL OR
          (${table.destinationCiphertext} ~ '^enc:v[0-9]+:[A-Za-z0-9_+/=-]+$'
           AND length(${table.destinationCiphertext}) BETWEEN 23 AND 2060)`,
    ),
    check(
      'local_pass_customer_challenges_attempts_ck',
      sql`${table.sendNumber} BETWEEN 1 AND 3 AND ${table.maxVerifyAttempts} BETWEEN 1 AND 5
          AND ${table.verifyAttemptCount} BETWEEN 0 AND ${table.maxVerifyAttempts}`,
    ),
    check(
      'local_pass_customer_challenges_window_ck',
      sql`${table.resendNotBefore} = ${table.issuedAt} + interval '60 seconds'
          AND ${table.expiresAt} = ${table.issuedAt} + interval '5 minutes'
          AND ${table.contactDeleteAfter} >= ${table.expiresAt} + interval '30 days'
          AND ${table.linkageDeleteAfter} >= ${table.expiresAt} + interval '12 months'`,
    ),
    check(
      'local_pass_customer_challenges_status_ck',
      sql`(${table.status} = 'verified' AND ${table.verifiedAt} IS NOT NULL AND ${table.consumedAt} IS NULL)
          OR (${table.status} = 'consumed' AND ${table.verifiedAt} IS NOT NULL AND ${table.consumedAt} IS NOT NULL)
          OR (${table.status} NOT IN ('verified','consumed') AND ${table.consumedAt} IS NULL)`,
    ),
  ],
);

export const localPassFulfillmentIncidents = pgTable(
  'local_pass_fulfillment_incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localPassClaimId: uuid('local_pass_claim_id')
      .notNull()
      .references(() => localPassClaims.id, { onDelete: 'restrict' }),
    localPassOfferId: uuid('local_pass_offer_id')
      .notNull()
      .references(() => localPassOffers.id, { onDelete: 'restrict' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'restrict' }),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    businessLocationId: uuid('business_location_id')
      .notNull()
      .references(() => businessLocations.id, { onDelete: 'restrict' }),
    customerChallengeId: uuid('customer_challenge_id')
      .notNull()
      .references(() => localPassCustomerChallenges.id, { onDelete: 'restrict' }),
    reason: localPassIncidentReason('reason').notNull(),
    status: localPassIncidentStatus('status').default('open').notNull(),
    customerStatement: text('customer_statement').notNull(),
    intentional: boolean('intentional'),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    reviewReason: text('review_reason'),
    reportedAt: timestamp('reported_at', { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_fulfillment_incidents_public_id_uq').on(table.publicId),
    uniqueIndex('local_pass_fulfillment_incidents_challenge_uq').on(table.customerChallengeId),
    uniqueIndex('local_pass_fulfillment_incidents_one_open_claim_uq')
      .on(table.localPassClaimId)
      .where(sql`${table.status} = 'open'`),
    index('local_pass_fulfillment_incidents_business_status_idx').on(
      table.businessId,
      table.status,
      table.reportedAt,
    ),
    check(
      'local_pass_fulfillment_incidents_statement_ck',
      sql`length(btrim(${table.customerStatement})) BETWEEN 10 AND 1000`,
    ),
    check(
      'local_pass_fulfillment_incidents_review_ck',
      sql`(${table.status} = 'open' AND ${table.reviewedByUserId} IS NULL AND ${table.reviewedAt} IS NULL
           AND ${table.reviewReason} IS NULL AND ${table.intentional} IS NULL)
          OR (${table.status} <> 'open' AND ${table.reviewedByUserId} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL
              AND length(btrim(${table.reviewReason})) BETWEEN 10 AND 1000 AND ${table.intentional} IS NOT NULL)`,
    ),
  ],
);

export const localPassFulfillmentIncidentHistory = pgTable(
  'local_pass_fulfillment_incident_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    localPassFulfillmentIncidentId: uuid('local_pass_fulfillment_incident_id')
      .notNull()
      .references(() => localPassFulfillmentIncidents.id, { onDelete: 'restrict' }),
    fromStatus: localPassIncidentStatus('from_status'),
    toStatus: localPassIncidentStatus('to_status').notNull(),
    incidentVersion: integer('incident_version').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    actorType: auditActorType('actor_type').notNull(),
    reason: text('reason').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('local_pass_fulfillment_incident_history_version_uq').on(
      table.localPassFulfillmentIncidentId,
      table.incidentVersion,
    ),
    check(
      'local_pass_fulfillment_incident_history_reason_ck',
      sql`length(btrim(${table.reason})) > 0`,
    ),
  ],
);

export const legalDocumentVersions = pgTable(
  'legal_document_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    type: legalDocumentType('type').notNull(),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    bodySha256: text('body_sha256').notNull(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(),
    publishedByUserId: uuid('published_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('legal_document_versions_public_id_uq').on(table.publicId),
    uniqueIndex('legal_document_versions_type_version_uq').on(table.type, table.version),
    uniqueIndex('legal_document_versions_type_hash_uq').on(table.type, table.bodySha256),
    index('legal_document_versions_type_effective_idx').on(table.type, table.effectiveAt),
    check('legal_document_versions_version_ck', sql`${table.version} > 0`),
    check('legal_document_versions_title_ck', sql`length(btrim(${table.title})) > 0`),
    check('legal_document_versions_hash_ck', sql`${table.bodySha256} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const missionRightsOffers = pgTable(
  'mission_rights_offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionSlotId: uuid('mission_slot_id')
      .notNull()
      .references(() => missionSlots.id, { onDelete: 'restrict' }),
    campaignBriefVersionId: uuid('campaign_brief_version_id')
      .notNull()
      .references(() => campaignBriefVersions.id, { onDelete: 'restrict' }),
    rightsVersion: integer('rights_version').default(1).notNull(),
    baseRewardMinorSnapshot: integer('base_reward_minor_snapshot').notNull(),
    extendedOwnedMediaSelected: boolean('extended_owned_media_selected').default(false).notNull(),
    extendedOwnedMediaBonusMinor: integer('extended_owned_media_bonus_minor').default(0).notNull(),
    paidAdvertisingSelected: boolean('paid_advertising_selected').default(false).notNull(),
    paidAdvertisingBonusMinor: integer('paid_advertising_bonus_minor').default(0).notNull(),
    totalRightsBonusMinor: integer('total_rights_bonus_minor').default(0).notNull(),
    currency: text('currency').notNull(),
    publicDisclosureRequired: boolean('public_disclosure_required').notNull(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mission_rights_offers_public_id_uq').on(table.publicId),
    uniqueIndex('mission_rights_offers_slot_uq').on(table.missionSlotId),
    index('mission_rights_offers_brief_idx').on(table.campaignBriefVersionId),
    check('mission_rights_offers_version_ck', sql`${table.rightsVersion} > 0`),
    check('mission_rights_offers_base_reward_ck', sql`${table.baseRewardMinorSnapshot} > 0`),
    check(
      'mission_rights_offers_extended_bonus_ck',
      sql`(${table.extendedOwnedMediaSelected} = true
           AND ${table.extendedOwnedMediaBonusMinor} = ((${table.baseRewardMinorSnapshot} * 50 + 50) / 100)) OR
          (${table.extendedOwnedMediaSelected} = false AND ${table.extendedOwnedMediaBonusMinor} = 0)`,
    ),
    check(
      'mission_rights_offers_paid_bonus_ck',
      sql`(${table.paidAdvertisingSelected} = true
           AND ${table.paidAdvertisingBonusMinor} = ${table.baseRewardMinorSnapshot}) OR
          (${table.paidAdvertisingSelected} = false AND ${table.paidAdvertisingBonusMinor} = 0)`,
    ),
    check(
      'mission_rights_offers_total_bonus_ck',
      sql`${table.totalRightsBonusMinor} = ${table.extendedOwnedMediaBonusMinor} + ${table.paidAdvertisingBonusMinor}`,
    ),
    check('mission_rights_offers_currency_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const missionContractAcceptances = pgTable(
  'mission_contract_acceptances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    campaignBriefVersionId: uuid('campaign_brief_version_id')
      .notNull()
      .references(() => campaignBriefVersions.id, { onDelete: 'restrict' }),
    missionRightsOfferId: uuid('mission_rights_offer_id')
      .notNull()
      .references(() => missionRightsOffers.id, { onDelete: 'restrict' }),
    creatorTermsDocumentId: uuid('creator_terms_document_id')
      .notNull()
      .references(() => legalDocumentVersions.id, { onDelete: 'restrict' }),
    disclosureDocumentId: uuid('disclosure_document_id')
      .notNull()
      .references(() => legalDocumentVersions.id, { onDelete: 'restrict' }),
    compensationAcknowledged: boolean('compensation_acknowledged').notNull(),
    deliverablesAcknowledged: boolean('deliverables_acknowledged').notNull(),
    disclosureAcknowledged: boolean('disclosure_acknowledged').notNull(),
    rightsAcknowledged: boolean('rights_acknowledged').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mission_contract_acceptances_public_id_uq').on(table.publicId),
    uniqueIndex('mission_contract_acceptances_assignment_uq').on(table.missionAssignmentId),
    index('mission_contract_acceptances_creator_timeline_idx').on(
      table.creatorUserId,
      table.acceptedAt,
    ),
    check(
      'mission_contract_acceptances_explicit_ck',
      sql`${table.compensationAcknowledged} = true AND ${table.deliverablesAcknowledged} = true
          AND ${table.disclosureAcknowledged} = true AND ${table.rightsAcknowledged} = true`,
    ),
  ],
);

export const contentLicenses = pgTable(
  'content_licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    missionAssignmentId: uuid('mission_assignment_id')
      .notNull()
      .references(() => missionAssignments.id, { onDelete: 'restrict' }),
    missionContractAcceptanceId: uuid('mission_contract_acceptance_id')
      .notNull()
      .references(() => missionContractAcceptances.id, { onDelete: 'restrict' }),
    submissionAttemptId: uuid('submission_attempt_id')
      .notNull()
      .references(() => submissionAttempts.id, { onDelete: 'restrict' }),
    financialActionIntentId: uuid('financial_action_intent_id')
      .notNull()
      .references(() => financialActionIntents.id, { onDelete: 'restrict' }),
    kind: contentLicenseKind('kind').notNull(),
    status: contentLicenseStatus('status').default('active').notNull(),
    rightsVersion: integer('rights_version').notNull(),
    baseRewardMinorSnapshot: integer('base_reward_minor_snapshot').notNull(),
    compensationComponentMinor: integer('compensation_component_minor').notNull(),
    currency: text('currency').notNull(),
    attributionRequired: boolean('attribution_required').default(true).notNull(),
    nonExclusive: boolean('non_exclusive').default(true).notNull(),
    thirdPartySublicensingAllowed: boolean('third_party_sublicensing_allowed')
      .default(false)
      .notNull(),
    aiTrainingAllowed: boolean('ai_training_allowed').default(false).notNull(),
    syntheticMediaAllowed: boolean('synthetic_media_allowed').default(false).notNull(),
    faceVoiceCloningAllowed: boolean('face_voice_cloning_allowed').default(false).notNull(),
    permittedEdits: jsonb('permitted_edits').$type<string[]>().notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    version: integer('version').default(1).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('content_licenses_public_id_uq').on(table.publicId),
    uniqueIndex('content_licenses_assignment_kind_uq').on(table.missionAssignmentId, table.kind),
    index('content_licenses_status_expiry_idx').on(table.status, table.expiresAt),
    index('content_licenses_acceptance_idx').on(table.missionContractAcceptanceId),
    check('content_licenses_rights_version_ck', sql`${table.rightsVersion} > 0`),
    check('content_licenses_base_reward_ck', sql`${table.baseRewardMinorSnapshot} > 0`),
    check(
      'content_licenses_compensation_ck',
      sql`(${table.kind} = 'organic_owned_social_90d' AND ${table.compensationComponentMinor} = 0) OR
          (${table.kind} = 'extended_owned_media_12m'
           AND ${table.compensationComponentMinor} = ((${table.baseRewardMinorSnapshot} * 50 + 50) / 100)) OR
          (${table.kind} = 'paid_advertising_30d'
           AND ${table.compensationComponentMinor} = ${table.baseRewardMinorSnapshot})`,
    ),
    check('content_licenses_currency_ck', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'content_licenses_standard_safety_ck',
      sql`${table.attributionRequired} = true AND ${table.nonExclusive} = true
          AND ${table.thirdPartySublicensingAllowed} = false AND ${table.aiTrainingAllowed} = false
          AND ${table.syntheticMediaAllowed} = false AND ${table.faceVoiceCloningAllowed} = false`,
    ),
    check(
      'content_licenses_permitted_edits_ck',
      sql`${table.permittedEdits} = '["crop","resize","caption","logo_placement","minor_formatting"]'::jsonb`,
    ),
    check(
      'content_licenses_term_ck',
      sql`(${table.kind} = 'organic_owned_social_90d'
           AND ${table.expiresAt} = ${table.activatedAt} + interval '90 days') OR
          (${table.kind} = 'extended_owned_media_12m'
           AND ${table.expiresAt} = ${table.activatedAt} + interval '12 months') OR
          (${table.kind} = 'paid_advertising_30d'
           AND ${table.expiresAt} = ${table.activatedAt} + interval '30 days')`,
    ),
    check(
      'content_licenses_status_shape_ck',
      sql`(${table.status} = 'active' AND ${table.expiredAt} IS NULL
           AND ${table.suspendedAt} IS NULL AND ${table.revokedAt} IS NULL) OR
          (${table.status} = 'expired' AND ${table.expiredAt} IS NOT NULL
           AND ${table.suspendedAt} IS NULL AND ${table.revokedAt} IS NULL) OR
          (${table.status} = 'suspended' AND ${table.expiredAt} IS NULL
           AND ${table.suspendedAt} IS NOT NULL AND ${table.revokedAt} IS NULL) OR
          (${table.status} = 'revoked' AND ${table.expiredAt} IS NULL
           AND ${table.revokedAt} IS NOT NULL)`,
    ),
    check('content_licenses_version_ck', sql`${table.version} > 0`),
  ],
);

export const contentLicenseAssets = pgTable(
  'content_license_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    contentLicenseId: uuid('content_license_id')
      .notNull()
      .references(() => contentLicenses.id, { onDelete: 'restrict' }),
    mediaAssetId: uuid('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('content_license_assets_public_id_uq').on(table.publicId),
    uniqueIndex('content_license_assets_license_asset_uq').on(
      table.contentLicenseId,
      table.mediaAssetId,
    ),
    uniqueIndex('content_license_assets_license_position_uq').on(
      table.contentLicenseId,
      table.position,
    ),
    check('content_license_assets_position_ck', sql`${table.position} > 0`),
  ],
);

export const contentLicenseChannels = pgTable(
  'content_license_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    contentLicenseId: uuid('content_license_id')
      .notNull()
      .references(() => contentLicenses.id, { onDelete: 'restrict' }),
    channel: contentLicenseChannel('channel').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('content_license_channels_public_id_uq').on(table.publicId),
    uniqueIndex('content_license_channels_license_channel_uq').on(
      table.contentLicenseId,
      table.channel,
    ),
    index('content_license_channels_channel_idx').on(table.channel),
  ],
);

export const contentLicenseStatusHistory = pgTable(
  'content_license_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentLicenseId: uuid('content_license_id')
      .notNull()
      .references(() => contentLicenses.id, { onDelete: 'restrict' }),
    fromStatus: contentLicenseStatus('from_status'),
    toStatus: contentLicenseStatus('to_status').notNull(),
    licenseVersion: integer('license_version').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'restrict' }),
    actorType: auditActorType('actor_type').notNull(),
    reason: text('reason'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('content_license_status_history_version_uq').on(
      table.contentLicenseId,
      table.licenseVersion,
    ),
    index('content_license_status_history_timeline_idx').on(
      table.contentLicenseId,
      table.occurredAt,
    ),
    check('content_license_status_history_version_ck', sql`${table.licenseVersion} > 0`),
  ],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    category: notificationCategory('category').notNull(),
    channel: notificationChannel('channel').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_preferences_public_id_uq').on(table.publicId),
    uniqueIndex('notification_preferences_user_category_channel_uq').on(
      table.userId,
      table.category,
      table.channel,
    ),
    index('notification_preferences_user_idx').on(table.userId, table.category),
    check(
      'notification_preferences_external_channel_ck',
      sql`${table.channel} IN ('push','email')`,
    ),
    check(
      'notification_preferences_security_required_ck',
      sql`${table.category} <> 'security' OR ${table.enabled} = true`,
    ),
    check('notification_preferences_version_ck', sql`${table.version} > 0`),
  ],
);

export const notificationPreferenceHistory = pgTable(
  'notification_preference_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    notificationPreferenceId: uuid('notification_preference_id')
      .notNull()
      .references(() => notificationPreferences.id, { onDelete: 'restrict' }),
    enabled: boolean('enabled').notNull(),
    preferenceVersion: integer('preference_version').notNull(),
    changedByUserId: uuid('changed_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_preference_history_public_id_uq').on(table.publicId),
    uniqueIndex('notification_preference_history_version_uq').on(
      table.notificationPreferenceId,
      table.preferenceVersion,
    ),
    index('notification_preference_history_timeline_idx').on(
      table.notificationPreferenceId,
      table.occurredAt,
    ),
    check('notification_preference_history_version_ck', sql`${table.preferenceVersion} > 0`),
  ],
);

export const notificationEvents = pgTable(
  'notification_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    type: notificationEventType('type').notNull(),
    category: notificationCategory('category').notNull(),
    audience: notificationAudience('audience').notNull(),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'restrict' }),
    aggregateType: notificationAggregateType('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    templateKey: text('template_key').notNull(),
    deepLinkRoute: text('deep_link_route').notNull(),
    deduplicationKey: text('deduplication_key').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_events_public_id_uq').on(table.publicId),
    uniqueIndex('notification_events_recipient_dedup_uq').on(
      table.recipientUserId,
      table.type,
      table.deduplicationKey,
    ),
    index('notification_events_recipient_timeline_idx').on(table.recipientUserId, table.occurredAt),
    index('notification_events_aggregate_idx').on(table.aggregateType, table.aggregateId),
    index('notification_events_business_idx').on(table.businessId, table.occurredAt),
    check(
      'notification_events_template_key_ck',
      sql`${table.templateKey} ~ '^notification[.][a-z0-9_]+[.]v[1-9][0-9]*$'`,
    ),
    check(
      'notification_events_deep_link_ck',
      sql`${table.deepLinkRoute} ~ '^/[a-z0-9_/-]{1,240}$'`,
    ),
    check(
      'notification_events_dedup_key_ck',
      sql`length(btrim(${table.deduplicationKey})) BETWEEN 1 AND 240`,
    ),
    check(
      'notification_events_category_ck',
      sql`(
        ${table.type} IN ('mission_accepted','revision_requested','mission_approved')
        AND ${table.category} = 'mission_action'
      ) OR (
        ${table.type} IN ('mission_reminder','check_in_reminder','submission_due')
        AND ${table.category} = 'mission_reminder'
      ) OR (${table.type} = 'payout_available' AND ${table.category} = 'money')
        OR (${table.type} = 'dispute_update' AND ${table.category} = 'dispute')
        OR (${table.type} = 'security_alert' AND ${table.category} = 'security')`,
    ),
    check(
      'notification_events_aggregate_shape_ck',
      sql`(
        ${table.type} = 'security_alert' AND ${table.aggregateType} = 'user'
        AND ${table.audience} = 'account_owner' AND ${table.businessId} IS NULL
      ) OR (
        ${table.type} = 'mission_accepted' AND ${table.aggregateType} = 'mission_application'
        AND ${table.audience} = 'creator' AND ${table.businessId} IS NOT NULL
      ) OR (
        ${table.type} NOT IN ('security_alert','mission_accepted')
        AND ${table.aggregateType} = 'mission_assignment' AND ${table.businessId} IS NOT NULL
        AND ${table.audience} IN ('creator','business_member','platform_staff')
      )`,
    ),
  ],
);

export const notificationOutboxMessages = pgTable(
  'notification_outbox_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    notificationEventId: uuid('notification_event_id')
      .notNull()
      .references(() => notificationEvents.id, { onDelete: 'restrict' }),
    status: notificationOutboxStatus('status').default('pending').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(5).notNull(),
    availableAt: timestamp('available_at', { withTimezone: true }).defaultNow().notNull(),
    lockToken: uuid('lock_token'),
    lockedBy: text('locked_by'),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    deadLetteredAt: timestamp('dead_lettered_at', { withTimezone: true }),
    replayCount: integer('replay_count').default(0).notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_outbox_messages_public_id_uq').on(table.publicId),
    uniqueIndex('notification_outbox_messages_event_uq').on(table.notificationEventId),
    index('notification_outbox_messages_due_idx').on(table.status, table.availableAt),
    index('notification_outbox_messages_lease_idx').on(table.status, table.lockedUntil),
    check(
      'notification_outbox_messages_counts_ck',
      sql`${table.attemptCount} >= 0 AND ${table.maxAttempts} > 0
          AND ${table.replayCount} >= 0 AND ${table.version} > 0`,
    ),
    check(
      'notification_outbox_messages_state_ck',
      sql`(
        ${table.status} = 'pending' AND ${table.lockToken} IS NULL AND ${table.lockedBy} IS NULL
        AND ${table.lockedUntil} IS NULL AND ${table.completedAt} IS NULL
        AND ${table.deadLetteredAt} IS NULL
      ) OR (
        ${table.status} = 'processing' AND ${table.lockToken} IS NOT NULL
        AND length(btrim(${table.lockedBy})) > 0 AND ${table.lockedUntil} IS NOT NULL
        AND ${table.completedAt} IS NULL AND ${table.deadLetteredAt} IS NULL
      ) OR (
        ${table.status} = 'completed' AND ${table.lockToken} IS NULL AND ${table.lockedBy} IS NULL
        AND ${table.lockedUntil} IS NULL AND ${table.completedAt} IS NOT NULL
        AND ${table.deadLetteredAt} IS NULL
      ) OR (
        ${table.status} = 'dead_letter' AND ${table.lockToken} IS NULL
        AND ${table.lockedBy} IS NULL AND ${table.lockedUntil} IS NULL
        AND ${table.completedAt} IS NULL AND ${table.deadLetteredAt} IS NOT NULL
      )`,
    ),
  ],
);

export const inAppNotifications = pgTable(
  'in_app_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    notificationEventId: uuid('notification_event_id')
      .notNull()
      .references(() => notificationEvents.id, { onDelete: 'restrict' }),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('in_app_notifications_public_id_uq').on(table.publicId),
    uniqueIndex('in_app_notifications_event_uq').on(table.notificationEventId),
    index('in_app_notifications_recipient_timeline_idx').on(
      table.recipientUserId,
      table.archivedAt,
      table.createdAt,
    ),
    check(
      'in_app_notifications_archive_ck',
      sql`${table.archivedAt} IS NULL OR ${table.readAt} IS NOT NULL`,
    ),
  ],
);

export const notificationDeliveryAttempts = pgTable(
  'notification_delivery_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    notificationOutboxMessageId: uuid('notification_outbox_message_id')
      .notNull()
      .references(() => notificationOutboxMessages.id, { onDelete: 'restrict' }),
    attemptNumber: integer('attempt_number').notNull(),
    channel: notificationChannel('channel').notNull(),
    status: notificationDeliveryStatus('status').notNull(),
    errorCode: text('error_code'),
    adapterReceiptId: text('adapter_receipt_id'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('notification_delivery_attempts_public_id_uq').on(table.publicId),
    uniqueIndex('notification_delivery_attempts_message_attempt_channel_uq').on(
      table.notificationOutboxMessageId,
      table.attemptNumber,
      table.channel,
    ),
    index('notification_delivery_attempts_message_idx').on(
      table.notificationOutboxMessageId,
      table.attemptNumber,
    ),
    check('notification_delivery_attempts_number_ck', sql`${table.attemptNumber} > 0`),
    check(
      'notification_delivery_attempts_external_channel_ck',
      sql`${table.channel} IN ('push','email')`,
    ),
    check(
      'notification_delivery_attempts_error_code_ck',
      sql`${table.errorCode} IS NULL OR ${table.errorCode} ~ '^[A-Z0-9_]{1,80}$'`,
    ),
    check(
      'notification_delivery_attempts_shape_ck',
      sql`(
        ${table.status} IN ('no_send','delivered') AND ${table.adapterReceiptId} IS NOT NULL
        AND ${table.errorCode} IS NULL
      ) OR (
        ${table.status} IN ('suppressed','failed') AND ${table.adapterReceiptId} IS NULL
        AND ${table.errorCode} IS NOT NULL
      )`,
    ),
  ],
);

export const notificationOutboxStatusHistory = pgTable(
  'notification_outbox_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationOutboxMessageId: uuid('notification_outbox_message_id')
      .notNull()
      .references(() => notificationOutboxMessages.id, { onDelete: 'restrict' }),
    fromStatus: notificationOutboxStatus('from_status'),
    toStatus: notificationOutboxStatus('to_status').notNull(),
    outboxVersion: integer('outbox_version').notNull(),
    attemptCount: integer('attempt_count').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'restrict' }),
    actorType: auditActorType('actor_type').notNull(),
    reason: text('reason').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_outbox_status_history_version_uq').on(
      table.notificationOutboxMessageId,
      table.outboxVersion,
    ),
    index('notification_outbox_status_history_timeline_idx').on(
      table.notificationOutboxMessageId,
      table.occurredAt,
    ),
    check(
      'notification_outbox_status_history_counts_ck',
      sql`${table.outboxVersion} > 0 AND ${table.attemptCount} >= 0`,
    ),
    check('notification_outbox_status_history_reason_ck', sql`length(btrim(${table.reason})) > 0`),
  ],
);

export const localityVerifications = pgTable(
  'locality_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => creatorProfiles.userId, { onDelete: 'restrict' }),
    status: localityVerificationStatus('status').default('pending_review').notNull(),
    method: localityVerificationMethod('method').notNull(),
    declaredPostalArea: text('declared_postal_area').notNull(),
    evidenceReference: text('evidence_reference'),
    reviewPolicyVersion: text('review_policy_version').default('locality-v1').notNull(),
    reviewerUserId: uuid('reviewer_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    reviewReason: localityReviewReason('review_reason'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    appealDeadline: timestamp('appeal_deadline', { withTimezone: true }),
    appealedAt: timestamp('appealed_at', { withTimezone: true }),
    appealReason: localityAppealReason('appeal_reason'),
    appealReviewerUserId: uuid('appeal_reviewer_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    appealDecidedAt: timestamp('appeal_decided_at', { withTimezone: true }),
    verificationCompletedAt: timestamp('verification_completed_at', { withTimezone: true }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    evidenceDeletionDueAt: timestamp('evidence_deletion_due_at', { withTimezone: true }),
    evidenceDeletedAt: timestamp('evidence_deleted_at', { withTimezone: true }),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    invalidationReason: text('invalidation_reason'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('locality_verifications_public_id_uq').on(table.publicId),
    uniqueIndex('locality_verifications_active_creator_uq')
      .on(table.creatorUserId)
      .where(sql`${table.status} IN ('pending_review', 'correction_needed', 'appeal_pending')`),
    index('locality_verifications_creator_created_idx').on(table.creatorUserId, table.createdAt),
    index('locality_verifications_expiry_idx').on(table.status, table.expiresAt),
    index('locality_verifications_deletion_due_idx').on(
      table.evidenceDeletionDueAt,
      table.evidenceDeletedAt,
    ),
    check('locality_verifications_postal_area_ck', sql`${table.declaredPostalArea} ~ '^[0-9]{5}$'`),
    check(
      'locality_verifications_evidence_reference_ck',
      sql`${table.evidenceReference} IS NULL OR ${table.evidenceReference} ~ '^private/locality/[a-z0-9/_-]{8,180}$'`,
    ),
    check(
      'locality_verifications_policy_ck',
      sql`${table.reviewPolicyVersion} ~ '^[a-z0-9][a-z0-9._-]{2,39}$'`,
    ),
    check(
      'locality_verifications_verified_shape_ck',
      sql`${table.status} NOT IN ('verified', 'expired') OR (
        ${table.reviewReason} = 'approved' AND ${table.reviewedAt} IS NOT NULL
        AND ${table.verificationCompletedAt} IS NOT NULL AND ${table.verifiedAt} IS NOT NULL
        AND ${table.expiresAt} > ${table.verifiedAt}
      )`,
    ),
    check(
      'locality_verifications_deleted_shape_ck',
      sql`${table.evidenceDeletedAt} IS NULL OR ${table.evidenceReference} IS NULL`,
    ),
    check(
      'locality_verifications_invalidation_ck',
      sql`${table.status} <> 'invalidated' OR (
        ${table.invalidatedAt} IS NOT NULL AND length(btrim(${table.invalidationReason})) > 0
      )`,
    ),
    check('locality_verifications_version_positive_ck', sql`${table.version} > 0`),
  ],
);

export const localityVerificationStatusHistory = pgTable(
  'locality_verification_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    localityVerificationId: uuid('locality_verification_id')
      .notNull()
      .references(() => localityVerifications.id, { onDelete: 'restrict' }),
    fromStatus: localityVerificationStatus('from_status'),
    toStatus: localityVerificationStatus('to_status').notNull(),
    verificationVersion: integer('verification_version').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    actorType: auditActorType('actor_type').notNull(),
    reasonCode: text('reason_code').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('locality_verification_status_history_version_uq').on(
      table.localityVerificationId,
      table.verificationVersion,
    ),
    index('locality_verification_status_history_timeline_idx').on(
      table.localityVerificationId,
      table.occurredAt,
    ),
    check(
      'locality_verification_status_history_reason_ck',
      sql`${table.reasonCode} ~ '^[A-Z0-9_]{2,80}$'`,
    ),
    check('locality_verification_status_history_version_ck', sql`${table.verificationVersion} > 0`),
  ],
);

export const localityLegalHolds = pgTable(
  'locality_legal_holds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localityVerificationId: uuid('locality_verification_id')
      .notNull()
      .references(() => localityVerifications.id, { onDelete: 'restrict' }),
    caseId: text('case_id').notNull(),
    reason: localityLegalHoldReason('reason').notNull(),
    scope: text('scope').default('locality_evidence').notNull(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reviewAt: timestamp('review_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    releasedByUserId: uuid('released_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('locality_legal_holds_public_id_uq').on(table.publicId),
    uniqueIndex('locality_legal_holds_case_uq').on(table.caseId),
    uniqueIndex('locality_legal_holds_active_verification_uq')
      .on(table.localityVerificationId)
      .where(sql`${table.releasedAt} IS NULL`),
    index('locality_legal_holds_expiry_idx').on(table.expiresAt, table.releasedAt),
    check('locality_legal_holds_case_ck', sql`${table.caseId} ~ '^[A-Z0-9_-]{6,80}$'`),
    check('locality_legal_holds_scope_ck', sql`${table.scope} = 'locality_evidence'`),
    check(
      'locality_legal_holds_window_ck',
      sql`${table.reviewAt} > ${table.createdAt} AND ${table.reviewAt} <= ${table.expiresAt}
        AND ${table.expiresAt} <= ${table.createdAt} + interval '90 days'`,
    ),
    check(
      'locality_legal_holds_release_ck',
      sql`(${table.releasedAt} IS NULL AND ${table.releasedByUserId} IS NULL)
        OR (${table.releasedAt} IS NOT NULL AND ${table.releasedByUserId} IS NOT NULL)`,
    ),
    check('locality_legal_holds_version_ck', sql`${table.version} > 0`),
  ],
);

export const localityEvidenceDeletionJobs = pgTable(
  'locality_evidence_deletion_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localityVerificationId: uuid('locality_verification_id')
      .notNull()
      .references(() => localityVerifications.id, { onDelete: 'restrict' }),
    status: localityEvidenceDeletionStatus('status').default('pending').notNull(),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(5).notNull(),
    lockToken: uuid('lock_token'),
    lockedBy: text('locked_by'),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastErrorCode: text('last_error_code'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    deadLetteredAt: timestamp('dead_lettered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => [
    uniqueIndex('locality_evidence_deletion_jobs_public_id_uq').on(table.publicId),
    uniqueIndex('locality_evidence_deletion_jobs_verification_uq').on(table.localityVerificationId),
    index('locality_evidence_deletion_jobs_due_idx').on(table.status, table.availableAt),
    check(
      'locality_evidence_deletion_jobs_attempts_ck',
      sql`${table.attemptCount} >= 0 AND ${table.maxAttempts} BETWEEN 1 AND 10
        AND ${table.attemptCount} <= ${table.maxAttempts}`,
    ),
    check(
      'locality_evidence_deletion_jobs_lock_ck',
      sql`(${table.status} = 'processing' AND ${table.lockToken} IS NOT NULL
        AND ${table.lockedBy} IS NOT NULL AND ${table.lockedUntil} IS NOT NULL)
        OR (${table.status} <> 'processing' AND ${table.lockToken} IS NULL
        AND ${table.lockedBy} IS NULL AND ${table.lockedUntil} IS NULL)`,
    ),
    check(
      'locality_evidence_deletion_jobs_error_ck',
      sql`${table.lastErrorCode} IS NULL OR ${table.lastErrorCode} ~ '^[A-Z0-9_]{2,80}$'`,
    ),
    check(
      'locality_evidence_deletion_jobs_terminal_ck',
      sql`(${table.status} = 'completed' AND ${table.completedAt} IS NOT NULL
        AND ${table.deadLetteredAt} IS NULL)
        OR (${table.status} = 'dead_letter' AND ${table.deadLetteredAt} IS NOT NULL
        AND ${table.completedAt} IS NULL)
        OR (${table.status} IN ('pending', 'processing') AND ${table.completedAt} IS NULL
        AND ${table.deadLetteredAt} IS NULL)`,
    ),
    check('locality_evidence_deletion_jobs_version_ck', sql`${table.version} > 0`),
  ],
);

export const localityEvidenceDeletionAttempts = pgTable(
  'locality_evidence_deletion_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localityEvidenceDeletionJobId: uuid('locality_evidence_deletion_job_id')
      .notNull()
      .references(() => localityEvidenceDeletionJobs.id, { onDelete: 'restrict' }),
    attemptNumber: integer('attempt_number').notNull(),
    outcome: localityEvidenceDeletionOutcome('outcome').notNull(),
    workerId: text('worker_id').notNull(),
    errorCode: text('error_code'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('locality_evidence_deletion_attempts_public_id_uq').on(table.publicId),
    uniqueIndex('locality_evidence_deletion_attempts_number_uq').on(
      table.localityEvidenceDeletionJobId,
      table.attemptNumber,
    ),
    index('locality_evidence_deletion_attempts_job_idx').on(table.localityEvidenceDeletionJobId),
    check('locality_evidence_deletion_attempts_number_ck', sql`${table.attemptNumber} > 0`),
    check(
      'locality_evidence_deletion_attempts_error_ck',
      sql`(${table.outcome} = 'failed' AND ${table.errorCode} ~ '^[A-Z0-9_]{2,80}$')
        OR (${table.outcome} <> 'failed' AND ${table.errorCode} IS NULL)`,
    ),
    check(
      'locality_evidence_deletion_attempts_time_ck',
      sql`${table.completedAt} >= ${table.startedAt}`,
    ),
  ],
);

export const localityRetentionAlerts = pgTable(
  'locality_retention_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicId: text('public_id').notNull(),
    localityEvidenceDeletionJobId: uuid('locality_evidence_deletion_job_id')
      .notNull()
      .references(() => localityEvidenceDeletionJobs.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    attemptCount: integer('attempt_count').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('locality_retention_alerts_public_id_uq').on(table.publicId),
    uniqueIndex('locality_retention_alerts_job_uq').on(table.localityEvidenceDeletionJobId),
    check(
      'locality_retention_alerts_code_ck',
      sql`${table.code} = 'LOCALITY_EVIDENCE_DELETION_FAILED'`,
    ),
    check('locality_retention_alerts_attempts_ck', sql`${table.attemptCount} > 0`),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id'),
    actorType: auditActorType('actor_type').notNull(),
    action: text('action').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('audit_events_subject_idx').on(table.subjectType, table.subjectId)],
);

export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operation: text('operation').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idempotency_records_operation_key_uq').on(table.operation, table.idempotencyKey),
    check(
      'idempotency_records_response_status_ck',
      sql`${table.responseStatus} IS NULL OR ${table.responseStatus} BETWEEN 200 AND 599`,
    ),
  ],
);

export const initialSchemaTables = [
  'users',
  'external_identities',
  'creator_profiles',
  'businesses',
  'business_memberships',
  'platform_staff_memberships',
  'business_locations',
  'campaigns',
  'campaign_status_history',
  'mission_templates',
  'campaign_brief_versions',
  'deliverable_requirements',
  'mission_slots',
  'mission_applications',
  'slot_reservations',
  'mission_application_status_history',
  'mission_assignments',
  'mission_assignment_status_history',
  'venue_staff_assignments',
  'check_in_challenges',
  'check_in_events',
  'media_assets',
  'submission_attempts',
  'submission_assets',
  'submission_evidence',
  'submission_status_history',
  'correction_requests',
  'submission_review_decisions',
  'submission_disputes',
  'dispute_evidence_items',
  'dispute_status_history',
  'dispute_resolutions',
  'financial_action_intents',
  'payment_provider_references',
  'campaign_funding_snapshots',
  'slot_funding_allocations',
  'ledger_accounts',
  'ledger_transactions',
  'ledger_entries',
  'local_pass_offers',
  'local_pass_offer_status_history',
  'local_pass_links',
  'local_pass_claims',
  'local_pass_claim_tokens',
  'local_pass_claim_status_history',
  'local_pass_redemptions',
  'local_pass_attribution_events',
  'local_pass_customer_challenges',
  'local_pass_fulfillment_incidents',
  'local_pass_fulfillment_incident_history',
  'legal_document_versions',
  'mission_rights_offers',
  'mission_contract_acceptances',
  'content_licenses',
  'content_license_assets',
  'content_license_channels',
  'content_license_status_history',
  'notification_preferences',
  'notification_preference_history',
  'notification_events',
  'notification_outbox_messages',
  'in_app_notifications',
  'notification_delivery_attempts',
  'notification_outbox_status_history',
  'locality_verifications',
  'locality_verification_status_history',
  'locality_legal_holds',
  'locality_evidence_deletion_jobs',
  'locality_evidence_deletion_attempts',
  'locality_retention_alerts',
  'audit_events',
  'idempotency_records',
] as const;
