import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { CampaignStore } from './campaign-store.js';
import { CheckInStore } from './check-in-store.js';
import { LedgerStore } from './ledger-store.js';
import { MissionApplicationStore } from './mission-application-store.js';
import { type SubmissionGroupInput, SubmissionStore } from './submission-store.js';
import { IdentityTenantStore } from './tenant-store.js';

const migrationPaths = [
  fileURLToPath(new URL('../drizzle/0000_giant_snowbird.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0001_empty_tyrannus.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0002_material_rachel_grey.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0003_orange_tempest.sql', import.meta.url)),
];
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
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const databaseName = `local_missions_m3_submission_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let campaignStore: CampaignStore;
let checkInStore: CheckInStore;
let ledgerStore: LedgerStore;
let missionStore: MissionApplicationStore;
let submissionStore: SubmissionStore;
let tenantStore: IdentityTenantStore;
let upgradeProof: { assignmentPublicId: string; briefPublicId: string };

type MissionFixture = {
  applicationId: string;
  assignmentId: string;
  assignmentPublicId: string;
  businessId: string;
  creatorUserId: string;
  locationId: string;
  ownerUserId: string;
  photoRequirementId: string;
  clipRequirementId: string;
};

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

async function createMission(options: { checkedIn?: boolean } = {}): Promise<MissionFixture> {
  const ownerUserId = await createUser('owner');
  const creatorUserId = await createQualifiedCreator('creator');
  const businessId = await tenantStore.createBusinessWithOwner({
    correlationId: randomUUID(),
    name: 'Synthetic Submission Business',
    ownerUserId,
    publicId: `biz_${randomUUID()}`,
  });
  const location = await tenantStore.createBusinessLocation({
    actorUserId: ownerUserId,
    addressLine1: '500 Synthetic Way',
    businessId,
    city: 'Orlando',
    correlationId: randomUUID(),
    name: 'Synthetic Submission Venue',
    postalCode: '32801',
    publicId: `loc_${randomUUID()}`,
    region: 'FL',
    timezone: 'America/New_York',
  });
  let campaign = await campaignStore.createDraftCampaign({
    actorId: ownerUserId,
    businessId,
    correlationId: randomUUID(),
    creatorRewardPoolMinor: 5_000,
    currency: 'USD',
    idempotencyKey: `create_${randomUUID()}`,
    platformFeeMinor: 750,
    publicId: `cmp_${randomUUID()}`,
    slotCount: 1,
    title: 'Synthetic Deliverable Mission',
    totalDueMinor: 5_750,
  });
  await missionStore.configureCampaignContract({
    actorUserId: ownerUserId,
    campaignId: campaign.id,
    checklist: { clips: 2, photos: 5 },
    correlationId: randomUUID(),
    missionTemplateCode: 'visit_create',
    missionTemplateVersion: 1,
    plainLanguageBrief: 'Visit the synthetic venue and provide five photos and two clips.',
    slots: [
      {
        baseRewardMinor: 5_000,
        bonusRewardMinor: 0,
        currency: 'USD',
        ordinal: 1,
        publicId: `slot_${randomUUID()}`,
        type: 'community',
      },
    ],
  });
  const requirementIds = await submissionStore.configureDeliverableRequirements({
    actorUserId: ownerUserId,
    campaignId: campaign.id,
    correlationId: randomUUID(),
    requirements: [
      {
        allowedMimeTypes: ['image/jpeg', 'image/heic'],
        minHeightPixels: 1080,
        minWidthPixels: 1080,
        objectiveDescription: 'Five clear original photos from the visit.',
        ordinal: 1,
        publicId: `req_photos_${randomUUID()}`,
        requiredCount: 5,
        type: 'photo',
      },
      {
        allowedMimeTypes: ['video/quicktime', 'video/mp4'],
        maxDurationSeconds: 15,
        minDurationSeconds: 5,
        minHeightPixels: 1920,
        minWidthPixels: 1080,
        objectiveDescription: 'Two original vertical clips between 5 and 15 seconds.',
        ordinal: 2,
        orientation: 'portrait_9_16',
        publicId: `req_clips_${randomUUID()}`,
        requiredCount: 2,
        type: 'raw_clip',
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
  const application = await missionStore.applyForCommunityMission({
    campaignId: campaign.id,
    correlationId: randomUUID(),
    creatorUserId,
    publicId: `app_${randomUUID()}`,
  });
  await missionStore.acceptApplication({
    actorUserId: ownerUserId,
    applicationId: application.id,
    correlationId: randomUUID(),
  });
  const assignmentPublicId = `asn_${randomUUID()}`;
  const assignment = await checkInStore.scheduleAcceptedApplication({
    actorUserId: ownerUserId,
    applicationId: application.id,
    businessLocationId: location.id,
    correlationId: randomUUID(),
    publicId: assignmentPublicId,
    timezone: 'America/New_York',
    windowEndsAt: new Date(Date.now() + 60 * 60 * 1_000),
    windowStartsAt: new Date(Date.now() - 60 * 60 * 1_000),
  });
  if (options.checkedIn !== false) {
    const token = `qr_${randomUUID()}_${randomUUID()}`;
    const challenge = await checkInStore.issueChallenge({
      actorUserId: ownerUserId,
      correlationId: randomUUID(),
      expiresAt: new Date(Date.now() + 2 * 60 * 1_000),
      method: 'qr',
      missionAssignmentId: assignment.id,
      publicId: `chi_${randomUUID()}`,
      token,
    });
    await checkInStore.consumeChallenge({
      accuracyClass: 'unavailable',
      businessLocationId: location.id,
      challengePublicId: challenge.publicId,
      correlationId: randomUUID(),
      creatorUserId,
      eventPublicId: `cin_${randomUUID()}`,
      token,
    });
  }
  const photoRequirementId = requirementIds[0];
  const clipRequirementId = requirementIds[1];
  if (!photoRequirementId || !clipRequirementId) throw new Error('Fixture requirements missing.');
  return {
    applicationId: application.id,
    assignmentId: assignment.id,
    assignmentPublicId,
    businessId,
    clipRequirementId,
    creatorUserId,
    locationId: location.id,
    ownerUserId,
    photoRequirementId,
  };
}

async function registerAsset(
  mission: MissionFixture,
  label: string,
  kind: 'photo' | 'clip',
  options: { heightPixels?: number; verify?: boolean } = {},
) {
  const clip = kind === 'clip';
  const asset = await submissionStore.registerMediaAsset({
    byteSize: clip ? 2_000_000 : 500_000,
    checksumSha256: createHash('sha256').update(`${mission.assignmentId}:${label}`).digest('hex'),
    correlationId: randomUUID(),
    creatorUserId: mission.creatorUserId,
    ...(clip ? { durationSeconds: 10 } : {}),
    heightPixels: options.heightPixels ?? (clip ? 1920 : 1080),
    mimeType: clip ? 'video/quicktime' : 'image/jpeg',
    missionAssignmentId: mission.assignmentId,
    orientation: clip ? 'portrait_9_16' : 'any',
    publicId: `med_${label}_${randomUUID()}`,
    storageObjectKey: `assignments/${mission.assignmentPublicId}/${label}`,
    widthPixels: 1080,
  });
  if (options.verify !== false) {
    return submissionStore.setMediaAssetValidation({
      correlationId: randomUUID(),
      mediaAssetId: asset.id,
      status: 'verified',
    });
  }
  return asset;
}

async function validGroups(mission: MissionFixture): Promise<SubmissionGroupInput[]> {
  const photos = await Promise.all(
    Array.from({ length: 5 }, (_, index) => registerAsset(mission, `photo-${index}`, 'photo')),
  );
  const clips = await Promise.all(
    Array.from({ length: 2 }, (_, index) => registerAsset(mission, `clip-${index}`, 'clip')),
  );
  return [
    { assetIds: photos.map((asset) => asset.id), requirementId: mission.photoRequirementId },
    { assetIds: clips.map((asset) => asset.id), requirementId: mission.clipRequirementId },
  ];
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
  for (const migrationPath of migrationPaths) await applyMigration(migrationPath);

  await pool.query(`
    INSERT INTO users (id, public_id) VALUES
      ('81000000-0000-4000-8000-000000000001', 'usr_upgrade_owner'),
      ('81000000-0000-4000-8000-000000000002', 'usr_upgrade_creator');
    INSERT INTO businesses (id, public_id, name)
      VALUES ('82000000-0000-4000-8000-000000000001', 'biz_upgrade', 'Upgrade Business');
    INSERT INTO business_memberships (id, business_id, user_id, role, status) VALUES
      ('83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001',
       '81000000-0000-4000-8000-000000000001', 'owner', 'active');
    INSERT INTO business_locations (
      id, public_id, business_id, name, address_line_1, city, region, postal_code, timezone
    ) VALUES (
      '84000000-0000-4000-8000-000000000001', 'loc_upgrade',
      '82000000-0000-4000-8000-000000000001', 'Upgrade Venue', '800 Synthetic Way',
      'Orlando', 'FL', '32801', 'America/New_York'
    );
    INSERT INTO campaigns (
      id, public_id, business_id, title, creator_reward_pool_minor, platform_fee_minor,
      total_due_minor, currency, slot_count, status
    ) VALUES (
      '85000000-0000-4000-8000-000000000001', 'cmp_upgrade',
      '82000000-0000-4000-8000-000000000001', 'Upgrade Campaign',
      5000, 750, 5750, 'USD', 1, 'published'
    );
    INSERT INTO mission_templates (id, code, version, name, checklist_schema) VALUES
      ('86000000-0000-4000-8000-000000000001', 'visit_create', 1, 'Visit & Create', '{}'::jsonb);
    INSERT INTO campaign_brief_versions (
      id, campaign_id, version, mission_template_id, plain_language_brief, checklist, created_by
    ) VALUES (
      '87000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', 1,
      '86000000-0000-4000-8000-000000000001', 'Existing accepted brief', '{}'::jsonb,
      '81000000-0000-4000-8000-000000000001'
    );
    INSERT INTO mission_slots (
      id, public_id, campaign_id, ordinal, type, status, base_reward_minor,
      bonus_reward_minor, reward_minor, currency
    ) VALUES (
      '88000000-0000-4000-8000-000000000001', 'slot_upgrade',
      '85000000-0000-4000-8000-000000000001', 1, 'community', 'accepted', 5000, 0, 5000, 'USD'
    );
    INSERT INTO mission_applications (
      id, public_id, campaign_id, creator_user_id, status, version
    ) VALUES (
      '89000000-0000-4000-8000-000000000001', 'app_upgrade',
      '85000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002',
      'accepted', 2
    );
    INSERT INTO mission_assignments (
      id, public_id, application_id, campaign_id, mission_slot_id, creator_user_id,
      business_location_id, window_starts_at, window_ends_at, timezone, status, created_by, version
    ) VALUES (
      '8a000000-0000-4000-8000-000000000001', 'asn_upgrade',
      '89000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001',
      '88000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002',
      '84000000-0000-4000-8000-000000000001', now() - interval '1 hour',
      now() + interval '1 hour', 'America/New_York', 'checked_in',
      '81000000-0000-4000-8000-000000000001', 2
    );
  `);
  await applyMigration(migration0004);
  const upgraded = await pool.query<{ assignment_public_id: string; brief_public_id: string }>(
    `SELECT ma.public_id AS assignment_public_id, cbv.id::text AS brief_public_id
       FROM mission_assignments ma
       JOIN campaign_brief_versions cbv ON cbv.id = ma.campaign_brief_version_id
      WHERE ma.public_id = 'asn_upgrade'`,
  );
  const row = upgraded.rows[0];
  if (!row) throw new Error('Submission migration did not preserve and backfill the assignment.');
  upgradeProof = {
    assignmentPublicId: row.assignment_public_id,
    briefPublicId: row.brief_public_id,
  };
  await applyMigration(migration0005);
  await applyMigration(migration0006);
  for (const migration of currentSchemaMigrations) await applyMigration(migration);

  campaignStore = new CampaignStore(pool);
  checkInStore = new CheckInStore(pool);
  ledgerStore = new LedgerStore(pool);
  missionStore = new MissionApplicationStore(pool);
  submissionStore = new SubmissionStore(pool);
  tenantStore = new IdentityTenantStore(pool);
}, 30_000);

beforeEach(async () => {
  await pool.query(`TRUNCATE idempotency_records, audit_events, submission_review_decisions,
    correction_requests, submission_status_history, submission_evidence, submission_assets,
    submission_attempts, media_assets, check_in_events, check_in_challenges,
    venue_staff_assignments, mission_assignment_status_history, mission_assignments,
    mission_application_status_history, slot_reservations, mission_applications, mission_slots,
    deliverable_requirements, campaign_brief_versions, campaign_status_history, campaigns,
    mission_templates, business_locations, business_memberships, creator_profiles,
    external_identities, businesses, users CASCADE`);
  await pool.query(`INSERT INTO mission_templates (code, version, name, checklist_schema) VALUES
    ('visit_create', 1, 'Visit & Create', '{"type":"object"}'::jsonb),
    ('visit_share', 1, 'Visit & Share', '{"type":"object"}'::jsonb),
    ('event_attendance', 1, 'Event Attendance', '{"type":"object"}'::jsonb),
    ('private_experience_feedback', 1, 'Private Experience Feedback', '{"type":"object"}'::jsonb)`);
});

afterAll(async () => {
  if (pool) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('deliverable submission and review against real PostgreSQL', () => {
  it('preserves an existing checked-in assignment and adds privacy-safe submission tables', async () => {
    expect(upgradeProof).toEqual({
      assignmentPublicId: 'asn_upgrade',
      briefPublicId: '87000000-0000-4000-8000-000000000001',
    });
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (
         'deliverable_requirements', 'media_assets', 'submission_attempts',
         'submission_assets', 'submission_evidence', 'submission_status_history',
         'correction_requests', 'submission_review_decisions'
       ) ORDER BY table_name`,
    );
    expect(tables.rows).toHaveLength(8);
    const prohibited = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('deliverable_requirements', 'media_assets', 'submission_attempts')
         AND (column_name ILIKE '%follower%' OR column_name ILIKE '%public_url%'
              OR column_name ILIKE '%blob%' OR column_name ILIKE '%latitude%'
              OR column_name ILIKE '%longitude%')`,
    );
    expect(prohibited.rows).toEqual([]);
  });

  it('requires locked objective deliverables before campaign submission', async () => {
    const ownerUserId = await createUser('contract-owner');
    const businessId = await tenantStore.createBusinessWithOwner({
      correlationId: randomUUID(),
      name: 'Contract Business',
      ownerUserId,
      publicId: `biz_${randomUUID()}`,
    });
    const campaign = await campaignStore.createDraftCampaign({
      actorId: ownerUserId,
      businessId,
      correlationId: randomUUID(),
      creatorRewardPoolMinor: 5_000,
      currency: 'USD',
      idempotencyKey: randomUUID(),
      platformFeeMinor: 750,
      publicId: `cmp_${randomUUID()}`,
      slotCount: 1,
      title: 'Incomplete Contract',
      totalDueMinor: 5_750,
    });
    await missionStore.configureCampaignContract({
      actorUserId: ownerUserId,
      campaignId: campaign.id,
      checklist: { photos: 5 },
      correlationId: randomUUID(),
      missionTemplateCode: 'visit_create',
      missionTemplateVersion: 1,
      plainLanguageBrief: 'An incomplete objective contract.',
      slots: [
        {
          baseRewardMinor: 5_000,
          bonusRewardMinor: 0,
          currency: 'USD',
          ordinal: 1,
          publicId: `slot_${randomUUID()}`,
          type: 'community',
        },
      ],
    });
    await expect(
      campaignStore.transitionCampaign({
        actorId: ownerUserId,
        campaignId: campaign.id,
        correlationId: randomUUID(),
        expectedVersion: campaign.version,
        idempotencyKey: randomUUID(),
        toStatus: 'submitted',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_CONTRACT_INCOMPLETE' });
    await expect(
      submissionStore.configureDeliverableRequirements({
        actorUserId: ownerUserId,
        campaignId: campaign.id,
        correlationId: randomUUID(),
        requirements: [
          {
            allowedMimeTypes: ['video/quicktime'],
            maxDurationSeconds: 30,
            minDurationSeconds: 1,
            objectiveDescription: 'Out of range clip.',
            ordinal: 1,
            orientation: 'any',
            publicId: `req_${randomUUID()}`,
            requiredCount: 9,
            type: 'raw_clip',
          },
        ],
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_CONTRACT_INCOMPLETE' });
    expect(await countRows('deliverable_requirements')).toBe(0);
  });

  it('rejects all upload and completion activity before verified check-in atomically', async () => {
    const mission = await createMission({ checkedIn: false });
    await expect(registerAsset(mission, 'early-photo', 'photo')).rejects.toMatchObject({
      code: 'SUBMISSION_CHECK_IN_REQUIRED',
    });
    await expect(
      submissionStore.submitComplete({
        correlationId: randomUUID(),
        creatorUserId: mission.creatorUserId,
        groups: [],
        missionAssignmentId: mission.assignmentId,
        publicId: `sub_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_CHECK_IN_REQUIRED' });
    expect(await countRows('media_assets')).toBe(0);
    expect(await countRows('submission_attempts')).toBe(0);
  });

  it('rejects missing, quarantined, and objectively invalid media without a partial submission', async () => {
    const mission = await createMission();
    const photos = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        registerAsset(mission, `negative-photo-${index}`, 'photo'),
      ),
    );
    const goodClip = await registerAsset(mission, 'negative-clip-good', 'clip');
    const corruptClip = await registerAsset(mission, 'negative-clip-corrupt', 'clip', {
      verify: false,
    });
    await submissionStore.setMediaAssetValidation({
      correlationId: randomUUID(),
      mediaAssetId: corruptClip.id,
      reason: 'Synthetic decoder failure.',
      status: 'quarantined',
    });
    const corruptGroups: SubmissionGroupInput[] = [
      { assetIds: photos.map((asset) => asset.id), requirementId: mission.photoRequirementId },
      { assetIds: [goodClip.id, corruptClip.id], requirementId: mission.clipRequirementId },
    ];
    await expect(
      submissionStore.submitComplete({
        correlationId: randomUUID(),
        creatorUserId: mission.creatorUserId,
        groups: corruptGroups,
        missionAssignmentId: mission.assignmentId,
        publicId: `sub_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_ASSET_NOT_VERIFIED' });

    const replacementClip = await registerAsset(mission, 'negative-clip-replacement', 'clip');
    await expect(
      submissionStore.submitComplete({
        correlationId: randomUUID(),
        creatorUserId: mission.creatorUserId,
        groups: [
          {
            assetIds: photos.slice(0, 4).map((asset) => asset.id),
            requirementId: mission.photoRequirementId,
          },
          { assetIds: [goodClip.id, replacementClip.id], requirementId: mission.clipRequirementId },
        ],
        missionAssignmentId: mission.assignmentId,
        publicId: `sub_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_CONTRACT_INCOMPLETE' });

    const undersized = await registerAsset(mission, 'negative-photo-small', 'photo', {
      heightPixels: 720,
    });
    await expect(
      submissionStore.submitComplete({
        correlationId: randomUUID(),
        creatorUserId: mission.creatorUserId,
        groups: [
          {
            assetIds: [...photos.slice(0, 4).map((asset) => asset.id), undersized.id],
            requirementId: mission.photoRequirementId,
          },
          { assetIds: [goodClip.id, replacementClip.id], requirementId: mission.clipRequirementId },
        ],
        missionAssignmentId: mission.assignmentId,
        publicId: `sub_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_ASSET_INVALID' });
    expect(await countRows('submission_attempts')).toBe(0);
    expect(await countRows('submission_assets')).toBe(0);
    expect(await countRows('submission_status_history')).toBe(0);
  });

  it('starts exactly one 48-hour review when duplicate completion requests race', async () => {
    const mission = await createMission();
    const groups = await validGroups(mission);
    const attempts = await Promise.allSettled(
      ['a', 'b'].map((suffix) =>
        submissionStore.submitComplete({
          correlationId: randomUUID(),
          creatorUserId: mission.creatorUserId,
          groups,
          missionAssignmentId: mission.assignmentId,
          publicId: `sub_${suffix}_${randomUUID()}`,
        }),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'SUBMISSION_ALREADY_EXISTS' }),
      status: 'rejected',
    });
    const submission = attempts.find((attempt) => attempt.status === 'fulfilled');
    if (!submission || submission.status !== 'fulfilled')
      throw new Error('Submission race lost both attempts.');
    expect(
      submission.value.reviewDeadlineAt.getTime() - submission.value.submittedAt.getTime(),
    ).toBe(48 * 60 * 60 * 1_000);
    expect(await countRows('submission_attempts')).toBe(1);
    expect(await countRows('submission_assets')).toBe(7);
    expect(await countRows('submission_status_history')).toBe(1);
  });

  it('allows one objective correction, rejects a second correction, and completes all mission state', async () => {
    const mission = await createMission();
    const groups = await validGroups(mission);
    const first = await submissionStore.submitComplete({
      correlationId: randomUUID(),
      creatorUserId: mission.creatorUserId,
      groups,
      missionAssignmentId: mission.assignmentId,
      publicId: `sub_${randomUUID()}`,
    });
    const otherOwner = await createUser('other-owner');
    await tenantStore.createBusinessWithOwner({
      correlationId: randomUUID(),
      name: 'Other Review Business',
      ownerUserId: otherOwner,
      publicId: `biz_${randomUUID()}`,
    });
    await expect(
      submissionStore.reviewSubmission({
        actorUserId: otherOwner,
        correlationId: randomUUID(),
        decision: 'approve',
        decisionPublicId: `dec_${randomUUID()}`,
        submissionAttemptId: first.id,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_ACCESS_DENIED' });
    expect(await countRows('submission_review_decisions')).toBe(0);

    const correction = await submissionStore.reviewSubmission({
      actorUserId: mission.ownerUserId,
      correlationId: randomUUID(),
      correction: {
        explanation: 'One photo does not meet the locked minimum resolution.',
        publicId: `cor_${randomUUID()}`,
        reasonCode: 'insufficient_resolution',
        requirementId: mission.photoRequirementId,
      },
      decision: 'request_correction',
      decisionPublicId: `dec_${randomUUID()}`,
      submissionAttemptId: first.id,
    });
    expect(correction.status).toBe('correction_requested');
    const second = await submissionStore.submitComplete({
      correlationId: randomUUID(),
      creatorUserId: mission.creatorUserId,
      groups,
      missionAssignmentId: mission.assignmentId,
      publicId: `sub_${randomUUID()}`,
    });
    expect(second.attemptNumber).toBe(2);
    await expect(
      submissionStore.reviewSubmission({
        actorUserId: mission.ownerUserId,
        correlationId: randomUUID(),
        correction: {
          explanation: 'A second correction is forbidden.',
          publicId: `cor_${randomUUID()}`,
          reasonCode: 'wrong_subject',
          requirementId: mission.photoRequirementId,
        },
        decision: 'request_correction',
        decisionPublicId: `dec_${randomUUID()}`,
        submissionAttemptId: second.id,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_SECOND_CORRECTION_NOT_ALLOWED' });
    const approved = await submissionStore.reviewSubmission({
      actorUserId: mission.ownerUserId,
      correlationId: randomUUID(),
      decision: 'approve',
      decisionPublicId: `dec_${randomUUID()}`,
      submissionAttemptId: second.id,
    });
    expect(approved.status).toBe('approved');
    const states = await pool.query<{ application: string; assignment: string; slot: string }>(
      `SELECT a.status AS application, ma.status AS assignment, ms.status AS slot
       FROM mission_assignments ma JOIN mission_applications a ON a.id = ma.application_id
       JOIN mission_slots ms ON ms.id = ma.mission_slot_id WHERE ma.id = $1`,
      [mission.assignmentId],
    );
    expect(states.rows[0]).toEqual({
      application: 'completed',
      assignment: 'completed',
      slot: 'completed',
    });
    expect(await countRows('correction_requests')).toBe(1);
    expect(await countRows('submission_review_decisions')).toBe(2);
    expect(
      await countRows('financial_action_intents', `WHERE action = 'creator_payable_full'`),
    ).toBe(1);
  });

  it('uses database time for auto-approval and permits exactly one service winner', async () => {
    const mission = await createMission();
    const submission = await submissionStore.submitComplete({
      correlationId: randomUUID(),
      creatorUserId: mission.creatorUserId,
      groups: await validGroups(mission),
      missionAssignmentId: mission.assignmentId,
      publicId: `sub_${randomUUID()}`,
    });
    await expect(
      submissionStore.autoApproveSubmission({
        correlationId: randomUUID(),
        decisionPublicId: `dec_${randomUUID()}`,
        submissionAttemptId: submission.id,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_REVIEW_NOT_DUE' });
    await pool.query(
      `UPDATE submission_attempts SET submitted_at = now() - interval '49 hours',
       review_deadline_at = now() - interval '1 hour' WHERE id = $1`,
      [submission.id],
    );
    const attempts = await Promise.allSettled(
      ['a', 'b'].map((suffix) =>
        submissionStore.autoApproveSubmission({
          correlationId: randomUUID(),
          decisionPublicId: `dec_${suffix}_${randomUUID()}`,
          submissionAttemptId: submission.id,
        }),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'SUBMISSION_TRANSITION_CONFLICT' }),
      status: 'rejected',
    });
    const decision = await pool.query<{
      actor_id: string | null;
      actor_type: string;
      decision: string;
    }>(
      `SELECT actor_id, actor_type, decision FROM submission_review_decisions WHERE submission_attempt_id = $1`,
      [submission.id],
    );
    expect(decision.rows).toEqual([
      { actor_id: null, actor_type: 'service', decision: 'auto_approved' },
    ]);
    expect(await countRows('submission_status_history', `WHERE actor_type = 'service'`)).toBe(1);
    expect(
      await countRows('mission_assignment_status_history', `WHERE actor_type = 'service'`),
    ).toBe(1);
    expect(
      await countRows('mission_application_status_history', `WHERE actor_type = 'service'`),
    ).toBe(1);
    expect(
      await countRows('financial_action_intents', `WHERE action = 'creator_payable_full'`),
    ).toBe(1);
  });
});
