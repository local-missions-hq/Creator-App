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
  'business_locations',
  'campaigns',
  'campaign_status_history',
  'audit_events',
  'idempotency_records',
] as const;
