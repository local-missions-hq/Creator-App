import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { DisputeReasonCode } from '@local-missions/contracts';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { CampaignStore } from './campaign-store.js';
import { CheckInStore } from './check-in-store.js';
import { DisputeStore } from './dispute-store.js';
import { LedgerStore } from './ledger-store.js';
import { MissionApplicationStore } from './mission-application-store.js';
import { type SubmissionGroupInput, SubmissionStore } from './submission-store.js';
import { IdentityTenantStore } from './tenant-store.js';

const migrationPaths = [
  fileURLToPath(new URL('../drizzle/0000_giant_snowbird.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0001_empty_tyrannus.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0002_material_rachel_grey.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0003_orange_tempest.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0004_handy_gideon.sql', import.meta.url)),
];
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
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const databaseName = `local_missions_m3_dispute_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let campaignStore: CampaignStore;
let checkInStore: CheckInStore;
let disputeStore: DisputeStore;
let ledgerStore: LedgerStore | undefined;
let missionStore: MissionApplicationStore;
let submissionStore: SubmissionStore;
let tenantStore: IdentityTenantStore;
let upgradeProof: {
  assignmentPublicId: string;
  financialAction: string;
  status: string;
  submissionPublicId: string;
};

type MissionFixture = {
  applicationId: string;
  assignmentId: string;
  assignmentPublicId: string;
  businessId: string;
  clipRequirementId: string;
  creatorUserId: string;
  locationId: string;
  ownerUserId: string;
  photoRequirementId: string;
};

type PreparedSubmission = {
  firstPhotoAssetId: string;
  groups: SubmissionGroupInput[];
  mission: MissionFixture;
  submission: Awaited<ReturnType<SubmissionStore['submitComplete']>>;
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

async function createMission(label: string): Promise<MissionFixture> {
  const ownerUserId = await createUser(`${label}-owner`);
  const creatorUserId = await createQualifiedCreator(`${label}-creator`);
  const businessId = await tenantStore.createBusinessWithOwner({
    correlationId: randomUUID(),
    name: `${label} Synthetic Dispute Business`,
    ownerUserId,
    publicId: `biz_${label}_${randomUUID()}`,
  });
  const location = await tenantStore.createBusinessLocation({
    actorUserId: ownerUserId,
    addressLine1: '600 Synthetic Way',
    businessId,
    city: 'Orlando',
    correlationId: randomUUID(),
    name: `${label} Synthetic Venue`,
    postalCode: '32801',
    publicId: `loc_${label}_${randomUUID()}`,
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
    publicId: `cmp_${label}_${randomUUID()}`,
    slotCount: 1,
    title: `${label} Synthetic Dispute Mission`,
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
        publicId: `slot_${label}_${randomUUID()}`,
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
        allowedMimeTypes: ['image/jpeg'],
        minHeightPixels: 1080,
        minWidthPixels: 1080,
        objectiveDescription: 'Five clear original photos from the visit.',
        ordinal: 1,
        publicId: `req_${label}_photos_${randomUUID()}`,
        requiredCount: 5,
        type: 'photo',
      },
      {
        allowedMimeTypes: ['video/quicktime'],
        maxDurationSeconds: 15,
        minDurationSeconds: 5,
        minHeightPixels: 1920,
        minWidthPixels: 1080,
        objectiveDescription: 'Two original vertical clips between 5 and 15 seconds.',
        ordinal: 2,
        orientation: 'portrait_9_16',
        publicId: `req_${label}_clips_${randomUUID()}`,
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
  if (ledgerStore) {
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
  } else {
    const legacyFunding = await pool.query<{ version: number }>(
      `UPDATE campaigns SET status = 'funded', version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'approved' RETURNING version`,
      [campaign.id],
    );
    await pool.query(
      `INSERT INTO campaign_status_history (
         campaign_id, from_status, to_status, campaign_version, actor_id, reason
       ) VALUES ($1, 'approved', 'funded', $2, NULL, 'Pre-ledger migration fixture')`,
      [campaign.id, legacyFunding.rows[0]?.version],
    );
  }
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
    publicId: `app_${label}_${randomUUID()}`,
  });
  await missionStore.acceptApplication({
    actorUserId: ownerUserId,
    applicationId: application.id,
    correlationId: randomUUID(),
  });
  const assignmentPublicId = `asn_${label}_${randomUUID()}`;
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
  const token = `qr_${randomUUID()}_${randomUUID()}`;
  const challenge = await checkInStore.issueChallenge({
    actorUserId: ownerUserId,
    correlationId: randomUUID(),
    expiresAt: new Date(Date.now() + 2 * 60 * 1_000),
    method: 'qr',
    missionAssignmentId: assignment.id,
    publicId: `chi_${label}_${randomUUID()}`,
    token,
  });
  await checkInStore.consumeChallenge({
    accuracyClass: 'unavailable',
    businessLocationId: location.id,
    challengePublicId: challenge.publicId,
    correlationId: randomUUID(),
    creatorUserId,
    eventPublicId: `cin_${label}_${randomUUID()}`,
    token,
  });
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

async function registerAsset(mission: MissionFixture, label: string, kind: 'photo' | 'clip') {
  const clip = kind === 'clip';
  const asset = await submissionStore.registerMediaAsset({
    byteSize: clip ? 2_000_000 : 500_000,
    checksumSha256: createHash('sha256').update(`${mission.assignmentId}:${label}`).digest('hex'),
    correlationId: randomUUID(),
    creatorUserId: mission.creatorUserId,
    ...(clip ? { durationSeconds: 10 } : {}),
    heightPixels: clip ? 1920 : 1080,
    mimeType: clip ? 'video/quicktime' : 'image/jpeg',
    missionAssignmentId: mission.assignmentId,
    orientation: clip ? 'portrait_9_16' : 'any',
    publicId: `med_${label}_${randomUUID()}`,
    storageObjectKey: `assignments/${mission.assignmentPublicId}/${label}`,
    widthPixels: 1080,
  });
  return submissionStore.setMediaAssetValidation({
    correlationId: randomUUID(),
    mediaAssetId: asset.id,
    status: 'verified',
  });
}

async function prepareSubmission(label: string): Promise<PreparedSubmission> {
  const mission = await createMission(label);
  const photos = [];
  for (let index = 0; index < 5; index += 1) {
    photos.push(await registerAsset(mission, `${label}-photo-${index}`, 'photo'));
  }
  const clips = [];
  for (let index = 0; index < 2; index += 1) {
    clips.push(await registerAsset(mission, `${label}-clip-${index}`, 'clip'));
  }
  const groups: SubmissionGroupInput[] = [
    { assetIds: photos.map((asset) => asset.id), requirementId: mission.photoRequirementId },
    { assetIds: clips.map((asset) => asset.id), requirementId: mission.clipRequirementId },
  ];
  const submission = await submissionStore.submitComplete({
    correlationId: randomUUID(),
    creatorUserId: mission.creatorUserId,
    groups,
    missionAssignmentId: mission.assignmentId,
    publicId: `sub_${label}_${randomUUID()}`,
  });
  const firstPhoto = photos[0];
  if (!firstPhoto) throw new Error('Fixture photo missing.');
  return { firstPhotoAssetId: firstPhoto.id, groups, mission, submission };
}

function businessEvidence(prepared: PreparedSubmission) {
  return [
    {
      kind: 'deliverable_requirement' as const,
      publicId: `dev_requirement_${randomUUID()}`,
      referenceId: prepared.mission.photoRequirementId,
    },
    {
      kind: 'submission_attempt' as const,
      publicId: `dev_submission_${randomUUID()}`,
      referenceId: prepared.submission.id,
    },
  ];
}

async function openBusinessDispute(prepared: PreparedSubmission, suffix: string = randomUUID()) {
  return disputeStore.openDispute({
    actorUserId: prepared.mission.ownerUserId,
    correlationId: randomUUID(),
    evidence: businessEvidence(prepared),
    explanation: 'The submitted item count requires independent objective review.',
    openedBy: 'business',
    publicId: `dsp_business_${suffix}`,
    reasonCode: 'missing_count',
    requirementId: prepared.mission.photoRequirementId,
    submissionAttemptId: prepared.submission.id,
  });
}

async function requestCorrection(prepared: PreparedSubmission): Promise<string> {
  await submissionStore.reviewSubmission({
    actorUserId: prepared.mission.ownerUserId,
    correlationId: randomUUID(),
    correction: {
      explanation: 'One photo appears below the locked resolution requirement.',
      publicId: `cor_${randomUUID()}`,
      reasonCode: 'insufficient_resolution',
      requirementId: prepared.mission.photoRequirementId,
    },
    decision: 'request_correction',
    decisionPublicId: `dec_${randomUUID()}`,
    submissionAttemptId: prepared.submission.id,
  });
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM correction_requests WHERE source_submission_attempt_id = $1`,
    [prepared.submission.id],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Fixture correction missing.');
  return row.id;
}

