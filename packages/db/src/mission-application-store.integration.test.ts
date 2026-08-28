import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { CampaignStore } from './campaign-store.js';
import { LedgerStore } from './ledger-store.js';
import { type CampaignSlotInput, MissionApplicationStore } from './mission-application-store.js';
import { SubmissionStore } from './submission-store.js';
import { IdentityTenantStore } from './tenant-store.js';

const migration0000 = fileURLToPath(new URL('../drizzle/0000_giant_snowbird.sql', import.meta.url));
const migration0001 = fileURLToPath(new URL('../drizzle/0001_empty_tyrannus.sql', import.meta.url));
const migration0002 = fileURLToPath(
  new URL('../drizzle/0002_material_rachel_grey.sql', import.meta.url),
);
const migration0003 = fileURLToPath(new URL('../drizzle/0003_orange_tempest.sql', import.meta.url));
const migration0004 = fileURLToPath(new URL('../drizzle/0004_handy_gideon.sql', import.meta.url));
const migration0005 = fileURLToPath(
  new URL('../drizzle/0005_huge_agent_brand.sql', import.meta.url),
);
const migration0006 = fileURLToPath(new URL('../drizzle/0006_dapper_mordo.sql', import.meta.url));
const currentSchemaMigrations = [
  '0007_thick_sharon_ventura.sql',
  '0008_fair_sheva_callister.sql',
  '0009_nifty_scorpion.sql',
  '0010_wide_lady_ursula.sql',
  '0011_perpetual_ender_wiggin.sql',
  '0012_notification_preference_history_backfill.sql',
  '0013_brave_maddog.sql',
  '0014_serious_terror.sql',
  '0015_slim_joshua_kane.sql',
  '0016_normal_meltdown.sql',
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const databaseName = `local_missions_m3_capacity_${randomUUID().replaceAll('-', '')}`;
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
let upgradeProof: { campaignTitle: string; totalDueMinor: number };

async function applyMigration(path: string): Promise<void> {
  const migration = await readFile(path, 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) {
    if (statement.trim()) await pool.query(statement);
  }
}

async function createUser(label: string): Promise<string> {
  const user = await tenantStore.createUserWithIdentity({
    correlationId: randomUUID(),
    issuer: 'https://identity.local.test/v1',
    provider: 'apple',
    publicId: `usr_${label}_${randomUUID()}`,
    subject: `subject_${label}_${randomUUID()}`,
  });
  return user.id;
}

async function createQualifiedCreator(label: string): Promise<string> {
  const userId = await createUser(label);
  await tenantStore.createCreatorProfile({
    correlationId: randomUUID(),
    localityExpiresAt: new Date('2099-12-31T23:59:59.000Z'),
    localityStatus: 'verified',
    localityVerifiedAt: new Date('2026-08-27T12:00:00.000Z'),
    publicId: `cr_${label}_${randomUUID()}`,
    userId,
    verifiedPostalArea: '32801',
  });
  await pool.query(`UPDATE creator_profiles SET status = 'approved' WHERE user_id = $1`, [userId]);
  return userId;
}

function communitySlots(campaignLabel: string, slotCount: number): CampaignSlotInput[] {
  return Array.from({ length: slotCount }, (_, index) => ({
    baseRewardMinor: 5_000,
    bonusRewardMinor: 0,
    currency: 'USD',
    ordinal: index + 1,
    publicId: `slot_${campaignLabel}_${index + 1}_${randomUUID()}`,
    type: 'community',
  }));
}

async function createPublishedCampaign(slotCount: number): Promise<{
  businessId: string;
  campaignId: string;
  ownerUserId: string;
}> {
  const ownerUserId = await createUser('owner');
  const businessId = await tenantStore.createBusinessWithOwner({
    correlationId: randomUUID(),
    name: 'Synthetic Local Business',
    ownerUserId,
    publicId: `biz_${randomUUID()}`,
  });
  let campaign = await campaignStore.createDraftCampaign({
    actorId: ownerUserId,
    businessId,
    correlationId: randomUUID(),
    creatorRewardPoolMinor: slotCount * 5_000,
    currency: 'USD',
    idempotencyKey: `create_${randomUUID()}`,
    platformFeeMinor: slotCount * 750,
    publicId: `cmp_${randomUUID()}`,
    slotCount,
    title: 'Synthetic Community Campaign',
    totalDueMinor: slotCount * 5_750,
  });
  await missionStore.configureCampaignContract({
    actorUserId: ownerUserId,
    campaignId: campaign.id,
    checklist: { clips: 2, photos: 5 },
    correlationId: randomUUID(),
    missionTemplateCode: 'visit_create',
    missionTemplateVersion: 1,
    plainLanguageBrief: 'Visit the venue and complete the objective content checklist.',
    slots: communitySlots(campaign.publicId, slotCount),
  });
  await submissionStore.configureDeliverableRequirements({
    actorUserId: ownerUserId,
    campaignId: campaign.id,
    correlationId: randomUUID(),
    requirements: [
      {
        allowedMimeTypes: ['image/jpeg'],
        minHeightPixels: 1080,
        minWidthPixels: 1080,
        objectiveDescription: 'Provide five clear original photos from the visit.',
        ordinal: 1,
        publicId: `req_${campaign.publicId}_photos`,
        requiredCount: 5,
        type: 'photo',
      },
    ],
  });
  for (const toStatus of ['submitted', 'approved'] as const) {
    campaign = await campaignStore.transitionCampaign({
      actorId: ownerUserId,
      campaignId: campaign.id,
      correlationId: randomUUID(),
      expectedVersion: campaign.version,
      idempotencyKey: `${toStatus}_${randomUUID()}`,
      toStatus,
    });
  }
  const fundingSuffix = randomUUID();
  await ledgerStore.recordCampaignFunding({
    campaignId: campaign.id,
    correlationId: randomUUID(),
    fundedAt: new Date(),
    fundingPublicId: `fund_${fundingSuffix}`,
    ledgerTransactionPublicId: `ledger_fund_${fundingSuffix}`,
    provider: 'stripe',
    providerAccountReference: 'acct_platform_test',
    providerEventId: `evt_${fundingSuffix}`,
    providerObjectId: `pi_${fundingSuffix}`,
    providerReferencePublicId: `provider_${fundingSuffix}`,
    transferGroup: `transfer_group_${fundingSuffix}`,
  });
  campaign = await campaignStore.getCampaign(campaign.id, ownerUserId);
  campaign = await campaignStore.transitionCampaign({
    actorId: ownerUserId,
    campaignId: campaign.id,
    correlationId: randomUUID(),
    expectedVersion: campaign.version,
    idempotencyKey: `published_${randomUUID()}`,
    toStatus: 'published',
  });
  return { businessId, campaignId: campaign.id, ownerUserId };
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
  await applyMigration(migration0000);
  await applyMigration(migration0001);

  const baselineBusinessId = '61000000-0000-4000-8000-000000000001';
  await pool.query(
    `INSERT INTO businesses (id, public_id, name)
     VALUES ($1, 'biz_before_capacity_upgrade', 'Pre-capacity Synthetic Business')`,
    [baselineBusinessId],
  );
  await pool.query(
    `INSERT INTO campaigns (
       id, public_id, business_id, title, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES (
       '62000000-0000-4000-8000-000000000001', 'cmp_before_capacity_upgrade', $1,
       'Pre-capacity Campaign', 50000, 7500, 57500, 'USD', 10
     )`,
    [baselineBusinessId],
  );
  await applyMigration(migration0002);
  const preserved = await pool.query<{ campaign_title: string; total_due_minor: number }>(
    `SELECT title AS campaign_title, total_due_minor
       FROM campaigns WHERE public_id = 'cmp_before_capacity_upgrade'`,
  );
  const row = preserved.rows[0];
  if (!row) throw new Error('Capacity migration did not preserve the baseline campaign.');
  upgradeProof = { campaignTitle: row.campaign_title, totalDueMinor: row.total_due_minor };

  await applyMigration(migration0003);
  await applyMigration(migration0004);
  await applyMigration(migration0005);
  await applyMigration(migration0006);
  for (const migration of currentSchemaMigrations) await applyMigration(migration);

  campaignStore = new CampaignStore(pool);
  ledgerStore = new LedgerStore(pool);
  missionStore = new MissionApplicationStore(pool);
  submissionStore = new SubmissionStore(pool);
  tenantStore = new IdentityTenantStore(pool);
}, 30_000);

