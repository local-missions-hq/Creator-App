import { sql } from 'drizzle-orm';
import {
  check,
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
  'businesses',
  'campaigns',
  'campaign_status_history',
  'audit_events',
  'idempotency_records',
] as const;
