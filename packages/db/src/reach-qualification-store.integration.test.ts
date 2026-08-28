import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { migrationsDirectory } from '../scripts/migration-manifest.js';
import { MissionApplicationStore } from './mission-application-store.js';
import { ReachQualificationStore } from './reach-qualification-store.js';
import { initialSchemaTables } from './schema.js';

const databaseName = `local_missions_m3_reach_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;
const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let reachStore: ReachQualificationStore;
let missionStore: MissionApplicationStore;

async function insertUser(label: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (public_id) VALUES ($1) RETURNING id`,
    [`usr_reach_${label}_${randomUUID()}`],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error('Synthetic Reach user insert failed.');
  return id;
}

async function insertCreator(label: string): Promise<string> {
  const userId = await insertUser(label);
  await pool.query(
    `INSERT INTO creator_profiles (
       user_id, public_id, status, locality_status, verified_postal_area,
       locality_verified_at, locality_expires_at
     ) VALUES ($1,$2,'approved','verified','32801',now(),now()+interval '1 year')`,
    [userId, `cr_reach_${label}_${randomUUID()}`],
  );
  return userId;
}

async function insertStaff(
  label: string,
  role: 'admin' | 'verification_reviewer',
): Promise<string> {
  const userId = await insertUser(label);
  await pool.query(
    `INSERT INTO platform_staff_memberships (public_id, user_id, role, status)
     VALUES ($1,$2,$3,'active')`,
    [`staff_reach_${label}_${randomUUID()}`, userId, role],
  );
  return userId;
}

async function activatePlatform(
  administratorId: string,
  platform: 'instagram' | 'tiktok' | 'youtube',
): Promise<void> {
  await reachStore.activatePlatform({
    actorUserId: administratorId,
    approvedProviderKey: `${platform}_official_api`,
    approvedSourceType: 'official_platform_api',
    correlationId: randomUUID(),
    methodologyVersion: 'local-audience-v1',
    platform,
    reviews: {
      feasibility: true,
      operations: true,
      privacy: true,
      providerPolicy: true,
      reliability: true,
      retention: true,
      security: true,
    },
  });
}

async function qualify(input: {
  administratorId: string;
  count: number;
  creatorId: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  reviewerId: string;
}) {
  await reachStore.setConsent({
    actorUserId: input.creatorId,
    consentVersion: 'reach-consent-v1',
    correlationId: randomUUID(),
    platform: input.platform,
    publicId: `rcn_${randomUUID()}`,
  });
  const verification = await reachStore.submitVerification({
    actorUserId: input.creatorId,
    authenticityStatus: 'passed',
    correlationId: randomUUID(),
    estimatedLocalAudienceCount: input.count,
    evidenceReference: `private/reach/${input.platform}/evidence_${randomUUID()}`,
    platform: input.platform,
    providerConnectionReference: `private/reach/${input.platform}/connection_${randomUUID()}`,
    providerKey: `${input.platform}_official_api`,
    publicId: `rvr_${randomUUID()}`,
    sourceType: 'official_platform_api',
  });
  const reviewed = await reachStore.reviewVerification({
    actorUserId: input.reviewerId,
    correlationId: randomUUID(),
    verificationId: verification.id,
  });
  return { reviewed, verification };
}