beforeEach(async () => {
  await pool.query(
    `TRUNCATE idempotency_records, audit_events, submission_review_decisions,
              correction_requests, submission_status_history, submission_evidence,
              submission_assets, submission_attempts, media_assets,
              mission_application_status_history,
              slot_reservations, mission_applications, mission_slots, campaign_brief_versions,
              deliverable_requirements,
              campaign_status_history, campaigns, mission_templates, business_locations,
              business_memberships, creator_profiles, external_identities, businesses, users CASCADE`,
  );
  await pool.query(
    `INSERT INTO mission_templates (code, version, name, checklist_schema) VALUES
       ('visit_create', 1, 'Visit & Create', '{"type":"object"}'::jsonb),
       ('visit_share', 1, 'Visit & Share', '{"type":"object"}'::jsonb),
       ('event_attendance', 1, 'Event Attendance', '{"type":"object"}'::jsonb),
       ('private_experience_feedback', 1, 'Private Experience Feedback', '{"type":"object"}'::jsonb)`,
  );
});

afterAll(async () => {
  if (pool) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('mission contracts and capacity against real PostgreSQL', () => {
  it('preserves prior data, creates the complete slice, and contains no follower field', async () => {
    expect(upgradeProof).toEqual({
      campaignTitle: 'Pre-capacity Campaign',
      totalDueMinor: 57_500,
    });
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (
         'mission_templates', 'campaign_brief_versions', 'mission_slots',
         'mission_applications', 'slot_reservations', 'mission_application_status_history'
       ) ORDER BY table_name`,
    );
    expect(tables.rows).toHaveLength(6);

    const followerColumns = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name ILIKE '%follower%'`,
    );
    expect(followerColumns.rows).toEqual([]);
  });

  it('rolls back slot contracts that violate the 80 percent Community floor', async () => {
    const ownerUserId = await createUser('invalid-owner');
    const businessId = await tenantStore.createBusinessWithOwner({
      correlationId: randomUUID(),
      name: 'Invalid Contract Business',
      ownerUserId,
      publicId: `biz_${randomUUID()}`,
    });
    const campaign = await campaignStore.createDraftCampaign({
      actorId: ownerUserId,
      businessId,
      correlationId: randomUUID(),
      creatorRewardPoolMinor: 46_000,
      currency: 'USD',
      idempotencyKey: randomUUID(),
      platformFeeMinor: 6_900,
      publicId: `cmp_${randomUUID()}`,
      slotCount: 10,
      title: 'Invalid Community Mix',
      totalDueMinor: 52_900,
    });
    const slots: CampaignSlotInput[] = Array.from({ length: 10 }, (_, index) =>
      index < 7
        ? {
            baseRewardMinor: 4_000,
            bonusRewardMinor: 0,
            currency: 'USD',
            ordinal: index + 1,
            publicId: `slot_invalid_${index + 1}`,
            type: 'community',
          }
        : {
            baseRewardMinor: 4_000,
            bonusRewardMinor: 2_000,
            currency: 'USD',
            ordinal: index + 1,
            publicId: `slot_invalid_${index + 1}`,
            reachLevel: 'level_1',
            type: 'reach',
          },
    );

    await expect(
      missionStore.configureCampaignContract({
        actorUserId: ownerUserId,
        campaignId: campaign.id,
        checklist: { clips: 2, photos: 5 },
        correlationId: randomUUID(),
        missionTemplateCode: 'visit_create',
        missionTemplateVersion: 1,
        plainLanguageBrief: 'This contract must roll back.',
        slots,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CONTRACT_INCOMPLETE', httpStatus: 409 });
    await expect(
      campaignStore.transitionCampaign({
        actorId: ownerUserId,
        campaignId: campaign.id,
        correlationId: randomUUID(),
        expectedVersion: campaign.version,
        idempotencyKey: randomUUID(),
        toStatus: 'submitted',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CONTRACT_INCOMPLETE', httpStatus: 409 });
    expect(await countRows('campaign_brief_versions')).toBe(0);
    expect(await countRows('mission_slots')).toBe(0);
  });

  it('allows only one application and reservation when the same creator races twice', async () => {
    const campaign = await createPublishedCampaign(2);
    const creatorUserId = await createQualifiedCreator('duplicate');
    const attempts = await Promise.allSettled(
      ['a', 'b'].map((suffix) =>
        missionStore.applyForCommunityMission({
          campaignId: campaign.campaignId,
          correlationId: randomUUID(),
          creatorUserId,
          publicId: `app_duplicate_${suffix}_${randomUUID()}`,
        }),
      ),
    );

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'APPLICATION_ALREADY_EXISTS', httpStatus: 409 }),
      status: 'rejected',
    });
    expect(await countRows('mission_applications')).toBe(1);
    expect(await countRows('slot_reservations')).toBe(1);
    expect(await countRows('mission_slots', `WHERE status = 'reserved'`)).toBe(1);
    expect(await countRows('mission_slots', `WHERE status = 'available'`)).toBe(1);
    expect(await countRows('mission_application_status_history')).toBe(1);
  });

  it('never overbooks Community capacity under parallel qualified applications', async () => {
    const campaign = await createPublishedCampaign(3);
    const creators = await Promise.all(
      Array.from({ length: 6 }, (_, index) => createQualifiedCreator(`capacity-${index}`)),
    );
    const attempts = await Promise.allSettled(
      creators.map((creatorUserId, index) =>
        missionStore.applyForCommunityMission({
          campaignId: campaign.campaignId,
          correlationId: randomUUID(),
          creatorUserId,
          publicId: `app_capacity_${index}_${randomUUID()}`,
        }),
      ),
    );

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(3);
    expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(3);
    for (const rejected of attempts.filter((attempt) => attempt.status === 'rejected')) {
      expect(rejected).toMatchObject({
        reason: expect.objectContaining({ code: 'MISSION_CAPACITY_FULL', httpStatus: 409 }),
      });
    }
    expect(await countRows('mission_applications')).toBe(3);
    expect(await countRows('slot_reservations', `WHERE status = 'active'`)).toBe(3);
    expect(await countRows('mission_slots', `WHERE status = 'reserved'`)).toBe(3);
    expect(await countRows('mission_slots', `WHERE status = 'available'`)).toBe(0);
  });

  it('releases a withdrawn slot for a replacement but never lets one creator apply twice', async () => {
    const campaign = await createPublishedCampaign(1);
    const firstCreator = await createQualifiedCreator('withdraw-first');
    const replacementCreator = await createQualifiedCreator('withdraw-replacement');
    const first = await missionStore.applyForCommunityMission({
      campaignId: campaign.campaignId,
      correlationId: randomUUID(),
      creatorUserId: firstCreator,
      publicId: `app_first_${randomUUID()}`,
    });
    const withdrawn = await missionStore.withdrawApplication({
      applicationId: first.id,
      correlationId: randomUUID(),
      creatorUserId: firstCreator,
    });
    expect(withdrawn).toMatchObject({ status: 'withdrawn', version: 2 });

    await expect(
      missionStore.applyForCommunityMission({
        campaignId: campaign.campaignId,
        correlationId: randomUUID(),
        creatorUserId: firstCreator,
        publicId: `app_first_retry_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_ALREADY_EXISTS' });
    const replacement = await missionStore.applyForCommunityMission({
      campaignId: campaign.campaignId,
      correlationId: randomUUID(),
      creatorUserId: replacementCreator,
      publicId: `app_replacement_${randomUUID()}`,
    });
    expect(replacement.status).toBe('submitted');
    expect(replacement.reservedSlotId).toBe(first.reservedSlotId);
    expect(await countRows('slot_reservations', `WHERE status = 'released'`)).toBe(1);
    expect(await countRows('slot_reservations', `WHERE status = 'active'`)).toBe(1);
  });

  it('keeps application acceptance inside the correct business tenant', async () => {
    const campaign = await createPublishedCampaign(1);
    const creatorUserId = await createQualifiedCreator('tenant-creator');
    const application = await missionStore.applyForCommunityMission({
      campaignId: campaign.campaignId,
      correlationId: randomUUID(),
      creatorUserId,
      publicId: `app_tenant_${randomUUID()}`,
    });
    const otherOwner = await createUser('other-owner');
    await tenantStore.createBusinessWithOwner({
      correlationId: randomUUID(),
      name: 'Other Synthetic Business',
      ownerUserId: otherOwner,
      publicId: `biz_other_${randomUUID()}`,
    });

    await expect(
      missionStore.acceptApplication({
        actorUserId: otherOwner,
        applicationId: application.id,
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_ACCESS_DENIED', httpStatus: 403 });
    const accepted = await missionStore.acceptApplication({
      actorUserId: campaign.ownerUserId,
      applicationId: application.id,
      correlationId: randomUUID(),
    });
    expect(accepted).toMatchObject({ status: 'accepted', version: 2 });
    expect(await countRows('slot_reservations', `WHERE status = 'converted'`)).toBe(1);
    expect(await countRows('mission_slots', `WHERE status = 'accepted'`)).toBe(1);
    expect(await countRows('mission_application_status_history')).toBe(2);
  });
});
