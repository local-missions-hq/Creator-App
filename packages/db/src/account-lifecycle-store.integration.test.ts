import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { migrationsDirectory } from '../scripts/migration-manifest.js';
import { AccountLifecycleStore } from './account-lifecycle-store.js';
import { IdentityTenantStore } from './tenant-store.js';

const databaseName = `local_missions_account_lifecycle_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let accountStore: AccountLifecycleStore;
let tenantStore: IdentityTenantStore;

async function createAccount(label: string) {
  const user = await tenantStore.createUserWithIdentity({
    correlationId: randomUUID(),
    issuer: 'https://identity.local.test/v1',
    provider: 'apple',
    publicId: `usr_${label}_${randomUUID()}`,
    subject: `apple_${label}_${randomUUID()}`,
  });
  const identity = await pool.query<{ id: string }>(
    `SELECT id FROM external_identities WHERE user_id = $1 AND status = 'active'`,
    [user.id],
  );
  const identityId = identity.rows[0]?.id;
  if (!identityId) throw new Error('Synthetic identity is missing.');
  const session = await accountStore.createSession({
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    externalIdentityId: identityId,
    publicId: `ses_${randomUUID()}`,
    userId: user.id,
  });
  return { identityId, sessionId: session.id, user };
}

async function recentGrant(
  account: Awaited<ReturnType<typeof createAccount>>,
  purpose: 'account_deletion' | 'identity_link' | 'identity_unlink',
) {
  return accountStore.grantRecentAuth({
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    publicId: `rag_${randomUUID()}`,
    purpose,
    sessionId: account.sessionId,
    userId: account.user.id,
  });
}

async function linkProvider(
  account: Awaited<ReturnType<typeof createAccount>>,
  provider: 'google' | 'microsoft' | 'passwordless_email',
) {
  return accountStore.linkIdentity({
    correlationId: randomUUID(),
    grantId: await recentGrant(account, 'identity_link'),
    issuer: 'https://identity.local.test/v1',
    provider,
    subject: `${provider}_${randomUUID()}`,
    userId: account.user.id,
  });
}

async function createStaff(label: string) {
  const account = await createAccount(label);
  await pool.query(
    `INSERT INTO platform_staff_memberships (public_id, user_id, role, status)
     VALUES ($1,$2,'trust_safety_reviewer','active')`,
    [`psm_${randomUUID()}`, account.user.id],
  );
  return account;
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 12 });
  await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory });
  accountStore = new AccountLifecycleStore(pool);
  tenantStore = new IdentityTenantStore(pool);
}, 30_000);

afterAll(async () => {
  await pool?.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('account lifecycle against real PostgreSQL', () => {
  it('creates one identity-bound session for retries and rejects public-ID collisions', async () => {
    const account = await createAccount('session_retry');
    const outsider = await createAccount('session_collision');
    const publicId = `ses_${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
    const correlationId = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const attempts = await Promise.all([
      accountStore.createOrReuseSession({
        correlationId,
        expiresAt,
        externalIdentityId: account.identityId,
        publicId,
        userId: account.user.id,
      }),
      accountStore.createOrReuseSession({
        correlationId,
        expiresAt,
        externalIdentityId: account.identityId,
        publicId,
        userId: account.user.id,
      }),
    ]);
    expect(attempts.map((attempt) => attempt.id)).toEqual([attempts[0]!.id, attempts[0]!.id]);
    expect(attempts.filter((attempt) => attempt.created)).toHaveLength(1);
    const proof = await pool.query<{ audit_count: number; session_count: number }>(
      `SELECT
         (SELECT count(*)::int FROM account_sessions WHERE public_id = $1) AS session_count,
         (SELECT count(*)::int FROM audit_events
           WHERE action = 'account.session-created'
             AND details ->> 'sessionPublicId' = $1) AS audit_count`,
      [publicId],
    );
    expect(proof.rows[0]).toEqual({ audit_count: 1, session_count: 1 });
    await expect(
      accountStore.createOrReuseSession({
        correlationId: randomUUID(),
        expiresAt,
        externalIdentityId: outsider.identityId,
        publicId,
        userId: outsider.user.id,
      }),
    ).rejects.toMatchObject({ code: 'SESSION_INVALID' });
  });

  it('migrates privacy-safe lifecycle records and blocks legacy provider linking', async () => {
    const account = await createAccount('schema');
    const outsider = await createAccount('schema_outsider');
    const tables = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN (
          'identity_binding_status_history','account_sessions','recent_auth_grants',
          'account_sensitive_holds','account_sensitive_hold_actions',
          'account_requests','account_request_history'
        )`,
    );
    expect(tables.rows[0]?.count).toBe(7);
    const privateColumns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('external_identities','account_sessions','recent_auth_grants')
          AND column_name ~* '(email|phone|password|access_token|refresh_token)'`,
    );
    expect(privateColumns.rows).toEqual([]);
    await expect(
      accountStore.createSession({
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        externalIdentityId: outsider.identityId,
        publicId: `ses_${randomUUID()}`,
        userId: account.user.id,
      }),
    ).rejects.toThrow(/active same-user identity binding/);
    await expect(
      tenantStore.linkIdentity({
        actorUserId: account.user.id,
        correlationId: randomUUID(),
        issuer: 'https://identity.local.test/v1',
        provider: 'google',
        subject: `legacy_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'IDENTITY_RECENT_AUTH_REQUIRED', httpStatus: 409 });
  });

  it('links only with fresh single-use proof and records history, audit, and security fan-out', async () => {
    const account = await createAccount('link');
    const grantId = await recentGrant(account, 'identity_link');
    const correlationId = randomUUID();
    const linked = await accountStore.linkIdentity({
      correlationId,
      grantId,
      issuer: 'https://identity.local.test/v1',
      provider: 'google',
      subject: `google_${randomUUID()}`,
      userId: account.user.id,
    });
    expect(linked).toMatchObject({ provider: 'google', version: 1 });
    await expect(
      accountStore.linkIdentity({
        correlationId: randomUUID(),
        grantId,
        issuer: 'https://identity.local.test/v1',
        provider: 'microsoft',
        subject: `microsoft_${randomUUID()}`,
        userId: account.user.id,
      }),
    ).rejects.toMatchObject({ code: 'RECENT_AUTH_REQUIRED' });
    const proof = await pool.query<{
      audit_count: number;
      history_count: number;
      inbox_count: number;
      outbox_count: number;
    }>(
      `SELECT
        (SELECT count(*)::int FROM identity_binding_status_history
          WHERE external_identity_id = $1 AND to_status = 'active') AS history_count,
        (SELECT count(*)::int FROM audit_events
          WHERE subject_id = $1 AND correlation_id = $2) AS audit_count,
        (SELECT count(*)::int FROM notification_events event
          JOIN notification_outbox_messages outbox ON outbox.notification_event_id = event.id
          WHERE event.recipient_user_id = $3 AND event.correlation_id = $2) AS outbox_count,
        (SELECT count(*)::int FROM notification_events event
          JOIN in_app_notifications inbox ON inbox.notification_event_id = event.id
          WHERE event.recipient_user_id = $3 AND event.correlation_id = $2) AS inbox_count`,
      [linked.id, correlationId, account.user.id],
    );
    expect(proof.rows[0]).toEqual({
      audit_count: 1,
      history_count: 1,
      inbox_count: 1,
      outbox_count: 1,
    });
  });

  it('rejects the last method and permits exactly one concurrent unlink winner', async () => {
    const single = await createAccount('last_method');
    await expect(
      accountStore.unlinkIdentity({
        correlationId: randomUUID(),
        externalIdentityId: single.identityId,
        grantId: await recentGrant(single, 'identity_unlink'),
        userId: single.user.id,
      }),
    ).rejects.toMatchObject({ code: 'LAST_IDENTITY_METHOD' });

    const account = await createAccount('unlink_race');
    const second = await linkProvider(account, 'google');
    const secondSession = await accountStore.createSession({
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      externalIdentityId: second.id,
      publicId: `ses_${randomUUID()}`,
      userId: account.user.id,
    });
    const firstGrant = await recentGrant(account, 'identity_unlink');
    const secondGrant = await accountStore.grantRecentAuth({
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      publicId: `rag_${randomUUID()}`,
      purpose: 'identity_unlink',
      sessionId: secondSession.id,
      userId: account.user.id,
    });
    const attempts = await Promise.allSettled([
      accountStore.unlinkIdentity({
        correlationId: randomUUID(),
        externalIdentityId: second.id,
        grantId: firstGrant,
        userId: account.user.id,
      }),
      accountStore.unlinkIdentity({
        correlationId: randomUUID(),
        externalIdentityId: account.identityId,
        grantId: secondGrant,
        userId: account.user.id,
      }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    const rejection = attempts.find(
      (attempt): attempt is PromiseRejectedResult => attempt.status === 'rejected',
    );
    expect(['LAST_IDENTITY_METHOD', 'RECENT_AUTH_REQUIRED']).toContain(rejection?.reason.code);
    const active = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM external_identities
        WHERE user_id = $1 AND status = 'active'`,
      [account.user.id],
    );
    expect(active.rows[0]?.count).toBe(1);
  });

  it('revokes only the account owner session and records the logout audit atomically', async () => {
    const account = await createAccount('logout_owner');
    const outsider = await createAccount('logout_outsider');
    await expect(
      accountStore.revokeSession({
        correlationId: randomUUID(),
        sessionId: outsider.sessionId,
        userId: account.user.id,
      }),
    ).rejects.toMatchObject({ code: 'SESSION_INVALID' });

    const correlationId = randomUUID();
    const sessionPublicId = await accountStore.revokeSession({
      correlationId,
      sessionId: account.sessionId,
      userId: account.user.id,
    });
    const result = await pool.query<{
      audit_count: number;
      revocation_reason: string;
      status: string;
    }>(
      `SELECT session.status, session.revocation_reason,
              (SELECT count(*)::int FROM audit_events
                WHERE subject_id = session.id AND correlation_id = $2) AS audit_count
         FROM account_sessions session WHERE session.id = $1`,
      [account.sessionId, correlationId],
    );
    expect(sessionPublicId).toMatch(/^ses_/);
    expect(result.rows[0]).toEqual({
      audit_count: 1,
      revocation_reason: 'USER_LOGOUT',
      status: 'revoked',
    });
    await expect(
      accountStore.revokeSession({
        correlationId: randomUUID(),
        sessionId: account.sessionId,
        userId: account.user.id,
      }),
    ).rejects.toMatchObject({ code: 'SESSION_INVALID' });
  });

  it('enforces dual-controlled recovery holds before sensitive identity changes', async () => {
    const account = await createAccount('hold_target');
    const staffOne = await createStaff('hold_staff_one');
    const staffTwo = await createStaff('hold_staff_two');
    const holdId = await accountStore.placeRecoveryHold({
      correlationId: randomUUID(),
      placedByUserId: staffOne.user.id,
      publicId: `hold_${randomUUID()}`,
      userId: account.user.id,
    });
    await expect(linkProvider(account, 'google')).rejects.toMatchObject({
      code: 'ACCOUNT_HOLD_ACTIVE',
    });
    await expect(
      accountStore.releaseRecoveryHold({
        correlationId: randomUUID(),
        expectedVersion: 1,
        holdId,
        reason: 'Synthetic recovery review complete',
        releasedByUserId: staffOne.user.id,
      }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_ACCESS_DENIED' });
    await accountStore.releaseRecoveryHold({
      correlationId: randomUUID(),
      expectedVersion: 1,
      holdId,
      reason: 'Synthetic recovery review complete',
      releasedByUserId: staffTwo.user.id,
    });
    await expect(linkProvider(account, 'google')).resolves.toMatchObject({ provider: 'google' });
  });

  it('records export/deletion requests and requires recent auth plus no recovery hold', async () => {
    const account = await createAccount('requests');
    const exportPublicId = `arq_${randomUUID()}`;
    const exportId = await accountStore.requestAccountAction({
      correlationId: randomUUID(),
      publicId: exportPublicId,
      sessionId: account.sessionId,
      type: 'export',
      userId: account.user.id,
    });
    expect(exportId).toMatch(/[0-9a-f-]{36}/);
    const otherAccount = await createAccount('request_public_id_conflict');
    await expect(
      accountStore.requestAccountAction({
        correlationId: randomUUID(),
        publicId: exportPublicId,
        sessionId: otherAccount.sessionId,
        type: 'export',
        userId: otherAccount.user.id,
      }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_REQUEST_CONFLICT' });
    await expect(
      accountStore.requestAccountAction({
        correlationId: randomUUID(),
        publicId: `arq_${randomUUID()}`,
        sessionId: account.sessionId,
        type: 'export',
        userId: account.user.id,
      }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_REQUEST_CONFLICT' });
    await expect(
      accountStore.requestAccountAction({
        correlationId: randomUUID(),
        publicId: `arq_${randomUUID()}`,
        sessionId: account.sessionId,
        type: 'deletion',
        userId: account.user.id,
      }),
    ).rejects.toMatchObject({ code: 'RECENT_AUTH_REQUIRED' });
    const deletionId = await accountStore.requestAccountAction({
      correlationId: randomUUID(),
      grantId: await recentGrant(account, 'account_deletion'),
      publicId: `arq_${randomUUID()}`,
      sessionId: account.sessionId,
      type: 'deletion',
      userId: account.user.id,
    });
    const proof = await pool.query<{
      history_count: number;
      status: string;
    }>(
      `SELECT users.status,
        (SELECT count(*)::int FROM account_request_history WHERE account_request_id = $2)
          AS history_count
       FROM users WHERE users.id = $1`,
      [account.user.id, deletionId],
    );
    expect(proof.rows[0]).toEqual({ history_count: 1, status: 'deletion_requested' });
    await expect(
      pool.query(`DELETE FROM identity_binding_status_history WHERE external_identity_id = $1`, [
        account.identityId,
      ]),
    ).rejects.toThrow(/history is immutable/);
  });
});
