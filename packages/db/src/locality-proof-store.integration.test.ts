import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { migrationsDirectory } from '../scripts/migration-manifest.js';
import { LocalityProofStore } from './locality-proof-store.js';
import { MissionApplicationStore } from './mission-application-store.js';
import { initialSchemaTables } from './schema.js';
import { IdentityTenantStore } from './tenant-store.js';

const databaseName = `local_missions_m3_locality_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;
const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let localityStore: LocalityProofStore;
let missionStore: MissionApplicationStore;
let tenantStore: IdentityTenantStore;

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

async function createCreator(label: string): Promise<string> {
  const userId = await createUser(label);
  await tenantStore.createCreatorProfile({
    correlationId: randomUUID(),
    publicId: `cr_${label}_${randomUUID()}`,
    userId,
  });
  await pool.query(`UPDATE creator_profiles SET status = 'approved' WHERE user_id = $1`, [userId]);
  return userId;
}

async function createStaff(
  label: string,
  role: 'admin' | 'verification_reviewer',
): Promise<string> {
  const userId = await createUser(label);
  await pool.query(
    `INSERT INTO platform_staff_memberships (public_id, user_id, role, status)
     VALUES ($1,$2,$3,'active')`,
    [`staff_${label}_${randomUUID()}`, userId, role],
  );
  return userId;
}

async function submitVerification(creatorUserId: string, label: string) {
  return localityStore.submit({
    actorUserId: creatorUserId,
    correlationId: randomUUID(),
    declaredPostalArea: '32801',
    evidenceReference: `private/locality/synthetic/${label}_${randomUUID()}`,
    method: 'utility_bill',
    publicId: `lv_${label}_${randomUUID()}`,
  });
}

async function approveVerification(creatorUserId: string, reviewerUserId: string, label: string) {
  const submitted = await submitVerification(creatorUserId, label);
  return localityStore.review({
    actorUserId: reviewerUserId,
    correlationId: randomUUID(),
    decision: 'approve',
    reason: 'approved',
    verificationId: submitted.id,
  });
}

async function makeDeletionDue(verificationId: string): Promise<void> {
  await pool.query(
    `UPDATE locality_verifications
        SET evidence_deletion_due_at = now() - interval '1 second'
      WHERE id = $1`,
    [verificationId],
  );
  await pool.query(
    `UPDATE locality_evidence_deletion_jobs
        SET available_at = now() - interval '1 second'
      WHERE locality_verification_id = $1`,
    [verificationId],
  );
}

async function createPublishedCommunityCampaign(): Promise<string> {
  const ownerId = await createUser('campaign-owner');
  const businessId = await tenantStore.createBusinessWithOwner({
    correlationId: randomUUID(),
    name: 'Synthetic Locality Gate Business',
    ownerUserId: ownerId,
    publicId: `biz_locality_${randomUUID()}`,
  });
  const campaign = await pool.query<{ id: string }>(
    `INSERT INTO campaigns (
       public_id, business_id, title, status, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES ($1,$2,'Synthetic Locality Gate Campaign','published',5000,750,5750,'USD',1)
     RETURNING id`,
    [`cmp_locality_${randomUUID()}`, businessId],
  );
  const campaignId = campaign.rows[0]?.id;
  if (!campaignId) throw new Error('Synthetic locality campaign insert returned no row.');
  await pool.query(
    `INSERT INTO mission_slots (
       public_id, campaign_id, ordinal, type, base_reward_minor,
       reach_bonus_minor, contract_add_on_bonus_minor, bonus_reward_minor,
       reward_minor, currency
     ) VALUES ($1,$2,1,'community',5000,0,0,0,5000,'USD')`,
    [`slot_locality_${randomUUID()}`, campaignId],
  );
  return campaignId;
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 20 });
  await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory });
  localityStore = new LocalityProofStore(pool, 'public', 'test');
  missionStore = new MissionApplicationStore(pool);
  tenantStore = new IdentityTenantStore(pool);
}, 30_000);

beforeEach(async () => {
  const tableList = initialSchemaTables.map((table) => `"${table}"`).join(', ');
  await pool.query(`TRUNCATE ${tableList} CASCADE`);
});

afterAll(async () => {
  if (pool) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('raw locality-proof lifecycle', () => {
  it('preserves prior derived credentials without inventing a raw proof', async () => {
    const migrationDatabaseName = `local_missions_locality_upgrade_${randomUUID().replaceAll('-', '')}`;
    const migrationUrl = new URL(baseUrl);
    migrationUrl.pathname = `/${migrationDatabaseName}`;
    await adminPool.query(`CREATE DATABASE "${migrationDatabaseName}"`);
    const migrationPool = new Pool({ connectionString: migrationUrl.toString(), max: 2 });
    try {
      const migrations = readMigrationFiles({ migrationsFolder: migrationsDirectory });
      const localityEvidenceMigrationIndex = 13;
      for (const migration of migrations.slice(0, localityEvidenceMigrationIndex)) {
        const client = await migrationPool.connect();
        try {
          await client.query('BEGIN');
          for (const statement of migration.sql) await client.query(statement);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
      await migrationPool.query(`
        INSERT INTO users (id, public_id)
        VALUES ('10000000-0000-4000-8000-000000000131', 'usr_synthetic_locality_upgrade')
      `);
      await migrationPool.query(`
        INSERT INTO creator_profiles (
          user_id, public_id, status, locality_status, verified_postal_area,
          locality_verified_at, locality_expires_at
        ) VALUES (
          '10000000-0000-4000-8000-000000000131', 'cr_synthetic_locality_upgrade',
          'approved', 'verified', '32801', '2026-08-01T12:00:00Z', '2027-08-01T12:00:00Z'
        )
      `);
      const latest = migrations[localityEvidenceMigrationIndex];
      if (!latest) throw new Error('Raw locality-proof migration is missing.');
      const client = await migrationPool.connect();
      try {
        await client.query('BEGIN');
        for (const statement of latest.sql) await client.query(statement);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      const result = await migrationPool.query<{
        attempt_count: number;
        evidence_deleted_at: Date | null;
        evidence_reference: string | null;
        job_status: string;
        status: string;
      }>(`
        SELECT verification.status, verification.evidence_reference,
               verification.evidence_deleted_at, job.status AS job_status, job.attempt_count
          FROM locality_verifications verification
          JOIN locality_evidence_deletion_jobs job
            ON job.locality_verification_id = verification.id
         WHERE verification.creator_user_id = '10000000-0000-4000-8000-000000000131'
      `);
      expect(result.rows[0]).toMatchObject({
        attempt_count: 0,
        evidence_reference: null,
        job_status: 'completed',
        status: 'verified',
      });
      expect(result.rows[0]?.evidence_deleted_at).toBeInstanceOf(Date);
    } finally {
      await migrationPool.end();
      await adminPool.query(`DROP DATABASE IF EXISTS "${migrationDatabaseName}"`);
    }
  }, 30_000);

  it('keeps evidence private and requires an authorized objective review', async () => {
    const creatorId = await createCreator('privacy-creator');
    const ordinaryUserId = await createUser('ordinary-reviewer');
    const reviewerId = await createStaff('privacy-reviewer', 'verification_reviewer');
    const submitted = await submitVerification(creatorId, 'privacy');

    expect(JSON.stringify(submitted)).not.toContain('private/locality');
    await expect(
      localityStore.review({
        actorUserId: ordinaryUserId,
        correlationId: randomUUID(),
        decision: 'approve',
        reason: 'approved',
        verificationId: submitted.id,
      }),
    ).rejects.toMatchObject({ code: 'LOCALITY_ACCESS_DENIED' });
    await expect(
      localityStore.review({
        actorUserId: reviewerId,
        correlationId: randomUUID(),
        decision: 'approve',
        reason: 'unreadable',
        verificationId: submitted.id,
      }),
    ).rejects.toMatchObject({ code: 'LOCALITY_REVIEW_INVALID' });

    const columns = await pool.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name LIKE 'locality_%'
    `);
    expect(columns.rows.map((row) => row.column_name).join(' ')).not.toMatch(
      /street|address_line|document_bytes|file_blob|bank|payout|latitude|longitude/,
    );
    const audit = await pool.query<{ details: unknown }>(
      `SELECT details FROM audit_events WHERE subject_id = $1 ORDER BY occurred_at`,
      [submitted.id],
    );
    expect(JSON.stringify(audit.rows)).not.toContain('private/locality');
  });

  it('supports one objective correction and an independent timely appeal', async () => {
    const creatorId = await createCreator('appeal-creator');
    const firstReviewerId = await createStaff('first-reviewer', 'verification_reviewer');
    const appealReviewerId = await createStaff('appeal-reviewer', 'verification_reviewer');

    const correction = await submitVerification(creatorId, 'correction');
    const requested = await localityStore.review({
      actorUserId: firstReviewerId,
      correlationId: randomUUID(),
      decision: 'request_correction',
      reason: 'unreadable',
      verificationId: correction.id,
    });
    expect(requested.status).toBe('correction_needed');
    const resubmitted = await localityStore.resubmitCorrection({
      actorUserId: creatorId,
      correlationId: randomUUID(),
      declaredPostalArea: '32801',
      evidenceReference: `private/locality/synthetic/corrected_${randomUUID()}`,
      method: 'government_mail',
      verificationId: correction.id,
    });
    expect(resubmitted.status).toBe('pending_review');
    expect(
      await localityStore.review({
        actorUserId: firstReviewerId,
        correlationId: randomUUID(),
        decision: 'approve',
        reason: 'approved',
        verificationId: correction.id,
      }),
    ).toMatchObject({ status: 'verified' });

    const rejectedSubmission = await submitVerification(creatorId, 'appeal');
    const rejected = await localityStore.review({
      actorUserId: firstReviewerId,
      correlationId: randomUUID(),
      decision: 'reject',
      reason: 'ineligible_area',
      verificationId: rejectedSubmission.id,
    });
    expect(rejected.appealDeadline).toBeInstanceOf(Date);
    const currentCredential = await pool.query<{ locality_status: string }>(
      `SELECT locality_status FROM creator_profiles WHERE user_id = $1`,
      [creatorId],
    );
    expect(currentCredential.rows[0]?.locality_status).toBe('verified');
    const appealed = await localityStore.appeal({
      actorUserId: creatorId,
      correlationId: randomUUID(),
      reason: 'review_error',
      verificationId: rejected.id,
    });
    expect(appealed.status).toBe('appeal_pending');
    await expect(
      localityStore.decideAppeal({
        actorUserId: firstReviewerId,
        correlationId: randomUUID(),
        decision: 'approve',
        verificationId: rejected.id,
      }),
    ).rejects.toMatchObject({ code: 'LOCALITY_APPEAL_INVALID' });
    const approved = await localityStore.decideAppeal({
      actorUserId: appealReviewerId,
      correlationId: randomUUID(),
      decision: 'approve',
      verificationId: rejected.id,
    });
    expect(approved.status).toBe('verified');
    expect(approved.evidenceDeletionDueAt?.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    const credentialStates = await pool.query<{ status: string }>(
      `SELECT status FROM locality_verifications
        WHERE creator_user_id = $1 ORDER BY created_at`,
      [creatorId],
    );
    expect(credentialStates.rows).toEqual([{ status: 'invalidated' }, { status: 'verified' }]);
  });

  it('sets annual expiry and immediately blocks Community applications after address change', async () => {
    const creatorId = await createCreator('address-change-creator');
    const reviewerId = await createStaff('address-change-reviewer', 'verification_reviewer');
    const approved = await approveVerification(creatorId, reviewerId, 'address-change');
    expect(approved.expiresAt?.getTime()).toBeGreaterThan(Date.now() + 364 * 86_400_000);
    const campaignId = await createPublishedCommunityCampaign();

    await localityStore.declareAddressChange({
      actorUserId: creatorId,
      correlationId: randomUUID(),
    });
    await expect(
      missionStore.applyForCommunityMission({
        campaignId,
        correlationId: randomUUID(),
        creatorUserId: creatorId,
        publicId: `app_locality_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'CREATOR_NOT_QUALIFIED' });
    const profile = await pool.query<{
      locality_expires_at: Date | null;
      locality_status: string;
      verified_postal_area: string | null;
    }>(
      `SELECT locality_status, verified_postal_area, locality_expires_at
         FROM creator_profiles WHERE user_id = $1`,
      [creatorId],
    );
    expect(profile.rows[0]).toEqual({
      locality_expires_at: null,
      locality_status: 'unverified',
      verified_postal_area: null,
    });
  });

  it('expires credentials by database time exactly once', async () => {
    const creatorId = await createCreator('expiry-creator');
    const reviewerId = await createStaff('expiry-reviewer', 'verification_reviewer');
    const approved = await approveVerification(creatorId, reviewerId, 'expiry');
    await pool.query(
      `UPDATE locality_verifications
          SET verified_at = now() - interval '366 days', expires_at = now() - interval '1 day'
        WHERE id = $1`,
      [approved.id],
    );
    await pool.query(
      `UPDATE creator_profiles
          SET locality_verified_at = now() - interval '366 days',
              locality_expires_at = now() - interval '1 day'
        WHERE user_id = $1`,
      [creatorId],
    );
    expect(await localityStore.expireDueCredentials({ correlationId: randomUUID() })).toBe(1);
    expect(await localityStore.expireDueCredentials({ correlationId: randomUUID() })).toBe(0);
    const status = await pool.query<{ locality_status: string }>(
      `SELECT locality_status FROM creator_profiles WHERE user_id = $1`,
      [creatorId],
    );
    expect(status.rows[0]?.locality_status).toBe('expired');
  });

  it('honors a bounded hold, auto-releases on expiry, and permits one deletion worker', async () => {
    const creatorId = await createCreator('deletion-creator');
    const reviewerId = await createStaff('deletion-reviewer', 'verification_reviewer');
    const administratorId = await createStaff('deletion-admin', 'admin');
    const approved = await approveVerification(creatorId, reviewerId, 'deletion');
    await makeDeletionDue(approved.id);
    const holdId = await localityStore.createLegalHold({
      actorUserId: administratorId,
      caseId: `CASE_${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      correlationId: randomUUID(),
      expiresAt: new Date(Date.now() + 2 * 86_400_000),
      publicId: `llh_${randomUUID()}`,
      reason: 'binding_legal_request',
      reviewAt: new Date(Date.now() + 86_400_000),
      verificationId: approved.id,
    });
    expect(await localityStore.claimNextDeletion({ workerId: 'locality-worker-held' })).toBeNull();
    await pool.query(
      `UPDATE locality_legal_holds
          SET created_at = now() - interval '10 days',
              review_at = now() - interval '5 days', expires_at = now() - interval '1 second'
        WHERE id = $1`,
      [holdId],
    );
    const claims = await Promise.all([
      localityStore.claimNextDeletion({ workerId: 'locality-worker-a' }),
      localityStore.claimNextDeletion({ workerId: 'locality-worker-b' }),
    ]);
    const claim = claims.find(Boolean);
    expect(claims.filter(Boolean)).toHaveLength(1);
    if (!claim) throw new Error('Expected one locality deletion claim.');
    expect(claim.evidenceReference).toContain('private/locality/synthetic');
    expect(
      await localityStore.completeDeletionLocally({
        correlationId: randomUUID(),
        jobId: claim.jobId,
        lockToken: claim.lockToken,
      }),
    ).toMatchObject({ status: 'completed' });
    const verification = await pool.query<{
      evidence_deleted_at: Date | null;
      evidence_reference: string | null;
    }>(
      `SELECT evidence_reference, evidence_deleted_at
         FROM locality_verifications WHERE id = $1`,
      [approved.id],
    );
    expect(verification.rows[0]?.evidence_reference).toBeNull();
    expect(verification.rows[0]?.evidence_deleted_at).toBeInstanceOf(Date);
    await expect(
      pool.query(`UPDATE locality_evidence_deletion_attempts SET error_code = 'ALTERED'`),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('uses bounded retries and creates one immutable failure alert without clearing evidence', async () => {
    const creatorId = await createCreator('failure-creator');
    const reviewerId = await createStaff('failure-reviewer', 'verification_reviewer');
    const approved = await approveVerification(creatorId, reviewerId, 'failure');
    await makeDeletionDue(approved.id);
    const claim = await localityStore.claimNextDeletion({ workerId: 'locality-failure-worker' });
    if (!claim) throw new Error('Expected a locality failure claim.');
    expect(
      await localityStore.recordDeletionFailure({
        correlationId: randomUUID(),
        errorCode: 'SYNTHETIC_STORAGE_UNAVAILABLE',
        jobId: claim.jobId,
        lockToken: claim.lockToken,
        retryable: false,
      }),
    ).toMatchObject({ attemptCount: 1, status: 'dead_letter' });
    const state = await pool.query<{
      alert_count: number;
      evidence_reference: string | null;
    }>(
      `SELECT verification.evidence_reference,
              (SELECT count(*)::int FROM locality_retention_alerts
                WHERE locality_evidence_deletion_job_id = job.id) AS alert_count
         FROM locality_evidence_deletion_jobs job
         JOIN locality_verifications verification ON verification.id = job.locality_verification_id
        WHERE job.id = $1`,
      [claim.jobId],
    );
    expect(state.rows[0]?.alert_count).toBe(1);
    expect(state.rows[0]?.evidence_reference).toContain('private/locality/synthetic');
    await expect(
      pool.query(`UPDATE locality_retention_alerts SET attempt_count = 99`),
    ).rejects.toMatchObject({ code: 'P0001' });
  });
});
