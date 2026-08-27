import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { CampaignStore } from './campaign-store.js';
import { CheckInStore } from './check-in-store.js';
import { LedgerStore } from './ledger-store.js';
import { MissionApplicationStore } from './mission-application-store.js';
import { SubmissionStore } from './submission-store.js';
import { IdentityTenantStore } from './tenant-store.js';

const migrationPaths = [
  fileURLToPath(new URL('../drizzle/0000_giant_snowbird.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0001_empty_tyrannus.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0002_material_rachel_grey.sql', import.meta.url)),
];
const migration0003 = fileURLToPath(new URL('../drizzle/0003_orange_tempest.sql', import.meta.url));
const migration0004 = fileURLToPath(new URL('../drizzle/0004_handy_gideon.sql', import.meta.url));
const migration0005 = fileURLToPath(
  new URL('../drizzle/0005_huge_agent_brand.sql', import.meta.url),
);
const migration0006 = fileURLToPath(new URL('../drizzle/0006_dapper_mordo.sql', import.meta.url));
const databaseName = `local_missions_m3_check_in_${randomUUID().replaceAll('-', '')}`;
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
let upgradeProof: { campaignTitle: string; totalDueMinor: number };

type ScheduledMission = {
  applicationId: string;
  assignmentId: string;
  businessId: string;
  creatorUserId: string;
  locationId: string;
  ownerUserId: string;
  windowEndsAt: Date;
  windowStartsAt: Date;
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

async function createLocation(
  actorUserId: string,
  businessId: string,
  label: string,
): Promise<string> {
  const location = await tenantStore.createBusinessLocation({
    actorUserId,
    addressLine1: `${label.length + 100} Synthetic Way`,
    businessId,
    city: 'Orlando',
    correlationId: randomUUID(),
    name: `${label} Synthetic Venue`,
    postalCode: '32801',
    publicId: `loc_${label}_${randomUUID()}`,
    region: 'FL',
    timezone: 'America/New_York',
  });
  return location.id;
}

async function createScheduledMission(overrides?: {
  windowEndsAt?: Date;
  windowStartsAt?: Date;
}): Promise<ScheduledMission> {
  const ownerUserId = await createUser('owner');
  const creatorUserId = await createQualifiedCreator('creator');
  const businessId = await tenantStore.createBusinessWithOwner({
    correlationId: randomUUID(),
    name: 'Synthetic Check-in Business',
    ownerUserId,
    publicId: `biz_${randomUUID()}`,
  });
  const locationId = await createLocation(ownerUserId, businessId, 'primary');
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
    title: 'Synthetic Check-in Campaign',
    totalDueMinor: 5_750,
  });
  await missionStore.configureCampaignContract({
    actorUserId: ownerUserId,
    campaignId: campaign.id,
    checklist: { clips: 2, photos: 5 },
    correlationId: randomUUID(),
    missionTemplateCode: 'visit_create',
    missionTemplateVersion: 1,
    plainLanguageBrief: 'Visit the synthetic venue and complete the objective checklist.',
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

  const now = Date.now();
  const windowStartsAt = overrides?.windowStartsAt ?? new Date(now - 60 * 60 * 1_000);
  const windowEndsAt = overrides?.windowEndsAt ?? new Date(now + 60 * 60 * 1_000);
  const assignment = await checkInStore.scheduleAcceptedApplication({
    actorUserId: ownerUserId,
    applicationId: application.id,
    businessLocationId: locationId,
    correlationId: randomUUID(),
    publicId: `asn_${randomUUID()}`,
    timezone: 'America/New_York',
    windowEndsAt,
    windowStartsAt,
  });
  return {
    applicationId: application.id,
    assignmentId: assignment.id,
    businessId,
    creatorUserId,
    locationId,
    ownerUserId,
    windowEndsAt,
    windowStartsAt,
  };
}

function challengeToken(label: string): string {
  return `${label}_${randomUUID()}_${randomUUID()}`;
}

async function issueQrChallenge(mission: ScheduledMission, token: string) {
  return checkInStore.issueChallenge({
    actorUserId: mission.ownerUserId,
    correlationId: randomUUID(),
    expiresAt: new Date(Date.now() + 2 * 60 * 1_000),
    method: 'qr',
    missionAssignmentId: mission.assignmentId,
    publicId: `chi_${randomUUID()}`,
    token,
  });
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

  const baselineBusinessId = '71000000-0000-4000-8000-000000000001';
  await pool.query(
    `INSERT INTO businesses (id, public_id, name)
     VALUES ($1, 'biz_before_check_in_upgrade', 'Pre-check-in Synthetic Business')`,
    [baselineBusinessId],
  );
  await pool.query(
    `INSERT INTO campaigns (
       id, public_id, business_id, title, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES (
       '72000000-0000-4000-8000-000000000001', 'cmp_before_check_in_upgrade', $1,
       'Pre-check-in Campaign', 50000, 7500, 57500, 'USD', 10
     )`,
    [baselineBusinessId],
  );
  await applyMigration(migration0003);
  const preserved = await pool.query<{ campaign_title: string; total_due_minor: number }>(
    `SELECT title AS campaign_title, total_due_minor
       FROM campaigns WHERE public_id = 'cmp_before_check_in_upgrade'`,
  );
  const row = preserved.rows[0];
  if (!row) throw new Error('Check-in migration did not preserve the baseline campaign.');
  upgradeProof = { campaignTitle: row.campaign_title, totalDueMinor: row.total_due_minor };
  await applyMigration(migration0004);
  await applyMigration(migration0005);
  await applyMigration(migration0006);

  campaignStore = new CampaignStore(pool);
  checkInStore = new CheckInStore(pool);
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
              check_in_events, check_in_challenges,
              venue_staff_assignments, mission_assignment_status_history, mission_assignments,
              mission_application_status_history, slot_reservations, mission_applications,
              mission_slots, deliverable_requirements, campaign_brief_versions,
              campaign_status_history, campaigns,
              mission_templates, business_locations, business_memberships, creator_profiles,
              external_identities, businesses, users CASCADE`,
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

describe.sequential('accepted mission scheduling and check-in against real PostgreSQL', () => {
  it('preserves prior data and adds no raw coordinate or plaintext-token field', async () => {
    expect(upgradeProof).toEqual({
      campaignTitle: 'Pre-check-in Campaign',
      totalDueMinor: 57_500,
    });
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (
         'mission_assignments', 'mission_assignment_status_history',
         'venue_staff_assignments', 'check_in_challenges', 'check_in_events'
       ) ORDER BY table_name`,
    );
    expect(tables.rows).toHaveLength(5);

    const prohibitedColumns = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('mission_assignments', 'check_in_challenges', 'check_in_events')
         AND (
           column_name ILIKE '%latitude%' OR column_name ILIKE '%longitude%'
           OR column_name ILIKE '%coordinate%' OR column_name = 'token'
         )`,
    );
    expect(prohibitedColumns.rows).toEqual([]);
  });

  it('schedules only an accepted application at a venue in the correct business', async () => {
    const mission = await createScheduledMission();
    const history = await countRows(
      'mission_assignment_status_history',
      'WHERE mission_assignment_id = $1',
      [mission.assignmentId],
    );
    expect(history).toBe(1);

    await expect(
      checkInStore.scheduleAcceptedApplication({
        actorUserId: mission.ownerUserId,
        applicationId: mission.applicationId,
        businessLocationId: mission.locationId,
        correlationId: randomUUID(),
        publicId: `asn_duplicate_${randomUUID()}`,
        timezone: 'America/New_York',
        windowEndsAt: mission.windowEndsAt,
        windowStartsAt: mission.windowStartsAt,
      }),
    ).rejects.toMatchObject({ code: 'MISSION_SCHEDULE_CONFLICT', httpStatus: 409 });

    const otherOwner = await createUser('other-owner');
    const otherBusiness = await tenantStore.createBusinessWithOwner({
      correlationId: randomUUID(),
      name: 'Other Business',
      ownerUserId: otherOwner,
      publicId: `biz_other_${randomUUID()}`,
    });
    const otherLocation = await createLocation(otherOwner, otherBusiness, 'other');
    await expect(
      checkInStore.scheduleAcceptedApplication({
        actorUserId: otherOwner,
        applicationId: mission.applicationId,
        businessLocationId: otherLocation,
        correlationId: randomUUID(),
        publicId: `asn_cross_tenant_${randomUUID()}`,
        timezone: 'America/New_York',
        windowEndsAt: mission.windowEndsAt,
        windowStartsAt: mission.windowStartsAt,
      }),
    ).rejects.toMatchObject({ code: 'CHECK_IN_ACCESS_DENIED', httpStatus: 403 });
  });

  it('restricts challenge issuance to assigned Venue Staff at the exact venue and window', async () => {
    const mission = await createScheduledMission();
    const staffUserId = await createUser('staff');
    await tenantStore.addBusinessMembership({
      actorUserId: mission.ownerUserId,
      businessId: mission.businessId,
      correlationId: randomUUID(),
      role: 'venue_staff',
      userId: staffUserId,
    });
    const token = challengeToken('staff');
    await expect(
      checkInStore.issueChallenge({
        actorUserId: staffUserId,
        correlationId: randomUUID(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1_000),
        method: 'staff_code',
        missionAssignmentId: mission.assignmentId,
        publicId: `chi_unauthorized_${randomUUID()}`,
        fallbackReason: 'Creator camera permission was denied.',
        token,
      }),
    ).rejects.toMatchObject({ code: 'VENUE_STAFF_ACCESS_DENIED', httpStatus: 403 });

    await checkInStore.assignVenueStaff({
      actorUserId: mission.ownerUserId,
      businessLocationId: mission.locationId,
      correlationId: randomUUID(),
      publicId: `vsa_${randomUUID()}`,
      staffUserId,
      windowEndsAt: mission.windowEndsAt,
      windowStartsAt: mission.windowStartsAt,
    });
    await expect(
      checkInStore.issueChallenge({
        actorUserId: staffUserId,
        correlationId: randomUUID(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1_000),
        method: 'staff_code',
        missionAssignmentId: mission.assignmentId,
        publicId: `chi_staff_no_reason_${randomUUID()}`,
        token: challengeToken('missing-reason'),
      }),
    ).rejects.toMatchObject({ code: 'CHECK_IN_CHALLENGE_INVALID', httpStatus: 409 });
    const challenge = await checkInStore.issueChallenge({
      actorUserId: staffUserId,
      correlationId: randomUUID(),
      expiresAt: new Date(Date.now() + 2 * 60 * 1_000),
      fallbackReason: 'Creator camera permission was denied.',
      method: 'staff_code',
      missionAssignmentId: mission.assignmentId,
      publicId: `chi_staff_${randomUUID()}`,
      token,
    });
    const stored = await pool.query<{
      created_by: string;
      fallback_reason: string;
      token_hash: string;
    }>(
      `SELECT created_by, fallback_reason, token_hash
         FROM check_in_challenges WHERE id = $1`,
      [challenge.id],
    );
    expect(stored.rows[0]).toMatchObject({
      created_by: staffUserId,
      fallback_reason: 'Creator camera permission was denied.',
    });
    expect(stored.rows[0]?.token_hash).not.toBe(token);
    const event = await checkInStore.consumeChallenge({
      accuracyClass: 'unavailable',
      businessLocationId: mission.locationId,
      challengePublicId: challenge.publicId,
      correlationId: randomUUID(),
      creatorUserId: mission.creatorUserId,
      eventPublicId: `cin_staff_${randomUUID()}`,
      token,
    });
    expect(event.verificationMethod).toBe('staff_code');
  });

  it('rotates an active QR challenge and rejects the replaced token', async () => {
    const mission = await createScheduledMission();
    const firstToken = challengeToken('first');
    const first = await issueQrChallenge(mission, firstToken);
    const secondToken = challengeToken('second');
    const second = await issueQrChallenge(mission, secondToken);

    await expect(
      checkInStore.consumeChallenge({
        accuracyClass: 'unavailable',
        businessLocationId: mission.locationId,
        challengePublicId: first.publicId,
        correlationId: randomUUID(),
        creatorUserId: mission.creatorUserId,
        eventPublicId: `cin_replaced_${randomUUID()}`,
        token: firstToken,
      }),
    ).rejects.toMatchObject({ code: 'CHECK_IN_CHALLENGE_REPLAYED', httpStatus: 409 });

    const event = await checkInStore.consumeChallenge({
      accuracyClass: 'unavailable',
      businessLocationId: mission.locationId,
      challengePublicId: second.publicId,
      correlationId: randomUUID(),
      creatorUserId: mission.creatorUserId,
      eventPublicId: `cin_current_${randomUUID()}`,
      token: secondToken,
    });
    expect(event.missionAssignmentId).toBe(mission.assignmentId);
    expect(await countRows('check_in_challenges', `WHERE status = 'revoked'`)).toBe(1);
    expect(await countRows('check_in_challenges', `WHERE status = 'consumed'`)).toBe(1);
  });

  it('atomically records a privacy-minimized QR check-in and assignment history', async () => {
    const mission = await createScheduledMission();
    const token = challengeToken('valid');
    const challenge = await issueQrChallenge(mission, token);
    const event = await checkInStore.consumeChallenge({
      accuracyClass: 'coarse',
      businessLocationId: mission.locationId,
      challengePublicId: challenge.publicId,
      correlationId: randomUUID(),
      creatorUserId: mission.creatorUserId,
      eventPublicId: `cin_${randomUUID()}`,
      token,
    });

    expect(event).toMatchObject({
      accuracyClass: 'coarse',
      businessLocationId: mission.locationId,
      creatorUserId: mission.creatorUserId,
      missionAssignmentId: mission.assignmentId,
      verificationMethod: 'qr',
    });
    const assignment = await pool.query<{ status: string; version: number }>(
      `SELECT status, version FROM mission_assignments WHERE id = $1`,
      [mission.assignmentId],
    );
    expect(assignment.rows[0]).toEqual({ status: 'checked_in', version: 2 });
    expect(await countRows('check_in_events')).toBe(1);
    expect(await countRows('check_in_challenges', `WHERE status = 'consumed'`)).toBe(1);
    expect(await countRows('mission_assignment_status_history')).toBe(2);
  });

  it('rejects cross-creator, wrong-venue, and server-expired attempts without an event', async () => {
    const mission = await createScheduledMission();
    const otherCreator = await createQualifiedCreator('other-creator');
    const otherLocation = await createLocation(
      mission.ownerUserId,
      mission.businessId,
      'secondary',
    );
    const token = challengeToken('negative');
    const challenge = await issueQrChallenge(mission, token);

    await expect(
      checkInStore.consumeChallenge({
        accuracyClass: 'unavailable',
        businessLocationId: mission.locationId,
        challengePublicId: challenge.publicId,
        correlationId: randomUUID(),
        creatorUserId: otherCreator,
        eventPublicId: `cin_cross_creator_${randomUUID()}`,
        token,
      }),
    ).rejects.toMatchObject({ code: 'CHECK_IN_ACCESS_DENIED', httpStatus: 403 });
    await expect(
      checkInStore.consumeChallenge({
        accuracyClass: 'unavailable',
        businessLocationId: otherLocation,
        challengePublicId: challenge.publicId,
        correlationId: randomUUID(),
        creatorUserId: mission.creatorUserId,
        eventPublicId: `cin_wrong_venue_${randomUUID()}`,
        token,
      }),
    ).rejects.toMatchObject({ code: 'CHECK_IN_WRONG_VENUE', httpStatus: 409 });

    await pool.query(
      `UPDATE check_in_challenges
          SET created_at = now() - interval '10 minutes',
              expires_at = now() - interval '1 minute'
        WHERE id = $1`,
      [challenge.id],
    );
    await expect(
      checkInStore.consumeChallenge({
        accuracyClass: 'unavailable',
        businessLocationId: mission.locationId,
        challengePublicId: challenge.publicId,
        correlationId: randomUUID(),
        creatorUserId: mission.creatorUserId,
        eventPublicId: `cin_expired_${randomUUID()}`,
        token,
      }),
    ).rejects.toMatchObject({ code: 'CHECK_IN_CHALLENGE_EXPIRED', httpStatus: 409 });
    expect(await countRows('check_in_events')).toBe(0);
  });

  it('allows exactly one winner when the same one-time challenge is replayed concurrently', async () => {
    const mission = await createScheduledMission();
    const token = challengeToken('race');
    const challenge = await issueQrChallenge(mission, token);
    const attempts = await Promise.allSettled(
      ['a', 'b'].map((suffix) =>
        checkInStore.consumeChallenge({
          accuracyClass: 'precise',
          businessLocationId: mission.locationId,
          challengePublicId: challenge.publicId,
          correlationId: randomUUID(),
          creatorUserId: mission.creatorUserId,
          eventPublicId: `cin_race_${suffix}_${randomUUID()}`,
          token,
        }),
      ),
    );

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'CHECK_IN_CHALLENGE_REPLAYED', httpStatus: 409 }),
      status: 'rejected',
    });
    expect(await countRows('check_in_events')).toBe(1);
    expect(await countRows('mission_assignment_status_history')).toBe(2);
  });

  it('uses database time and refuses challenge issuance outside the mission window', async () => {
    const futureStart = new Date(Date.now() + 60 * 60 * 1_000);
    const mission = await createScheduledMission({
      windowEndsAt: new Date(futureStart.getTime() + 60 * 60 * 1_000),
      windowStartsAt: futureStart,
    });
    await expect(issueQrChallenge(mission, challengeToken('future'))).rejects.toMatchObject({
      code: 'CHECK_IN_OUTSIDE_WINDOW',
      httpStatus: 409,
    });
    expect(await countRows('check_in_challenges')).toBe(0);
  });
});