async function createCampaign(input: {
  ownerId: string;
  reachLevel?: 'level_1' | 'level_2' | 'level_3';
  reachPlatform?: 'instagram' | 'tiktok' | 'youtube';
  type: 'community' | 'reach';
}): Promise<{ businessId: string; campaignId: string; slotId: string }> {
  const business = await pool.query<{ id: string }>(
    `INSERT INTO businesses (public_id, name) VALUES ($1,'Synthetic Reach Business') RETURNING id`,
    [`biz_reach_${randomUUID()}`],
  );
  const businessId = business.rows[0]?.id;
  if (!businessId) throw new Error('Synthetic Reach business insert failed.');
  await pool.query(
    `INSERT INTO business_memberships (business_id, user_id, role, status)
     VALUES ($1,$2,'owner','active')`,
    [businessId, input.ownerId],
  );
  const base = 5_000;
  const bonus =
    input.type === 'community'
      ? 0
      : input.reachLevel === 'level_1'
        ? 2_500
        : input.reachLevel === 'level_2'
          ? 5_000
          : 10_000;
  const campaign = await pool.query<{ id: string }>(
    `INSERT INTO campaigns (
       public_id, business_id, title, status, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES ($1,$2,'Synthetic Reach Campaign','published',$3,$4,$5,'USD',1) RETURNING id`,
    [
      `cmp_reach_${randomUUID()}`,
      businessId,
      base + bonus,
      Math.floor(((base + bonus) * 15 + 50) / 100),
      base + bonus + Math.floor(((base + bonus) * 15 + 50) / 100),
    ],
  );
  const campaignId = campaign.rows[0]?.id;
  if (!campaignId) throw new Error('Synthetic Reach campaign insert failed.');
  const template = await pool.query<{ id: string }>(
    `SELECT id FROM mission_templates WHERE code = 'visit_share' AND version = 1`,
  );
  await pool.query(
    `INSERT INTO campaign_brief_versions (
       campaign_id, version, mission_template_id, plain_language_brief, checklist, created_by
     ) VALUES ($1,1,$2,'Synthetic contracted platform post.','{}'::jsonb,$3)`,
    [campaignId, template.rows[0]?.id, input.ownerId],
  );
  const slot = await pool.query<{ id: string }>(
    `INSERT INTO mission_slots (
       public_id, campaign_id, ordinal, type, base_reward_minor, reach_bonus_minor,
       bonus_reward_minor, reward_minor, reach_level, reach_platform, currency
     ) VALUES ($1,$2,1,$3,$4,$5,$5,$6,$7,$8,'USD') RETURNING id`,
    [
      `slot_reach_${randomUUID()}`,
      campaignId,
      input.type,
      base,
      bonus,
      base + bonus,
      input.reachLevel ?? null,
      input.reachPlatform ?? null,
    ],
  );
  const slotId = slot.rows[0]?.id;
  if (!slotId) throw new Error('Synthetic Reach slot insert failed.');
  return { businessId, campaignId, slotId };
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 20 });
  await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory });
  reachStore = new ReachQualificationStore(pool, 'public', 'test');
  missionStore = new MissionApplicationStore(pool);
}, 30_000);

beforeEach(async () => {
  await pool.query(
    `TRUNCATE ${initialSchemaTables.map((table) => `"${table}"`).join(', ')} CASCADE`,
  );
  await pool.query(
    `INSERT INTO reach_platform_capabilities (public_id, platform)
     VALUES ('reach_capability_instagram','instagram'),
            ('reach_capability_tiktok','tiktok'),
            ('reach_capability_youtube','youtube')`,
  );
  await pool.query(
    `INSERT INTO mission_templates (code, version, name, checklist_schema)
     VALUES ('visit_share',1,'Visit & Share','{"type":"object"}'::jsonb)`,
  );
});