async function addPlatformReviewer(userId: string, label: string): Promise<void> {
  await pool.query(
    `INSERT INTO platform_staff_memberships (public_id, user_id, role, status)
     VALUES ($1, $2, 'dispute_reviewer', 'active')`,
    [`staff_${label}_${randomUUID()}`, userId],
  );
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
  campaignStore = new CampaignStore(pool);
  checkInStore = new CheckInStore(pool);
  missionStore = new MissionApplicationStore(pool);
  submissionStore = new SubmissionStore(pool);
  tenantStore = new IdentityTenantStore(pool);
  await pool.query(`INSERT INTO mission_templates (code, version, name, checklist_schema) VALUES
    ('visit_create', 1, 'Visit & Create', '{"type":"object"}'::jsonb),
    ('visit_share', 1, 'Visit & Share', '{"type":"object"}'::jsonb),
    ('event_attendance', 1, 'Event Attendance', '{"type":"object"}'::jsonb),
    ('private_experience_feedback', 1, 'Private Experience Feedback', '{"type":"object"}'::jsonb)`);
  const beforeUpgrade = await prepareSubmission('upgrade');
  await pool.query(
    `INSERT INTO submission_review_decisions (
       public_id, submission_attempt_id, decision, actor_id, actor_type
     ) VALUES ($1, $2, 'approved', $3, 'user')`,
    [`dec_upgrade_${randomUUID()}`, beforeUpgrade.submission.id, beforeUpgrade.mission.ownerUserId],
  );
  await pool.query(
    `UPDATE submission_attempts SET status = 'approved', version = version + 1 WHERE id = $1`,
    [beforeUpgrade.submission.id],
  );
  await pool.query(
    `UPDATE mission_assignments SET status = 'completed', version = version + 1 WHERE id = $1`,
    [beforeUpgrade.mission.assignmentId],
  );
  await pool.query(
    `UPDATE mission_applications SET status = 'completed', version = version + 1 WHERE id = $1`,
    [beforeUpgrade.mission.applicationId],
  );
  await pool.query(
    `UPDATE mission_slots SET status = 'completed', version = version + 1
      WHERE id = (SELECT mission_slot_id FROM mission_assignments WHERE id = $1)`,
    [beforeUpgrade.mission.assignmentId],
  );
  await applyMigration(migration0005);
  const preserved = await pool.query<{
    assignment_public_id: string;
    financial_action: string;
    status: string;
    submission_public_id: string;
  }>(
    `SELECT ma.public_id AS assignment_public_id, sa.public_id AS submission_public_id,
            sa.status, fai.action AS financial_action
       FROM submission_attempts sa
       JOIN mission_assignments ma ON ma.id = sa.mission_assignment_id
       JOIN financial_action_intents fai ON fai.mission_assignment_id = ma.id
      WHERE sa.id = $1`,
    [beforeUpgrade.submission.id],
  );
  const row = preserved.rows[0];
  if (!row) throw new Error('Dispute migration did not preserve the complete submission.');
  upgradeProof = {
    assignmentPublicId: row.assignment_public_id,
    financialAction: row.financial_action,
    status: row.status,
    submissionPublicId: row.submission_public_id,
  };
  await applyMigration(migration0006);
  for (const migration of currentSchemaMigrations) await applyMigration(migration);
  ledgerStore = new LedgerStore(pool);
  disputeStore = new DisputeStore(pool);
}, 30_000);

