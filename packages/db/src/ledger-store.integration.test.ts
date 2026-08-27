import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { CampaignStore } from './campaign-store.js';
import { LedgerStore } from './ledger-store.js';
import { MissionApplicationStore } from './mission-application-store.js';
import { SubmissionStore } from './submission-store.js';
import { IdentityTenantStore } from './tenant-store.js';

const migrationPathsBeforeLedger = [
  fileURLToPath(new URL('../drizzle/0000_giant_snowbird.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0001_empty_tyrannus.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0002_material_rachel_grey.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0003_orange_tempest.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0004_handy_gideon.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0005_huge_agent_brand.sql', import.meta.url)),
];
const ledgerMigration = fileURLToPath(new URL('../drizzle/0006_dapper_mordo.sql', import.meta.url));
const currentSchemaMigrations = [
  '0007_thick_sharon_ventura.sql',
  '0008_fair_sheva_callister.sql',
  '0009_nifty_scorpion.sql',
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const databaseName = `local_missions_m3_ledger_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let campaignStore: CampaignStore;
let ledgerStore: LedgerStore;
let missionStore: MissionApplicationStore;
let submissionStore: SubmissionStore;
let tenantStore: IdentityTenantStore;
let upgradeProof: { intentPublicId: string; intentStatus: string; ownerPublicId: string };

type TestSlot =
  | number
  | {
      baseRewardMinor: number;
      bonusRewardMinor: number;
      reachLevel: 'level_1' | 'level_2' | 'level_3';
      type: 'reach';
    };

async function applyMigration(path: string): Promise<void> {
  const migration = await readFile(path, 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) {
    if (statement.trim()) await pool.query(statement);
  }
}

async function createUpgradeProof(): Promise<{ intentId: string; intentPublicId: string }> {
  const owner = await pool.query<{ id: string }>(
    `INSERT INTO users (public_id) VALUES ('usr_ledger_upgrade_owner') RETURNING id`,
  );
  const creator = await pool.query<{ id: string }>(
    `INSERT INTO users (public_id) VALUES ('usr_ledger_upgrade_creator') RETURNING id`,
  );
  const ownerId = owner.rows[0]?.id;
  const creatorId = creator.rows[0]?.id;
  if (!ownerId || !creatorId) throw new Error('Upgrade users missing.');
  const business = await pool.query<{ id: string }>(
    `INSERT INTO businesses (public_id, name) VALUES ('biz_ledger_upgrade', 'Upgrade Venue') RETURNING id`,
  );
  const businessId = business.rows[0]?.id;
  if (!businessId) throw new Error('Upgrade business missing.');
  const location = await pool.query<{ id: string }>(
    `INSERT INTO business_locations (
       public_id, business_id, name, address_line_1, city, region, postal_code, timezone
     ) VALUES (
       'loc_ledger_upgrade', $1, 'Upgrade Venue', '100 Synthetic Way',
       'Orlando', 'FL', '32801', 'America/New_York'
     ) RETURNING id`,
    [businessId],
  );
  const campaign = await pool.query<{ id: string }>(
    `INSERT INTO campaigns (
       public_id, business_id, title, status, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES ('cmp_ledger_upgrade', $1, 'Upgrade campaign', 'approved', 5000, 750, 5750, 'USD', 1)
     RETURNING id`,
    [businessId],
  );
  const campaignId = campaign.rows[0]?.id;
  const locationId = location.rows[0]?.id;
  if (!campaignId || !locationId) throw new Error('Upgrade campaign dependencies missing.');
  const template = await pool.query<{ id: string }>(
    `INSERT INTO mission_templates (code, version, name, checklist_schema)
     VALUES ('visit_create', 1, 'Visit & Create', '{"type":"object"}'::jsonb)
     RETURNING id`,
  );
  const templateId = template.rows[0]?.id;
  if (!templateId) throw new Error('Upgrade template missing.');
  const brief = await pool.query<{ id: string }>(
    `INSERT INTO campaign_brief_versions (
       campaign_id, version, mission_template_id, plain_language_brief, checklist, created_by
     ) VALUES ($1, 1, $2, 'Complete the objective visit.', '{}'::jsonb, $3) RETURNING id`,
    [campaignId, templateId, ownerId],
  );
  const slot = await pool.query<{ id: string }>(
    `INSERT INTO mission_slots (
       public_id, campaign_id, ordinal, type, status, base_reward_minor,
       bonus_reward_minor, reward_minor, currency
     ) VALUES ('slot_ledger_upgrade', $1, 1, 'community', 'completed', 5000, 0, 5000, 'USD')
     RETURNING id`,
    [campaignId],
  );
  const application = await pool.query<{ id: string }>(
    `INSERT INTO mission_applications (public_id, campaign_id, creator_user_id, status)
     VALUES ('app_ledger_upgrade', $1, $2, 'completed') RETURNING id`,
    [campaignId, creatorId],
  );
  const briefId = brief.rows[0]?.id;
  const slotId = slot.rows[0]?.id;
  const applicationId = application.rows[0]?.id;
  if (!briefId || !slotId || !applicationId) throw new Error('Upgrade assignment inputs missing.');
  const assignment = await pool.query<{ id: string }>(
    `INSERT INTO mission_assignments (
       public_id, application_id, campaign_id, campaign_brief_version_id,
       mission_slot_id, creator_user_id, business_location_id, window_starts_at,
       window_ends_at, timezone, status, created_by
     ) VALUES (
       'asn_ledger_upgrade', $1, $2, $3, $4, $5, $6,
       now() - interval '1 hour', now() + interval '1 hour',
       'America/New_York', 'completed', $7
     ) RETURNING id`,
    [applicationId, campaignId, briefId, slotId, creatorId, locationId, ownerId],
  );
  const assignmentId = assignment.rows[0]?.id;
  if (!assignmentId) throw new Error('Upgrade assignment missing.');
  const intentPublicId = 'fin_ledger_upgrade';
  const intent = await pool.query<{ id: string }>(
    `INSERT INTO financial_action_intents (
       public_id, mission_assignment_id, source_type, source_id, action
     ) VALUES ($1, $2, 'submission_approval', $3, 'creator_payable_full') RETURNING id`,
    [intentPublicId, assignmentId, randomUUID()],
  );
  const intentId = intent.rows[0]?.id;
  if (!intentId) throw new Error('Upgrade intent missing.');
  return { intentId, intentPublicId };
}

async function createApprovedCampaign(
  rewards: readonly TestSlot[] = [5_000],
): Promise<{ businessId: string; campaignId: string; ownerUserId: string; slotIds: string[] }> {
  const configuredSlots = rewards.map((reward) =>
    typeof reward === 'number'
      ? {
          baseRewardMinor: reward,
          bonusRewardMinor: 0,
          reachLevel: undefined,
          type: 'community' as const,
        }
      : reward,
  );
  const owner = await tenantStore.createUserWithIdentity({
    correlationId: randomUUID(),
    issuer: 'https://identity.local.test/v1',
    provider: 'apple',
    publicId: `usr_owner_${randomUUID()}`,
    subject: `subject_owner_${randomUUID()}`,
  });
  const businessId = await tenantStore.createBusinessWithOwner({
    correlationId: randomUUID(),
    name: 'Synthetic Ledger Cafe',
    ownerUserId: owner.id,
    publicId: `biz_${randomUUID()}`,
  });
  const rewardPool = configuredSlots.reduce(
    (sum, slot) => sum + slot.baseRewardMinor + slot.bonusRewardMinor,
    0,
  );
  const platformFee = Math.floor((rewardPool * 15 + 50) / 100);
  let campaign = await campaignStore.createDraftCampaign({
    actorId: owner.id,
    businessId,
    correlationId: randomUUID(),
    creatorRewardPoolMinor: rewardPool,
    currency: 'USD',
    idempotencyKey: `create_${randomUUID()}`,
    platformFeeMinor: platformFee,
    publicId: `cmp_${randomUUID()}`,
    slotCount: rewards.length,
    title: 'Synthetic funded mission',
    totalDueMinor: rewardPool + platformFee,
  });
  await missionStore.configureCampaignContract({
    actorUserId: owner.id,
    campaignId: campaign.id,
    checklist: { photos: 1 },
    correlationId: randomUUID(),
    missionTemplateCode: 'visit_create',
    missionTemplateVersion: 1,
    plainLanguageBrief: 'Complete one objective local visit deliverable.',
    slots: configuredSlots.map((slot, index) => ({
      baseRewardMinor: slot.baseRewardMinor,
      bonusRewardMinor: slot.bonusRewardMinor,
      currency: 'USD',
      ordinal: index + 1,
      publicId: `slot_${campaign.publicId}_${index + 1}`,
      reachLevel: slot.reachLevel,
      type: slot.type,
    })),
  });
  await submissionStore.configureDeliverableRequirements({
    actorUserId: owner.id,
    campaignId: campaign.id,
    correlationId: randomUUID(),
    requirements: [
      {
        allowedMimeTypes: ['image/jpeg'],
        objectiveDescription: 'Provide one original photo.',
        ordinal: 1,
        publicId: `req_${campaign.publicId}`,
        requiredCount: 1,
        type: 'photo',
      },
    ],
  });
  for (const status of ['submitted', 'approved'] as const) {
    campaign = await campaignStore.transitionCampaign({
      actorId: owner.id,
      campaignId: campaign.id,
      correlationId: randomUUID(),
      expectedVersion: campaign.version,
      idempotencyKey: `${status}_${randomUUID()}`,
      toStatus: status,
    });
  }
  const databaseSlots = await pool.query<{ id: string }>(
    `SELECT id FROM mission_slots WHERE campaign_id = $1 ORDER BY ordinal`,
    [campaign.id],
  );
  return {
    businessId,
    campaignId: campaign.id,
    ownerUserId: owner.id,
    slotIds: databaseSlots.rows.map((row) => row.id),
  };
}

async function fundCampaign(campaignId: string, suffix: string = randomUUID()) {
  const providerEventId = `evt_${suffix}`;
  const providerObjectId = `pi_${suffix}`;
  const record = await ledgerStore.recordCampaignFunding({
    campaignId,
    correlationId: randomUUID(),
    fundedAt: new Date('2026-08-27T12:00:00.000Z'),
    fundingPublicId: `fund_${suffix}`,
    ledgerTransactionPublicId: `ledger_funding_${suffix}`,
    provider: 'stripe',
    providerAccountReference: 'acct_platform_test',
    providerEventId,
    providerObjectId,
    providerReferencePublicId: `provider_${suffix}`,
    transferGroup: `transfer_group_${suffix}`,
  });
  return { providerEventId, providerObjectId, record };
}

async function createFinalIntent(input: {
  action: 'creator_payable_full' | 'slot_refund_full';
  businessId: string;
  campaignId: string;
  ownerUserId: string;
  slotId: string;
}): Promise<{ assignmentId: string; creatorUserId: string; intentId: string }> {
  const creator = await pool.query<{ id: string }>(
    `INSERT INTO users (public_id) VALUES ($1) RETURNING id`,
    [`usr_creator_${randomUUID()}`],
  );
  const creatorUserId = creator.rows[0]?.id;
  if (!creatorUserId) throw new Error('Creator fixture missing.');
  const location = await pool.query<{ id: string }>(
    `INSERT INTO business_locations (
       public_id, business_id, name, address_line_1, city, region, postal_code, timezone
     ) VALUES ($1, $2, 'Ledger Venue', '200 Synthetic Way', 'Orlando', 'FL', '32801',
               'America/New_York') RETURNING id`,
    [`loc_${randomUUID()}`, input.businessId],
  );
  const brief = await pool.query<{ id: string }>(
    `SELECT id FROM campaign_brief_versions WHERE campaign_id = $1 AND version = 1`,
    [input.campaignId],
  );
  const finalStatus = input.action === 'creator_payable_full' ? 'completed' : 'no_payout';
  await pool.query(`UPDATE mission_slots SET status = $2 WHERE id = $1`, [
    input.slotId,
    finalStatus,
  ]);
  const application = await pool.query<{ id: string }>(
    `INSERT INTO mission_applications (public_id, campaign_id, creator_user_id, status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [`app_${randomUUID()}`, input.campaignId, creatorUserId, finalStatus],
  );
  const applicationId = application.rows[0]?.id;
  const locationId = location.rows[0]?.id;
  const briefId = brief.rows[0]?.id;
  if (!applicationId || !locationId || !briefId) throw new Error('Assignment inputs missing.');
  const assignment = await pool.query<{ id: string }>(
    `INSERT INTO mission_assignments (
       public_id, application_id, campaign_id, campaign_brief_version_id, mission_slot_id,
       creator_user_id, business_location_id, window_starts_at, window_ends_at, timezone,
       status, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, now() - interval '1 hour',
               now() + interval '1 hour', 'America/New_York', $8, $9) RETURNING id`,
    [
      `asn_${randomUUID()}`,
      applicationId,
      input.campaignId,
      briefId,
      input.slotId,
      creatorUserId,
      locationId,
      finalStatus,
      input.ownerUserId,
    ],
  );
  const assignmentId = assignment.rows[0]?.id;
  if (!assignmentId) throw new Error('Assignment missing.');
  const intent = await pool.query<{ id: string }>(
    `INSERT INTO financial_action_intents (
       public_id, mission_assignment_id, source_type, source_id, action
     ) VALUES ($1, $2, 'dispute_resolution', $3, $4) RETURNING id`,
    [`fin_${randomUUID()}`, assignmentId, randomUUID(), input.action],
  );
  const intentId = intent.rows[0]?.id;
  if (!intentId) throw new Error('Intent missing.');
  return { assignmentId, creatorUserId, intentId };
}

async function addPlatformStaff(role: 'admin' | 'dispute_reviewer' | 'finance_operator') {
  const user = await pool.query<{ id: string }>(
    `INSERT INTO users (public_id) VALUES ($1) RETURNING id`,
    [`usr_staff_${role}_${randomUUID()}`],
  );
  const userId = user.rows[0]?.id;
  if (!userId) throw new Error('Staff user missing.');
  await pool.query(
    `INSERT INTO platform_staff_memberships (public_id, user_id, role, status)
     VALUES ($1, $2, $3, 'active')`,
    [`staff_${role}_${randomUUID()}`, userId, role],
  );
  return userId;
}

async function countRows(table: string, where = '', values: unknown[] = []): Promise<number> {
  if (!/^[a-z_]+$/.test(table)) throw new Error('Unsafe table name in test.');
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${table} ${where}`,
    values,
  );
  return Number(result.rows[0]?.count ?? 0);
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 20 });
  for (const migrationPath of migrationPathsBeforeLedger) await applyMigration(migrationPath);
  const beforeUpgrade = await createUpgradeProof();
  await applyMigration(ledgerMigration);
  for (const migration of currentSchemaMigrations) await applyMigration(migration);
  const preserved = await pool.query<{
    intent_public_id: string;
    intent_status: string;
    owner_public_id: string;
  }>(
    `SELECT intent.public_id AS intent_public_id, intent.status AS intent_status,
            owner.public_id AS owner_public_id
       FROM financial_action_intents intent
       JOIN mission_assignments assignment ON assignment.id = intent.mission_assignment_id
       JOIN users owner ON owner.public_id = 'usr_ledger_upgrade_owner'
      WHERE intent.id = $1`,
    [beforeUpgrade.intentId],
  );
  const row = preserved.rows[0];
  if (!row) throw new Error('Ledger migration did not preserve the prior intent.');
  upgradeProof = {
    intentPublicId: row.intent_public_id,
    intentStatus: row.intent_status,
    ownerPublicId: row.owner_public_id,
  };
  campaignStore = new CampaignStore(pool);
  ledgerStore = new LedgerStore(pool);
  missionStore = new MissionApplicationStore(pool);
  submissionStore = new SubmissionStore(pool);
  tenantStore = new IdentityTenantStore(pool);
}, 30_000);

beforeEach(async () => {
  await pool.query(
    `TRUNCATE ledger_entries, ledger_transactions, ledger_accounts,
              slot_funding_allocations, campaign_funding_snapshots,
              payment_provider_references, financial_action_intents,
              idempotency_records, audit_events, dispute_resolutions,
              dispute_status_history, dispute_evidence_items, submission_disputes,
              submission_review_decisions, correction_requests, submission_status_history,
              submission_evidence, submission_assets, submission_attempts, media_assets,
              check_in_events, check_in_challenges, venue_staff_assignments,
              mission_assignment_status_history, mission_assignments,
              mission_application_status_history, slot_reservations, mission_applications,
              deliverable_requirements, mission_slots, campaign_brief_versions,
              campaign_status_history, campaigns, platform_staff_memberships,
              business_locations, business_memberships, creator_profiles,
              external_identities, businesses, users, mission_templates CASCADE`,
  );
  await pool.query(
    `INSERT INTO mission_templates (code, version, name, checklist_schema)
     VALUES ('visit_create', 1, 'Visit & Create', '{"type":"object"}'::jsonb)`,
  );
});

afterAll(async () => {
  if (pool) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('LedgerStore against real PostgreSQL', () => {
  it('preserves the prior intent and installs immutable provider, allocation, and ledger tables', async () => {
    expect(upgradeProof).toEqual({
      intentPublicId: 'fin_ledger_upgrade',
      intentStatus: 'pending_ledger',
      ownerPublicId: 'usr_ledger_upgrade_owner',
    });
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN (
          'payment_provider_references', 'campaign_funding_snapshots',
          'slot_funding_allocations', 'ledger_accounts', 'ledger_transactions', 'ledger_entries'
        ) ORDER BY table_name`,
    );
    expect(tables.rows.map((row) => row.table_name)).toHaveLength(6);
    const columns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payment_provider_references'`,
    );
    expect(columns.rows.map((row) => row.column_name)).not.toContain('status');
    expect(columns.rows.map((row) => row.column_name)).not.toContain('secret');
    expect(columns.rows.map((row) => row.column_name)).not.toContain('amount');
  });

  it('records one authoritative campaign funding snapshot and prevents business self-funding', async () => {
    const fixture = await createApprovedCampaign(Array.from({ length: 10 }, () => 5_000));
    const approved = await campaignStore.getCampaign(fixture.campaignId, fixture.ownerUserId);
    await expect(
      campaignStore.transitionCampaign({
        actorId: fixture.ownerUserId,
        campaignId: fixture.campaignId,
        correlationId: randomUUID(),
        expectedVersion: approved.version,
        idempotencyKey: `business_funding_${randomUUID()}`,
        toStatus: 'funded',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_TRANSITION_CONFLICT' });

    const funded = await fundCampaign(fixture.campaignId, 'canonical_500');
    expect(funded.record).toMatchObject({
      creatorRewardPoolMinor: 50_000,
      platformFeeMinor: 7_500,
      totalDueMinor: 57_500,
    });
    expect(await campaignStore.getCampaign(fixture.campaignId, fixture.ownerUserId)).toMatchObject({
      status: 'funded',
      version: 4,
    });
    expect(await countRows('slot_funding_allocations')).toBe(10);
    expect(await countRows('ledger_transactions', `WHERE type = 'campaign_funding'`)).toBe(1);
    const balance = await pool.query<{ credits: string; debits: string }>(
      `SELECT sum(amount_minor) FILTER (WHERE direction = 'debit')::text AS debits,
              sum(amount_minor) FILTER (WHERE direction = 'credit')::text AS credits
         FROM ledger_entries`,
    );
    expect(balance.rows[0]).toEqual({ credits: '57500', debits: '57500' });
  });

  it('allocates the disclosed 15 percent fee deterministically in integer minor units', async () => {
    const fixture = await createApprovedCampaign([3_333, 3_333, 3_333, 3_333, 3_333]);
    await fundCampaign(fixture.campaignId, 'rounding');
    const allocations = await pool.query<{
      ordinal: number;
      platform_fee_minor: number;
      total_minor: number;
    }>(
      `SELECT slot.ordinal, allocation.platform_fee_minor, allocation.total_minor
         FROM slot_funding_allocations allocation
         JOIN mission_slots slot ON slot.id = allocation.mission_slot_id
        ORDER BY slot.ordinal`,
    );
    expect(allocations.rows).toEqual(
      Array.from({ length: 5 }, (_, index) => ({
        ordinal: index + 1,
        platform_fee_minor: 500,
        total_minor: 3_833,
      })),
    );
    expect(allocations.rows.reduce((sum, row) => sum + row.platform_fee_minor, 0)).toBe(2_500);
  });

  it('makes funding replay idempotent while different provider events have one race winner', async () => {
    const replayFixture = await createApprovedCampaign();
    const replayInput = {
      campaignId: replayFixture.campaignId,
      correlationId: randomUUID(),
      fundedAt: new Date('2026-08-27T12:00:00.000Z'),
      fundingPublicId: 'fund_replay',
      ledgerTransactionPublicId: 'ledger_funding_replay',
      provider: 'stripe' as const,
      providerAccountReference: 'acct_platform_test',
      providerEventId: 'evt_replay',
      providerObjectId: 'pi_replay',
      providerReferencePublicId: 'provider_replay',
      transferGroup: 'transfer_group_replay',
    };
    const replayed = await Promise.all([
      ledgerStore.recordCampaignFunding(replayInput),
      ledgerStore.recordCampaignFunding({ ...replayInput, correlationId: randomUUID() }),
    ]);
    expect(replayed[0]).toEqual(replayed[1]);
    expect(await countRows('campaign_funding_snapshots')).toBe(1);
    await expect(
      ledgerStore.recordCampaignFunding({
        ...replayInput,
        correlationId: randomUUID(),
        transferGroup: 'transfer_group_changed',
      }),
    ).rejects.toMatchObject({ code: 'LEDGER_ALREADY_FUNDED' });

    const raceFixture = await createApprovedCampaign();
    const attempts = await Promise.allSettled([
      fundCampaign(raceFixture.campaignId, 'race_a'),
      fundCampaign(raceFixture.campaignId, 'race_b'),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1);
    expect(await countRows('campaign_funding_snapshots')).toBe(2);
  });

  it('posts a completed slot once as full creator payable plus earned platform fee', async () => {
    const fixture = await createApprovedCampaign();
    await fundCampaign(fixture.campaignId, 'completion');
    const final = await createFinalIntent({
      action: 'creator_payable_full',
      ...fixture,
      slotId: fixture.slotIds[0]!,
    });
    const attempts = await Promise.all([
      ledgerStore.consumeFinancialActionIntent({
        correlationId: randomUUID(),
        intentId: final.intentId,
      }),
      ledgerStore.consumeFinancialActionIntent({
        correlationId: randomUUID(),
        intentId: final.intentId,
      }),
    ]);
    expect(attempts[0]).toEqual(attempts[1]);
    expect(attempts[0]).toMatchObject({ totalMinor: 5_750, type: 'slot_completion' });
    const entries = await pool.query<{
      amount_minor: number;
      code: string;
      direction: string;
    }>(
      `SELECT account.code, entry.direction, entry.amount_minor
         FROM ledger_entries entry
         JOIN ledger_accounts account ON account.id = entry.ledger_account_id
         JOIN ledger_transactions transaction ON transaction.id = entry.ledger_transaction_id
        WHERE transaction.type = 'slot_completion' ORDER BY entry.position`,
    );
    expect(entries.rows).toEqual([
      { amount_minor: 5_750, code: 'campaign_funds', direction: 'debit' },
      { amount_minor: 5_000, code: 'creator_payable', direction: 'credit' },
      { amount_minor: 750, code: 'platform_fee_revenue', direction: 'credit' },
    ]);
    expect(await countRows('ledger_transactions', `WHERE type = 'slot_completion'`)).toBe(1);
    expect(await countRows('financial_action_intents', `WHERE status = 'posted'`)).toBe(1);
  });

  it('posts a no-payout slot once as the full reward-and-fee business refund payable', async () => {
    const fixture = await createApprovedCampaign([12_500]);
    await fundCampaign(fixture.campaignId, 'refund');
    const final = await createFinalIntent({
      action: 'slot_refund_full',
      ...fixture,
      slotId: fixture.slotIds[0]!,
    });
    const posted = await ledgerStore.consumeFinancialActionIntent({
      correlationId: randomUUID(),
      intentId: final.intentId,
    });
    expect(posted).toMatchObject({ totalMinor: 14_375, type: 'slot_refund' });
    const entries = await pool.query<{ amount_minor: number; code: string; direction: string }>(
      `SELECT account.code, entry.direction, entry.amount_minor
         FROM ledger_entries entry
         JOIN ledger_accounts account ON account.id = entry.ledger_account_id
         JOIN ledger_transactions transaction ON transaction.id = entry.ledger_transaction_id
        WHERE transaction.type = 'slot_refund' ORDER BY entry.position`,
    );
    expect(entries.rows).toEqual([
      { amount_minor: 14_375, code: 'campaign_funds', direction: 'debit' },
      { amount_minor: 14_375, code: 'business_refund_payable', direction: 'credit' },
    ]);
    expect(await countRows('ledger_accounts', `WHERE code = 'creator_payable'`)).toBe(0);
    expect(await countRows('ledger_transactions', `WHERE type = 'slot_refund'`)).toBe(1);
  });

  it('includes the full Reach bonus and its fee allocation in a no-payout refund', async () => {
    const fixture = await createApprovedCampaign([
      5_000,
      5_000,
      5_000,
      5_000,
      {
        baseRewardMinor: 5_000,
        bonusRewardMinor: 10_000,
        reachLevel: 'level_3',
        type: 'reach',
      },
    ]);
    await fundCampaign(fixture.campaignId, 'reach_refund');
    const final = await createFinalIntent({
      action: 'slot_refund_full',
      ...fixture,
      slotId: fixture.slotIds[4]!,
    });
    const posted = await ledgerStore.consumeFinancialActionIntent({
      correlationId: randomUUID(),
      intentId: final.intentId,
    });
    expect(posted).toMatchObject({ totalMinor: 17_250, type: 'slot_refund' });
    const allocation = await pool.query<{
      creator_reward_minor: number;
      platform_fee_minor: number;
      total_minor: number;
    }>(
      `SELECT creator_reward_minor, platform_fee_minor, total_minor
         FROM slot_funding_allocations WHERE mission_slot_id = $1`,
      [fixture.slotIds[4]],
    );
    expect(allocation.rows[0]).toEqual({
      creator_reward_minor: 15_000,
      platform_fee_minor: 2_250,
      total_minor: 17_250,
    });
  });

  it('rejects unfunded and state-mismatched intents without partial financial rows', async () => {
    const unfunded = await createApprovedCampaign();
    const unfundedIntent = await createFinalIntent({
      action: 'creator_payable_full',
      ...unfunded,
      slotId: unfunded.slotIds[0]!,
    });
    await expect(
      ledgerStore.consumeFinancialActionIntent({
        correlationId: randomUUID(),
        intentId: unfundedIntent.intentId,
      }),
    ).rejects.toMatchObject({ code: 'LEDGER_INTENT_NOT_READY' });
    expect(await countRows('ledger_transactions')).toBe(0);

    const funded = await createApprovedCampaign();
    await fundCampaign(funded.campaignId, 'mismatch');
    const mismatch = await createFinalIntent({
      action: 'creator_payable_full',
      ...funded,
      slotId: funded.slotIds[0]!,
    });
    await pool.query(`UPDATE mission_slots SET status = 'no_payout' WHERE id = $1`, [
      funded.slotIds[0],
    ]);
    await expect(
      ledgerStore.consumeFinancialActionIntent({
        correlationId: randomUUID(),
        intentId: mismatch.intentId,
      }),
    ).rejects.toMatchObject({ code: 'LEDGER_INTENT_NOT_READY' });
    expect(await countRows('ledger_transactions', `WHERE type <> 'campaign_funding'`)).toBe(0);
  });

  it('separates finance authority and rejects rewrites or unbalanced direct journals', async () => {
    const fixture = await createApprovedCampaign();
    await fundCampaign(fixture.campaignId, 'immutable');
    const financeUserId = await addPlatformStaff('finance_operator');
    const adminUserId = await addPlatformStaff('admin');
    const accounts = await pool.query<{ id: string; public_id: string }>(
      `SELECT id, public_id FROM ledger_accounts ORDER BY public_id`,
    );
    const campaignAccount = accounts.rows.find((row) => row.public_id.includes('campaign_funds'));
    const providerAccount = accounts.rows.find((row) =>
      row.public_id.includes('provider_clearing'),
    );
    if (!campaignAccount || !providerAccount) throw new Error('Funding accounts missing.');
    const adjustment = {
      actorUserId: financeUserId,
      amountMinor: 125,
      correlationId: randomUUID(),
      creditAccountPublicId: providerAccount.public_id,
      currency: 'USD',
      debitAccountPublicId: campaignAccount.public_id,
      publicId: 'ledger_adjustment_case_1',
      reason: 'Synthetic reconciliation correction with ticket FIN-101.',
    };
    await expect(
      ledgerStore.postFinanceAdjustment({ ...adjustment, actorUserId: adminUserId }),
    ).rejects.toMatchObject({ code: 'LEDGER_ACCESS_DENIED' });
    const posted = await Promise.all([
      ledgerStore.postFinanceAdjustment(adjustment),
      ledgerStore.postFinanceAdjustment({ ...adjustment, correlationId: randomUUID() }),
    ]);
    expect(posted[0]).toEqual(posted[1]);
    await expect(
      ledgerStore.postFinanceAdjustment({ ...adjustment, amountMinor: 126 }),
    ).rejects.toMatchObject({ code: 'LEDGER_IDEMPOTENCY_CONFLICT' });

    const entry = await pool.query<{ id: string }>(
      `SELECT id FROM ledger_entries WHERE ledger_transaction_id = $1 LIMIT 1`,
      [posted[0].id],
    );
    await expect(
      pool.query(`UPDATE ledger_entries SET amount_minor = amount_minor + 1 WHERE id = $1`, [
        entry.rows[0]?.id,
      ]),
    ).rejects.toMatchObject({ code: '55000' });
    await expect(pool.query(`DELETE FROM payment_provider_references`)).rejects.toMatchObject({
      code: '55000',
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const bad = await client.query<{ id: string }>(
        `INSERT INTO ledger_transactions (
           public_id, type, source_type, source_public_id, request_hash,
           total_minor, currency, correlation_id, created_by_user_id, reason
         ) VALUES (
           'ledger_unbalanced', 'finance_adjustment', 'finance_adjustment',
           'ledger_unbalanced', 'synthetic-hash', 100, 'USD', $1, $2, 'Invalid direct journal'
         ) RETURNING id`,
        [randomUUID(), financeUserId],
      );
      await client.query(
        `INSERT INTO ledger_entries (
           public_id, ledger_transaction_id, position, ledger_account_id,
           direction, amount_minor, currency
         ) VALUES ('entry_unbalanced_1', $1, 1, $2, 'debit', 100, 'USD')`,
        [bad.rows[0]?.id, campaignAccount.id],
      );
      await expect(client.query('COMMIT')).rejects.toMatchObject({ code: '23514' });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});