afterAll(async () => {
  if (pool) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('optional per-platform Reach qualification', () => {
  it('migrates disabled-by-default capabilities and keeps Community independent of follower data', async () => {
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE 'reach_%' ORDER BY table_name`,
    );
    expect(tables.rows).toHaveLength(10);
    const capabilities = await pool.query<{ platform: string; status: string }>(
      `SELECT platform, status FROM reach_platform_capabilities ORDER BY platform`,
    );
    expect(capabilities.rows).toEqual([
      { platform: 'instagram', status: 'disabled' },
      { platform: 'tiktok', status: 'disabled' },
      { platform: 'youtube', status: 'disabled' },
    ]);
    const followerColumns = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name ILIKE '%follower%'`,
    );
    expect(followerColumns.rows).toEqual([]);
    const creator = await insertCreator('community-only');
    const owner = await insertUser('community-owner');
    const campaign = await createCampaign({ ownerId: owner, type: 'community' });
    await expect(
      missionStore.applyForCommunityMission({
        campaignId: campaign.campaignId,
        correlationId: randomUUID(),
        creatorUserId: creator,
        publicId: `app_community_${randomUUID()}`,
      }),
    ).resolves.toMatchObject({ slotType: 'community', status: 'submitted' });
  });

  it('requires every activation review, creator consent, and the exact approved read-only source', async () => {
    const admin = await insertStaff('activation-admin', 'admin');
    const creator = await insertCreator('source-creator');
    await expect(
      reachStore.activatePlatform({
        actorUserId: admin,
        approvedProviderKey: 'instagram_official_api',
        approvedSourceType: 'official_platform_api',
        correlationId: randomUUID(),
        methodologyVersion: 'local-audience-v1',
        platform: 'instagram',
        reviews: {
          feasibility: true,
          operations: true,
          privacy: true,
          providerPolicy: true,
          reliability: true,
          retention: false,
          security: true,
        },
      }),
    ).rejects.toMatchObject({ code: 'REACH_CAPABILITY_DISABLED' });
    await activatePlatform(admin, 'instagram');
    await expect(
      reachStore.submitVerification({
        actorUserId: creator,
        authenticityStatus: 'passed',
        correlationId: randomUUID(),
        estimatedLocalAudienceCount: 1_500,
        evidenceReference: `private/reach/instagram/evidence_${randomUUID()}`,
        platform: 'instagram',
        providerConnectionReference: `private/reach/instagram/connection_${randomUUID()}`,
        providerKey: 'instagram_official_api',
        publicId: `rvr_${randomUUID()}`,
        sourceType: 'official_platform_api',
      }),
    ).rejects.toMatchObject({ code: 'REACH_CONSENT_REQUIRED' });
    await reachStore.setConsent({
      actorUserId: creator,
      consentVersion: 'reach-consent-v1',
      correlationId: randomUUID(),
      platform: 'instagram',
      publicId: `rcn_${randomUUID()}`,
    });
    await expect(
      reachStore.submitVerification({
        actorUserId: creator,
        authenticityStatus: 'passed',
        correlationId: randomUUID(),
        estimatedLocalAudienceCount: 1_500,
        evidenceReference: `private/reach/instagram/screenshot_${randomUUID()}`,
        platform: 'instagram',
        providerConnectionReference: `private/reach/instagram/manual_${randomUUID()}`,
        providerKey: 'manual_screenshot',
        publicId: `rvr_${randomUUID()}`,
        sourceType: 'approved_analytics_provider',
      }),
    ).rejects.toMatchObject({ code: 'REACH_PROVIDER_NOT_APPROVED' });
    await expect(
      reachStore.submitVerification({
        actorUserId: creator,
        authenticityStatus: 'passed',
        correlationId: randomUUID(),
        estimatedLocalAudienceCount: 1_500,
        evidenceReference: `private/reach/youtube/evidence_${randomUUID()}`,
        platform: 'youtube',
        providerConnectionReference: `private/reach/youtube/connection_${randomUUID()}`,
        providerKey: 'youtube_official_api',
        publicId: `rvr_${randomUUID()}`,
        sourceType: 'official_platform_api',
      }),
    ).rejects.toMatchObject({ code: 'REACH_CAPABILITY_DISABLED' });
  });

  it('derives 90-day levels independently per platform without combining audiences', async () => {
    const admin = await insertStaff('tier-admin', 'admin');
    const reviewer = await insertStaff('tier-reviewer', 'verification_reviewer');
    await activatePlatform(admin, 'instagram');
    await activatePlatform(admin, 'tiktok');
    const cases = [
      [1_000, 'level_1'],
      [5_000, 'level_2'],
      [20_000, 'level_3'],
    ] as const;
    for (const [count, tier] of cases) {
      const creator = await insertCreator(`tier-${tier}`);
      await qualify({
        administratorId: admin,
        count,
        creatorId: creator,
        platform: 'instagram',
        reviewerId: reviewer,
      });
      const summary = await reachStore.getCreatorQualification({
        actorUserId: creator,
        platform: 'instagram',
      });
      expect(summary).toMatchObject({
        isGrace: false,
        platform: 'instagram',
        status: 'current',
        tier,
      });
      expect((summary?.expiresAt.getTime() ?? 0) - (summary?.verifiedAt.getTime() ?? 0)).toBe(
        90 * 86_400_000,
      );
    }
    const multi = await insertCreator('multi-platform');
    await qualify({
      administratorId: admin,
      count: 1_500,
      creatorId: multi,
      platform: 'instagram',
      reviewerId: reviewer,
    });
    await qualify({
      administratorId: admin,
      count: 1_500,
      creatorId: multi,
      platform: 'tiktok',
      reviewerId: reviewer,
    });
    expect(
      await reachStore.getCreatorQualification({ actorUserId: multi, platform: 'instagram' }),
    ).toMatchObject({ tier: 'level_1' });
    expect(
      await reachStore.getCreatorQualification({ actorUserId: multi, platform: 'tiktok' }),
    ).toMatchObject({ tier: 'level_1' });
    expect(
      await pool.query(`SELECT 1 FROM reach_qualifications WHERE creator_user_id = $1`, [multi]),
    ).toMatchObject({ rowCount: 2 });
  });

  it('snapshots an exact-platform tier, hides raw analytics, and protects Community plus accepted reward after revocation', async () => {
    const admin = await insertStaff('application-admin', 'admin');
    const reviewer = await insertStaff('application-reviewer', 'verification_reviewer');
    const owner = await insertUser('reach-owner');
    const outsider = await insertUser('reach-outsider');
    await activatePlatform(admin, 'instagram');
    await activatePlatform(admin, 'tiktok');
    const instagramCreator = await insertCreator('instagram-creator');
    const tiktokCreator = await insertCreator('tiktok-creator');
    await qualify({
      administratorId: admin,
      count: 1_500,
      creatorId: instagramCreator,
      platform: 'instagram',
      reviewerId: reviewer,
    });
    await qualify({
      administratorId: admin,
      count: 1_500,
      creatorId: tiktokCreator,
      platform: 'tiktok',
      reviewerId: reviewer,
    });
    const campaign = await createCampaign({
      ownerId: owner,
      reachLevel: 'level_1',
      reachPlatform: 'instagram',
      type: 'reach',
    });
    await expect(
      missionStore.applyForReachMission({
        campaignId: campaign.campaignId,
        correlationId: randomUUID(),
        creatorUserId: tiktokCreator,
        publicId: `app_wrong_platform_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'CREATOR_NOT_QUALIFIED' });
    const attempts = await Promise.allSettled([
      missionStore.applyForReachMission({
        campaignId: campaign.campaignId,
        correlationId: randomUUID(),
        creatorUserId: instagramCreator,
        publicId: `app_reach_one_${randomUUID()}`,
      }),
      missionStore.applyForReachMission({
        campaignId: campaign.campaignId,
        correlationId: randomUUID(),
        creatorUserId: instagramCreator,
        publicId: `app_reach_two_${randomUUID()}`,
      }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    const reservation = await pool.query<{ id: string; reward_minor: number }>(
      `SELECT reservation.id, slot.reward_minor
         FROM slot_reservations reservation
         JOIN mission_slots slot ON slot.id = reservation.mission_slot_id
        WHERE slot.id = $1`,
      [campaign.slotId],
    );
    const reservationId = reservation.rows[0]?.id;
    expect(reservation.rows[0]?.reward_minor).toBe(7_500);
    const businessView = await reachStore.getBusinessQualificationForReservation({
      actorUserId: owner,
      reservationId: reservationId ?? '',
    });
    expect(Object.keys(businessView).sort()).toEqual([
      'expiresAt',
      'isGrace',
      'platform',
      'status',
      'tier',
      'verifiedAt',
    ]);
    expect(businessView).toMatchObject({ platform: 'instagram', tier: 'level_1' });
    await expect(
      reachStore.getBusinessQualificationForReservation({
        actorUserId: outsider,
        reservationId: reservationId ?? '',
      }),
    ).rejects.toMatchObject({ code: 'REACH_ACCESS_DENIED' });
    await reachStore.revokeConsent({
      actorUserId: instagramCreator,
      correlationId: randomUUID(),
      platform: 'instagram',
    });
    expect(
      await reachStore.getCreatorQualification({
        actorUserId: instagramCreator,
        platform: 'instagram',
      }),
    ).toBeNull();
    expect(
      await pool.query(`SELECT reward_minor FROM mission_slots WHERE id = $1`, [campaign.slotId]),
    ).toMatchObject({ rows: [{ reward_minor: 7_500 }] });
    const community = await createCampaign({ ownerId: owner, type: 'community' });
    await expect(
      missionStore.applyForCommunityMission({
        campaignId: community.campaignId,
        correlationId: randomUUID(),
        creatorUserId: instagramCreator,
        publicId: `app_after_revoke_${randomUUID()}`,
      }),
    ).resolves.toMatchObject({ slotType: 'community' });
  });

  it('grants one outage-specific 14-day grace only to tiers valid when the outage begins', async () => {
    const admin = await insertStaff('outage-admin', 'admin');
    const reviewer = await insertStaff('outage-reviewer', 'verification_reviewer');
    await activatePlatform(admin, 'instagram');
    const creator = await insertCreator('outage-current');
    await qualify({
      administratorId: admin,
      count: 1_500,
      creatorId: creator,
      platform: 'instagram',
      reviewerId: reviewer,
    });
    await pool.query(
      `UPDATE reach_qualifications
          SET verified_at = now()-interval '89 days', expires_at = now()+interval '1 day'
        WHERE creator_user_id = $1 AND platform = 'instagram'`,
      [creator],
    );
    await reachStore.startProviderOutage({
      actorUserId: admin,
      correlationId: randomUUID(),
      platform: 'instagram',
      publicId: `rpo_${randomUUID()}`,
      reasonCode: 'APPROVED_PROVIDER_UNAVAILABLE',
    });
    await pool.query(
      `UPDATE reach_qualifications
          SET verified_at = now()-interval '91 days', expires_at = now()-interval '1 day',
              grace_until = now()+interval '13 days'
        WHERE creator_user_id = $1 AND platform = 'instagram'`,
      [creator],
    );
    expect(
      await reachStore.getCreatorQualification({ actorUserId: creator, platform: 'instagram' }),
    ).toMatchObject({ isGrace: true, status: 'outage_grace' });
    const firstOutage = await pool.query<{ grace_provider_outage_id: string }>(
      `SELECT grace_provider_outage_id FROM reach_qualifications WHERE creator_user_id = $1`,
      [creator],
    );
    await reachStore.resolveProviderOutage({
      actorUserId: admin,
      correlationId: randomUUID(),
      platform: 'instagram',
    });
    expect(
      await reachStore.getCreatorQualification({ actorUserId: creator, platform: 'instagram' }),
    ).toBeNull();
    await reachStore.startProviderOutage({
      actorUserId: admin,
      correlationId: randomUUID(),
      platform: 'instagram',
      publicId: `rpo_${randomUUID()}`,
      reasonCode: 'SECOND_PROVIDER_OUTAGE',
    });
    expect(
      await reachStore.getCreatorQualification({ actorUserId: creator, platform: 'instagram' }),
    ).toBeNull();
    expect(
      await pool.query<{ grace_provider_outage_id: string }>(
        `SELECT grace_provider_outage_id FROM reach_qualifications WHERE creator_user_id = $1`,
        [creator],
      ),
    ).toMatchObject({ rows: firstOutage.rows });
    await reachStore.resolveProviderOutage({
      actorUserId: admin,
      correlationId: randomUUID(),
      platform: 'instagram',
    });
    expect(await reachStore.expireDueQualifications({ correlationId: randomUUID() })).toBe(1);
  });

  it('supports independent appeal and deletes raw, cached, and derived evidence while retaining only the tier', async () => {
    const admin = await insertStaff('appeal-admin', 'admin');
    const firstReviewer = await insertStaff('appeal-reviewer-one', 'verification_reviewer');
    const secondReviewer = await insertStaff('appeal-reviewer-two', 'verification_reviewer');
    const creator = await insertCreator('appeal-creator');
    await activatePlatform(admin, 'instagram');
    const first = await qualify({
      administratorId: admin,
      count: 500,
      creatorId: creator,
      platform: 'instagram',
      reviewerId: firstReviewer,
    });
    expect(first.reviewed.status).toBe('rejected');
    await reachStore.appealVerification({
      actorUserId: creator,
      correlationId: randomUUID(),
      verificationId: first.verification.id,
    });
    await expect(
      reachStore.decideAppeal({
        actorUserId: firstReviewer,
        authenticityStatus: 'passed',
        correctedEstimatedLocalAudienceCount: 6_000,
        correlationId: randomUUID(),
        verificationId: first.verification.id,
      }),
    ).rejects.toMatchObject({ code: 'REACH_APPEAL_INVALID' });
    const approved = await reachStore.decideAppeal({
      actorUserId: secondReviewer,
      authenticityStatus: 'passed',
      correctedEstimatedLocalAudienceCount: 6_000,
      correlationId: randomUUID(),
      verificationId: first.verification.id,
    });
    expect(approved.status).toBe('verified');
    expect(
      await reachStore.getCreatorQualification({ actorUserId: creator, platform: 'instagram' }),
    ).toMatchObject({ tier: 'level_2' });
    await pool.query(
      `UPDATE reach_evidence_deletion_jobs SET available_at = now()-interval '1 second'
        WHERE reach_verification_id = $1`,
      [first.verification.id],
    );
    const claim = await reachStore.claimNextEvidenceDeletion({ workerId: 'reach-retention-test' });
    expect(claim).toMatchObject({ attemptCount: 1, verificationId: first.verification.id });
    expect(claim?.evidenceReference).toMatch(/^private\/reach\//);
    expect(
      await reachStore.completeEvidenceDeletion({
        jobId: claim?.jobId ?? '',
        lockToken: claim?.lockToken ?? '',
        outcome: 'deleted',
        workerId: 'reach-retention-test',
      }),
    ).toBe('completed');
    const minimized = await pool.query<{
      estimated_local_audience_count: number | null;
      evidence_reference: string | null;
      provider_connection_reference: string | null;
    }>(
      `SELECT estimated_local_audience_count, evidence_reference, provider_connection_reference
         FROM reach_verifications WHERE id = $1`,
      [first.verification.id],
    );
    expect(minimized.rows[0]).toEqual({
      estimated_local_audience_count: null,
      evidence_reference: null,
      provider_connection_reference: null,
    });
    expect(
      await reachStore.getCreatorQualification({ actorUserId: creator, platform: 'instagram' }),
    ).toMatchObject({ tier: 'level_2' });
    await expect(
      pool.query(`UPDATE reach_verification_status_history SET reason_code = 'CHANGED'`),
    ).rejects.toThrow(/immutable/);
  });
});