beforeEach(async () => {
  await pool.query(`TRUNCATE idempotency_records, audit_events, financial_action_intents,
    dispute_resolutions, dispute_status_history, dispute_evidence_items, submission_disputes,
    platform_staff_memberships, submission_review_decisions, correction_requests,
    submission_status_history, submission_evidence, submission_assets, submission_attempts,
    media_assets, check_in_events, check_in_challenges, venue_staff_assignments,
    mission_assignment_status_history, mission_assignments, mission_application_status_history,
    slot_reservations, mission_applications, mission_slots, deliverable_requirements,
    campaign_brief_versions, campaign_status_history, campaigns, mission_templates,
    business_locations, business_memberships, creator_profiles, external_identities,
    businesses, users CASCADE`);
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

describe.sequential('submission disputes and resolutions against real PostgreSQL', () => {
  it('preserves an existing complete submission and adds no subjective or manual-money field', async () => {
    expect(upgradeProof.status).toBe('approved');
    expect(upgradeProof.financialAction).toBe('creator_payable_full');
    expect(upgradeProof.assignmentPublicId).toContain('asn_upgrade_');
    expect(upgradeProof.submissionPublicId).toContain('sub_upgrade_');
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (
         'platform_staff_memberships', 'submission_disputes', 'dispute_evidence_items',
         'dispute_status_history', 'dispute_resolutions', 'financial_action_intents'
       ) ORDER BY table_name`,
    );
    expect(tables.rows).toHaveLength(6);
    const prohibited = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('submission_disputes', 'dispute_resolutions', 'financial_action_intents')
         AND (column_name ILIKE '%follower%' OR column_name ILIKE '%appearance%'
              OR column_name ILIKE '%style%' OR column_name ILIKE '%amount%'
              OR column_name ILIKE '%reward_minor%' OR column_name ILIKE '%refund_minor%')`,
    );
    expect(prohibited.rows).toEqual([]);
  });

  it('rejects another business, subjective reasons, and incomplete evidence atomically', async () => {
    const prepared = await prepareSubmission('business-negative');
    const otherOwner = await createUser('other-owner');
    await tenantStore.createBusinessWithOwner({
      correlationId: randomUUID(),
      name: 'Other Synthetic Business',
      ownerUserId: otherOwner,
      publicId: `biz_other_${randomUUID()}`,
    });
    await expect(
      disputeStore.openDispute({
        actorUserId: otherOwner,
        correlationId: randomUUID(),
        evidence: businessEvidence(prepared),
        explanation: 'Cross-business access must fail.',
        openedBy: 'business',
        publicId: `dsp_${randomUUID()}`,
        reasonCode: 'missing_count',
        requirementId: prepared.mission.photoRequirementId,
        submissionAttemptId: prepared.submission.id,
      }),
    ).rejects.toMatchObject({ code: 'DISPUTE_ACCESS_DENIED' });
    await expect(
      disputeStore.openDispute({
        actorUserId: prepared.mission.ownerUserId,
        correlationId: randomUUID(),
        evidence: businessEvidence(prepared),
        explanation: 'I dislike the subjective artistic style.',
        openedBy: 'business',
        publicId: `dsp_${randomUUID()}`,
        reasonCode: 'subjective_style' as DisputeReasonCode,
        requirementId: prepared.mission.photoRequirementId,
        submissionAttemptId: prepared.submission.id,
      }),
    ).rejects.toMatchObject({ code: 'DISPUTE_EVIDENCE_INVALID' });
    await expect(
      disputeStore.openDispute({
        actorUserId: prepared.mission.ownerUserId,
        correlationId: randomUUID(),
        evidence: businessEvidence(prepared).slice(0, 1),
        explanation: 'Evidence is intentionally incomplete.',
        openedBy: 'business',
        publicId: `dsp_${randomUUID()}`,
        reasonCode: 'missing_count',
        requirementId: prepared.mission.photoRequirementId,
        submissionAttemptId: prepared.submission.id,
      }),
    ).rejects.toMatchObject({ code: 'DISPUTE_EVIDENCE_INVALID' });
    expect(await countRows('submission_disputes')).toBe(0);
    expect(await countRows('dispute_evidence_items')).toBe(0);
    expect(await countRows('dispute_status_history')).toBe(0);
  });

  it('lets the creator dispute one timely correction and pauses that submission path', async () => {
    const prepared = await prepareSubmission('creator-open');
    const correctionId = await requestCorrection(prepared);
    const otherCreator = await createQualifiedCreator('other-creator');
    const evidence = [
      {
        kind: 'deliverable_requirement' as const,
        publicId: `dev_req_${randomUUID()}`,
        referenceId: prepared.mission.photoRequirementId,
      },
      {
        kind: 'correction_request' as const,
        publicId: `dev_cor_${randomUUID()}`,
        referenceId: correctionId,
      },
    ];
    const input = {
      correlationId: randomUUID(),
      evidence,
      explanation: 'The submitted photo already satisfies the locked resolution requirement.',
      openedBy: 'creator' as const,
      publicId: `dsp_creator_${randomUUID()}`,
      reasonCode: 'requirement_already_satisfied' as const,
      requirementId: prepared.mission.photoRequirementId,
      submissionAttemptId: prepared.submission.id,
    };
    await expect(
      disputeStore.openDispute({ ...input, actorUserId: otherCreator }),
    ).rejects.toMatchObject({
      code: 'DISPUTE_ACCESS_DENIED',
    });
    const dispute = await disputeStore.openDispute({
      ...input,
      actorUserId: prepared.mission.creatorUserId,
    });
    expect(dispute).toMatchObject({ openedBy: 'creator', status: 'open' });
    const submission = await pool.query<{ status: string }>(
      `SELECT status FROM submission_attempts WHERE id = $1`,
      [prepared.submission.id],
    );
    expect(submission.rows[0]?.status).toBe('disputed');
    await expect(
      submissionStore.submitComplete({
        correlationId: randomUUID(),
        creatorUserId: prepared.mission.creatorUserId,
        groups: prepared.groups,
        missionAssignmentId: prepared.mission.assignmentId,
        publicId: `sub_after_dispute_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'SUBMISSION_ALREADY_EXISTS' });
  });

  it('uses database deadlines and rejects late business and creator disputes without partial rows', async () => {
    const businessPrepared = await prepareSubmission('late-business');
    await pool.query(
      `UPDATE submission_attempts
          SET submitted_at = now() - interval '49 hours',
              review_deadline_at = now() - interval '1 hour'
        WHERE id = $1`,
      [businessPrepared.submission.id],
    );
    await expect(openBusinessDispute(businessPrepared)).rejects.toMatchObject({
      code: 'DISPUTE_REVIEW_EXPIRED',
    });

    const creatorPrepared = await prepareSubmission('late-creator');
    const correctionId = await requestCorrection(creatorPrepared);
    await pool.query(
      `UPDATE correction_requests
          SET created_at = now() - interval '49 hours', due_at = now() - interval '1 hour'
        WHERE id = $1`,
      [correctionId],
    );
    await expect(
      disputeStore.openDispute({
        actorUserId: creatorPrepared.mission.creatorUserId,
        correlationId: randomUUID(),
        evidence: [
          {
            kind: 'deliverable_requirement',
            publicId: `dev_${randomUUID()}`,
            referenceId: creatorPrepared.mission.photoRequirementId,
          },
          {
            kind: 'correction_request',
            publicId: `dev_${randomUUID()}`,
            referenceId: correctionId,
          },
        ],
        explanation: 'This late dispute must not change state.',
        openedBy: 'creator',
        publicId: `dsp_${randomUUID()}`,
        reasonCode: 'correction_outside_contract',
        requirementId: creatorPrepared.mission.photoRequirementId,
        submissionAttemptId: creatorPrepared.submission.id,
      }),
    ).rejects.toMatchObject({ code: 'DISPUTE_REVIEW_EXPIRED' });
    expect(await countRows('submission_disputes')).toBe(0);
    expect(await countRows('dispute_evidence_items')).toBe(0);
  });

  it('rejects cross-mission evidence and permits exactly one concurrent dispute', async () => {
    const prepared = await prepareSubmission('dispute-race');
    const other = await prepareSubmission('foreign-evidence');
    await expect(
      disputeStore.openDispute({
        actorUserId: prepared.mission.ownerUserId,
        correlationId: randomUUID(),
        evidence: [
          businessEvidence(prepared)[0]!,
          {
            kind: 'media_asset',
            publicId: `dev_foreign_${randomUUID()}`,
            referenceId: other.firstPhotoAssetId,
          },
        ],
        explanation: 'Foreign media must never enter this case.',
        openedBy: 'business',
        publicId: `dsp_${randomUUID()}`,
        reasonCode: 'wrong_subject',
        requirementId: prepared.mission.photoRequirementId,
        submissionAttemptId: prepared.submission.id,
      }),
    ).rejects.toMatchObject({ code: 'DISPUTE_EVIDENCE_INVALID' });
    const attempts = await Promise.allSettled([
      openBusinessDispute(prepared, 'a'),
      openBusinessDispute(prepared, 'b'),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'DISPUTE_TRANSITION_CONFLICT' }),
      status: 'rejected',
    });
    expect(await countRows('submission_disputes')).toBe(1);
    expect(await countRows('dispute_evidence_items')).toBe(2);
    expect(await countRows('dispute_status_history')).toBe(1);
  });

  it('resolves approval versus dispute exactly once in one transaction', async () => {
    const prepared = await prepareSubmission('approval-race');
    const attempts = await Promise.allSettled([
      submissionStore.reviewSubmission({
        actorUserId: prepared.mission.ownerUserId,
        correlationId: randomUUID(),
        decision: 'approve',
        decisionPublicId: `dec_${randomUUID()}`,
        submissionAttemptId: prepared.submission.id,
      }),
      openBusinessDispute(prepared),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await countRows('submission_review_decisions')) + (await countRows('submission_disputes')),
    ).toBe(1);
    const status = await pool.query<{ status: string }>(
      `SELECT status FROM submission_attempts WHERE id = $1`,
      [prepared.submission.id],
    );
    expect(['approved', 'disputed']).toContain(status.rows[0]?.status);
    const approvalWon = status.rows[0]?.status === 'approved';
    expect(await countRows('financial_action_intents')).toBe(approvalWon ? 1 : 0);
  });

  it('requires an independent reviewer and overturns a correction to the full creator reward', async () => {
    const prepared = await prepareSubmission('earned-resolution');
    const correctionId = await requestCorrection(prepared);
    const dispute = await disputeStore.openDispute({
      actorUserId: prepared.mission.creatorUserId,
      correlationId: randomUUID(),
      evidence: [
        {
          kind: 'deliverable_requirement',
          publicId: `dev_${randomUUID()}`,
          referenceId: prepared.mission.photoRequirementId,
        },
        { kind: 'correction_request', publicId: `dev_${randomUUID()}`, referenceId: correctionId },
      ],
      explanation: 'The locked technical requirement was already satisfied.',
      openedBy: 'creator',
      publicId: `dsp_${randomUUID()}`,
      reasonCode: 'requirement_already_satisfied',
      requirementId: prepared.mission.photoRequirementId,
      submissionAttemptId: prepared.submission.id,
    });
    const ordinaryUser = await createUser('ordinary-reviewer');
    await expect(
      disputeStore.resolveDispute({
        actorUserId: ordinaryUser,
        correlationId: randomUUID(),
        disputeId: dispute.id,
        explanation: 'Unauthorized resolution.',
        outcome: 'earned_full',
        resolutionPublicId: `res_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'DISPUTE_ACCESS_DENIED' });

    await addPlatformReviewer(prepared.mission.ownerUserId, 'owner-conflict');
    await expect(
      disputeStore.resolveDispute({
        actorUserId: prepared.mission.ownerUserId,
        correlationId: randomUUID(),
        disputeId: dispute.id,
        explanation: 'A business party cannot resolve its own mission.',
        outcome: 'earned_full',
        resolutionPublicId: `res_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'DISPUTE_REVIEWER_CONFLICT' });

    const reviewer = await createUser('independent-reviewer');
    await addPlatformReviewer(reviewer, 'independent');
    const resolved = await disputeStore.resolveDispute({
      actorUserId: reviewer,
      correlationId: randomUUID(),
      disputeId: dispute.id,
      explanation: 'The accepted files satisfy the cited locked objective requirement.',
      outcome: 'earned_full',
      resolutionPublicId: `res_${randomUUID()}`,
    });
    expect(resolved.status).toBe('resolved_earned_full');
    const states = await pool.query<{
      application: string;
      assignment: string;
      slot: string;
      submission: string;
    }>(
      `SELECT a.status AS application, ma.status AS assignment, ms.status AS slot,
              sa.status AS submission
       FROM submission_attempts sa JOIN mission_assignments ma ON ma.id = sa.mission_assignment_id
       JOIN mission_applications a ON a.id = ma.application_id
       JOIN mission_slots ms ON ms.id = ma.mission_slot_id WHERE sa.id = $1`,
      [prepared.submission.id],
    );
    expect(states.rows[0]).toEqual({
      application: 'completed',
      assignment: 'completed',
      slot: 'completed',
      submission: 'resolved_approved',
    });
    const intent = await pool.query<{ action: string; status: string }>(
      `SELECT action, status FROM financial_action_intents WHERE mission_assignment_id = $1`,
      [prepared.mission.assignmentId],
    );
    expect(intent.rows).toEqual([{ action: 'creator_payable_full', status: 'pending_ledger' }]);
  });

  it('upholds a correction as no-payout with one refund intent under a resolution race', async () => {
    const prepared = await prepareSubmission('no-payout-resolution');
    const correctionId = await requestCorrection(prepared);
    const dispute = await disputeStore.openDispute({
      actorUserId: prepared.mission.creatorUserId,
      correlationId: randomUUID(),
      evidence: [
        {
          kind: 'deliverable_requirement',
          publicId: `dev_${randomUUID()}`,
          referenceId: prepared.mission.photoRequirementId,
        },
        { kind: 'correction_request', publicId: `dev_${randomUUID()}`, referenceId: correctionId },
      ],
      explanation: 'The creator requests independent review instead of correction.',
      openedBy: 'creator',
      publicId: `dsp_${randomUUID()}`,
      reasonCode: 'correction_outside_contract',
      requirementId: prepared.mission.photoRequirementId,
      submissionAttemptId: prepared.submission.id,
    });
    const reviewers = await Promise.all([createUser('reviewer-a'), createUser('reviewer-b')]);
    await Promise.all(
      reviewers.map((reviewer, index) => addPlatformReviewer(reviewer, `race-${index}`)),
    );
    const attempts = await Promise.allSettled(
      reviewers.map((actorUserId, index) =>
        disputeStore.resolveDispute({
          actorUserId,
          correlationId: randomUUID(),
          disputeId: dispute.id,
          explanation: 'The cited correction is within the accepted objective checklist.',
          outcome: 'no_payout',
          resolutionPublicId: `res_race_${index}_${randomUUID()}`,
        }),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'DISPUTE_TRANSITION_CONFLICT' }),
      status: 'rejected',
    });
    const states = await pool.query<{
      application: string;
      assignment: string;
      slot: string;
      submission: string;
    }>(
      `SELECT a.status AS application, ma.status AS assignment, ms.status AS slot,
              sa.status AS submission
       FROM submission_attempts sa JOIN mission_assignments ma ON ma.id = sa.mission_assignment_id
       JOIN mission_applications a ON a.id = ma.application_id
       JOIN mission_slots ms ON ms.id = ma.mission_slot_id WHERE sa.id = $1`,
      [prepared.submission.id],
    );
    expect(states.rows[0]).toEqual({
      application: 'no_payout',
      assignment: 'no_payout',
      slot: 'no_payout',
      submission: 'resolved_no_payout',
    });
    expect(await countRows('dispute_resolutions')).toBe(1);
    expect(await countRows('financial_action_intents', `WHERE action = 'slot_refund_full'`)).toBe(
      1,
    );
    expect(
      await countRows('financial_action_intents', `WHERE action = 'creator_payable_full'`),
    ).toBe(0);
    expect(await countRows('dispute_status_history')).toBe(2);
  });
});
