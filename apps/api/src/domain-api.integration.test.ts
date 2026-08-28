import { randomUUID } from 'node:crypto';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ApiProblem } from './api-errors.js';
import type { ContextualRequest } from './api-context.js';
import type { SafeRequestLog } from './api-logging.js';
import { AppModule } from './app.module.js';
import {
  AuthenticationService,
  type BearerVerifier,
  type VerifiedExternalBearerIdentity,
} from './authentication.js';
import { createApiApplication } from './create-application.js';
import { DatabaseService } from './database.service.js';
import { DomainApiService } from './domain-api.service.js';
import { LocalAppModule } from './local-only/local-app.module.js';
import { UnavailableProviderControlProofVerifier } from './provider-control-proof.js';

const localDatabaseUrl =
  'postgresql://local_missions:local_missions_local_only@127.0.0.1:5432/local_missions';
const subjectPublicId = 'usr_orlando_synthetic_001';
const tenantPublicId = 'biz_orlando_synthetic_001';
const campaignPublicId = 'cmp_orlando_synthetic_001';
const secondCampaignPublicId = 'cmp_orlando_synthetic_002';
const otherTenantPublicId = 'biz_other_synthetic_001';
const otherCampaignPublicId = 'cmp_other_synthetic_001';
const accountSessionPublicId = 'ses_api_synthetic_0001';
const decoyUserPublicId = 'usr_account_decoy_synthetic_001';
const bootstrapSessionPublicId = `ses_${'b'.repeat(64)}`;

let productionApp: NestFastifyApplication;
let localApp: NestFastifyApplication;
let pool: Pool;
let externalDatabase: DatabaseService;
let externalDomain: DomainApiService;
const logs: SafeRequestLog[] = [];
const externalEvidenceByToken = new Map<string, VerifiedExternalBearerIdentity>();

class SyntheticExternalVerifier implements BearerVerifier {
  async verify(token: string) {
    const evidence = externalEvidenceByToken.get(token);
    if (!evidence) {
      throw new ApiProblem('AUTHENTICATION_REQUIRED', 'Authentication is required.', 401);
    }
    return evidence;
  }
}

function externalRequest(input: {
  businessPublicId?: string;
  role?: string;
  sessionPublicId?: string | null;
  token: string;
}): ContextualRequest {
  return {
    headers: {
      authorization: `Bearer ${input.token}`,
      ...(input.sessionPublicId === null
        ? {}
        : { 'x-local-missions-session': input.sessionPublicId ?? accountSessionPublicId }),
      ...(input.businessPublicId ? { 'x-local-missions-business': input.businessPublicId } : {}),
      ...(input.role ? { 'x-local-missions-role': input.role } : {}),
    },
  } as unknown as ContextualRequest;
}

async function issueToken(
  role: 'creator' | 'business_owner',
  tenant = role === 'creator' ? undefined : tenantPublicId,
  subject = subjectPublicId,
) {
  const response = await localApp.inject({
    method: 'POST',
    payload: {
      role,
      subjectPublicId: subject,
      ...(tenant ? { tenantPublicId: tenant } : {}),
    },
    url: '/v1/dev/token',
  });
  expect(response.statusCode).toBe(201);
  return response.json<{ accessToken: string }>().accessToken;
}

async function createSyntheticAccountFixture(label: string) {
  const suffix = randomUUID().replaceAll('-', '');
  const userPublicId = `usr_${label}_synthetic_${suffix}`;
  const sessionPublicId = `ses_${label}_synthetic_${suffix}`;
  const user = await pool.query<{ id: string }>(
    `INSERT INTO users (public_id) VALUES ($1) RETURNING id`,
    [userPublicId],
  );
  const userId = user.rows[0]?.id;
  if (!userId) throw new Error('Synthetic account user insert returned no row.');
  const identity = await pool.query<{ id: string }>(
    `INSERT INTO external_identities (user_id, provider, issuer, subject, verified_at)
     VALUES ($1,'apple','https://identity.local.test/apple',$2,now()) RETURNING id`,
    [userId, `synthetic-apple-${suffix}`],
  );
  const identityId = identity.rows[0]?.id;
  if (!identityId) throw new Error('Synthetic account identity insert returned no row.');
  await pool.query(
    `INSERT INTO creator_profiles (
       user_id, public_id, status, locality_status, verified_postal_area,
       locality_verified_at, locality_expires_at
     ) VALUES ($1,$2,'approved','verified','32801',now(),now() + interval '1 year')`,
    [userId, `cr_${label}_synthetic_${suffix}`],
  );
  const session = await pool.query<{ id: string }>(
    `INSERT INTO account_sessions (public_id, user_id, external_identity_id, expires_at)
     VALUES ($1,$2,$3,now() + interval '30 days') RETURNING id`,
    [sessionPublicId, userId, identityId],
  );
  const sessionId = session.rows[0]?.id;
  if (!sessionId) throw new Error('Synthetic account session insert returned no row.');
  return { sessionId, sessionPublicId, userId, userPublicId };
}

async function createRecentAuthGrant(
  account: Awaited<ReturnType<typeof createSyntheticAccountFixture>>,
  purpose: 'account_deletion' | 'identity_link' | 'identity_unlink',
) {
  const publicId = `rag_api_synthetic_${randomUUID().replaceAll('-', '')}`;
  await pool.query(
    `INSERT INTO recent_auth_grants (
       public_id, user_id, account_session_id, purpose, expires_at
     ) VALUES ($1,$2,$3,$4,now() + interval '5 minutes')`,
    [publicId, account.userId, account.sessionId, purpose],
  );
  return publicId;
}

async function cleanApplicationFixture() {
  const application = await pool.query<{ id: string }>(
    `SELECT id FROM mission_applications
      WHERE public_id IN ('app_api_synthetic_0001', 'app_api_synthetic_0002')`,
  );
  const ids = application.rows.map((row) => row.id);
  if (ids.length > 0) {
    await pool.query(`DELETE FROM slot_reservations WHERE application_id = ANY($1::uuid[])`, [ids]);
    await pool.query(
      `DELETE FROM mission_application_status_history WHERE application_id = ANY($1::uuid[])`,
      [ids],
    );
    await pool.query(`DELETE FROM audit_events WHERE subject_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM mission_applications WHERE id = ANY($1::uuid[])`, [ids]);
  }
  await pool.query(
    `UPDATE mission_slots SET status = 'available'
      WHERE campaign_id = (SELECT id FROM campaigns WHERE public_id = $1)
        AND type = 'community'`,
    [campaignPublicId],
  );
  await pool.query(
    `DELETE FROM idempotency_records
      WHERE operation = 'mission-application.apply'
        AND idempotency_key LIKE 'api-domain-test-%'`,
  );
}

beforeAll(async () => {
  process.env.APP_ENV = 'local';
  process.env.DATABASE_URL = localDatabaseUrl;
  pool = new Pool({ connectionString: localDatabaseUrl });
  externalEvidenceByToken.set('external.known.token', {
    issuer: 'https://identity.local.test/v1',
    subject: 'synthetic-provider-subject-001',
  });
  externalEvidenceByToken.set('external.unknown.token', {
    issuer: 'https://identity.local.test/v1',
    subject: 'synthetic-provider-subject-unknown-001',
  });
  externalEvidenceByToken.set('external.revoked.token', {
    issuer: 'https://identity.local.test/v1',
    subject: 'synthetic-provider-subject-revoked-001',
  });
  externalEvidenceByToken.set('external.decoy.token', {
    issuer: 'https://identity.local.test/decoy',
    subject: 'synthetic-provider-subject-decoy-001',
  });
  await pool.query(
    `INSERT INTO external_identities (
       user_id, provider, issuer, subject, verified_at, status, revoked_at
     ) VALUES (
       '10000000-0000-4000-8000-000000000001', 'microsoft',
       'https://identity.local.test/v1', 'synthetic-provider-subject-revoked-001',
       now(), 'revoked', now()
     ) ON CONFLICT (issuer, subject) DO NOTHING`,
  );
  externalDatabase = new DatabaseService();
  externalDomain = new DomainApiService(
    new AuthenticationService(new SyntheticExternalVerifier()),
    externalDatabase,
    new UnavailableProviderControlProofVerifier(),
  );
  const business = await pool.query<{ id: string }>(
    `SELECT id FROM businesses WHERE public_id = $1`,
    [tenantPublicId],
  );
  const businessId = business.rows[0]?.id;
  if (!businessId) throw new Error('Run the deterministic synthetic seed before API integration.');
  await pool.query(
    `INSERT INTO campaigns (
       public_id, business_id, title, status, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count, created_at
     ) VALUES ($1, $2, 'Second Synthetic Campaign', 'draft', 5000, 750, 5750, 'USD', 1,
               now() - interval '1 hour')
     ON CONFLICT (public_id) DO NOTHING`,
    [secondCampaignPublicId, businessId],
  );
  const otherBusiness = await pool.query<{ id: string }>(
    `INSERT INTO businesses (public_id, name)
     VALUES ($1, 'Other Synthetic Business')
     ON CONFLICT (public_id) DO UPDATE SET name = excluded.name
     RETURNING id`,
    [otherTenantPublicId],
  );
  await pool.query(
    `INSERT INTO campaigns (
       public_id, business_id, title, status, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES ($1, $2, 'Other Tenant Campaign', 'draft', 5000, 750, 5750, 'USD', 1)
     ON CONFLICT (public_id) DO NOTHING`,
    [otherCampaignPublicId, otherBusiness.rows[0]!.id],
  );
  await pool.query(
    `INSERT INTO users (public_id)
     VALUES ($1) ON CONFLICT (public_id) DO NOTHING`,
    [decoyUserPublicId],
  );
  await pool.query(
    `INSERT INTO external_identities (user_id, provider, issuer, subject, verified_at)
     SELECT id, 'microsoft', 'https://identity.local.test/decoy',
            'synthetic-provider-subject-decoy-001', now()
       FROM users WHERE public_id = $1
     ON CONFLICT (issuer, subject) DO NOTHING`,
    [decoyUserPublicId],
  );
  await pool.query(
    `INSERT INTO creator_profiles (user_id, public_id, status, locality_status)
     SELECT id, 'cr_account_decoy_synthetic_001', 'approved', 'unverified'
       FROM users WHERE public_id = $1
     ON CONFLICT (user_id) DO NOTHING`,
    [decoyUserPublicId],
  );
  await pool.query(`UPDATE campaigns SET status = 'published' WHERE public_id = $1`, [
    campaignPublicId,
  ]);
  productionApp = (await createApiApplication(AppModule, { logSink: (entry) => logs.push(entry) }))
    .app;
  localApp = (await createApiApplication(LocalAppModule, { logSink: (entry) => logs.push(entry) }))
    .app;
});

beforeEach(async () => {
  logs.length = 0;
  await cleanApplicationFixture();
  await pool.query(`DELETE FROM account_sessions WHERE public_id = $1`, [accountSessionPublicId]);
  await pool.query(`DELETE FROM account_sessions WHERE public_id = $1`, [bootstrapSessionPublicId]);
  await pool.query(
    `UPDATE users SET status = 'active'
      WHERE public_id = $1`,
    [subjectPublicId],
  );
  await pool.query(
    `INSERT INTO account_sessions (
       public_id, user_id, external_identity_id, expires_at
     ) SELECT $1, identity.user_id, identity.id, now() + interval '30 days'
         FROM external_identities identity
         JOIN users account_user ON account_user.id = identity.user_id
        WHERE account_user.public_id = $2 AND identity.provider = 'apple'
          AND identity.status = 'active'`,
    [accountSessionPublicId, subjectPublicId],
  );
  await pool.query(
    `UPDATE creator_profiles
        SET status = 'approved', locality_status = 'verified',
            locality_verified_at = now() - interval '1 day',
            locality_expires_at = now() + interval '1 year'
      WHERE user_id = (SELECT id FROM users WHERE public_id = $1)`,
    [subjectPublicId],
  );
});

afterAll(async () => {
  await cleanApplicationFixture();
  await pool.query(`DELETE FROM account_sessions WHERE public_id = $1`, [accountSessionPublicId]);
  await pool.query(`DELETE FROM account_sessions WHERE public_id = $1`, [bootstrapSessionPublicId]);
  await pool.query(`UPDATE users SET status = 'active' WHERE public_id = $1`, [subjectPublicId]);
  await pool.query(`UPDATE campaigns SET status = 'draft' WHERE public_id = $1`, [
    campaignPublicId,
  ]);
  await pool.query(`DELETE FROM campaigns WHERE public_id IN ($1, $2)`, [
    secondCampaignPublicId,
    otherCampaignPublicId,
  ]);
  await pool.query(`DELETE FROM businesses WHERE public_id = $1`, [otherTenantPublicId]);
  await localApp.close();
  await productionApp.close();
  await externalDatabase.onModuleDestroy();
  await pool.end();
});

describe('authenticated Creator and Business API slice', () => {
  it('bootstraps one safe session idempotently and reprojects current Creator and Business access', async () => {
    const request = externalRequest({ sessionPublicId: null, token: 'external.known.token' });
    const firstCorrelationId = randomUUID();
    const first = await externalDomain.bootstrapExternalSession(
      request,
      bootstrapSessionPublicId,
      firstCorrelationId,
    );
    const retried = await externalDomain.bootstrapExternalSession(
      request,
      bootstrapSessionPublicId,
      randomUUID(),
    );
    expect(retried).toEqual(first);
    expect(first).toMatchObject({
      accountStatus: 'active',
      provider: 'apple',
      roles: ['creator', 'business_owner'],
      sessionPublicId: bootstrapSessionPublicId,
      userPublicId: subjectPublicId,
      workspaces: [{ publicId: tenantPublicId, role: 'owner' }],
    });
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain('subject');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('address');
    const proof = await pool.query<{ audit_count: number; session_count: number }>(
      `SELECT
         (SELECT count(*)::int FROM account_sessions WHERE public_id = $1) AS session_count,
         (SELECT count(*)::int FROM audit_events
           WHERE action = 'account.session-created'
             AND details ->> 'sessionPublicId' = $1
             AND correlation_id = $2) AS audit_count`,
      [bootstrapSessionPublicId, firstCorrelationId],
    );
    expect(proof.rows[0]).toEqual({ audit_count: 1, session_count: 1 });
  });

  it('rejects session collisions and requires the same active identity-bound session later', async () => {
    const known = externalRequest({ sessionPublicId: null, token: 'external.known.token' });
    await externalDomain.bootstrapExternalSession(known, bootstrapSessionPublicId, randomUUID());
    await expect(
      externalDomain.bootstrapExternalSession(
        externalRequest({ sessionPublicId: null, token: 'external.decoy.token' }),
        bootstrapSessionPublicId,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ apiCode: 'ACCESS_DENIED', status: 403 });
    await expect(
      externalDomain.authenticate(
        externalRequest({ role: 'creator', sessionPublicId: null, token: 'external.known.token' }),
      ),
    ).rejects.toMatchObject({ apiCode: 'AUTHENTICATION_REQUIRED', status: 401 });
    await expect(
      externalDomain.authenticate(
        externalRequest({
          role: 'creator',
          sessionPublicId: bootstrapSessionPublicId,
          token: 'external.decoy.token',
        }),
      ),
    ).rejects.toMatchObject({ apiCode: 'AUTHENTICATION_REQUIRED', status: 401 });
  });

  it('maps one external issuer/subject to current Creator and Business contexts without trusting a token role', async () => {
    const creator = await externalDomain.authenticate(
      externalRequest({ role: 'creator', token: 'external.known.token' }),
    );
    const business = await externalDomain.authenticate(
      externalRequest({
        businessPublicId: tenantPublicId,
        role: 'business_owner',
        token: 'external.known.token',
      }),
    );

    expect(creator.context).toMatchObject({
      business: null,
      creator: { profilePublicId: 'cr_orlando_synthetic_001' },
      role: 'creator',
      userPublicId: subjectPublicId,
    });
    expect(business.context).toMatchObject({
      business: { membershipRole: 'owner', publicId: tenantPublicId },
      creator: null,
      role: 'business_owner',
      userPublicId: subjectPublicId,
    });
  });

  it.each([
    ['missing role', { token: 'external.known.token' }],
    ['invented role', { role: 'admin', token: 'external.known.token' }],
    [
      'Creator with Business context',
      { businessPublicId: tenantPublicId, role: 'creator', token: 'external.known.token' },
    ],
    ['Business without workspace', { role: 'business_owner', token: 'external.known.token' }],
    [
      'cross-tenant workspace',
      {
        businessPublicId: otherTenantPublicId,
        role: 'business_owner',
        token: 'external.known.token',
      },
    ],
    [
      'invented membership role',
      {
        businessPublicId: tenantPublicId,
        role: 'business_manager',
        token: 'external.known.token',
      },
    ],
  ])('denies untrusted external context: %s', async (_label, input) => {
    await expect(externalDomain.authenticate(externalRequest(input))).rejects.toMatchObject({
      apiCode: 'ACCESS_DENIED',
      status: 403,
    });
  });

  it('conceals unknown and revoked external subjects behind the same authentication response', async () => {
    for (const token of ['external.unknown.token', 'external.revoked.token']) {
      await expect(
        externalDomain.authenticate(externalRequest({ role: 'creator', token })),
      ).rejects.toMatchObject({ apiCode: 'AUTHENTICATION_REQUIRED', status: 401 });
    }
  });

  it('rechecks account and membership state for every request made with the same external token', async () => {
    const creatorRequest = externalRequest({ role: 'creator', token: 'external.known.token' });
    const businessRequest = externalRequest({
      businessPublicId: tenantPublicId,
      role: 'business_owner',
      token: 'external.known.token',
    });
    await expect(externalDomain.authenticate(creatorRequest)).resolves.toBeTruthy();
    await pool.query(`UPDATE users SET status = 'disabled' WHERE public_id = $1`, [
      subjectPublicId,
    ]);
    await expect(externalDomain.authenticate(creatorRequest)).rejects.toMatchObject({
      apiCode: 'ACCESS_DENIED',
      status: 403,
    });
    await expect(
      externalDomain.bootstrapExternalSession(
        externalRequest({ sessionPublicId: null, token: 'external.known.token' }),
        `ses_${'d'.repeat(64)}`,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ apiCode: 'ACCESS_DENIED', status: 403 });
    await pool.query(`UPDATE users SET status = 'active' WHERE public_id = $1`, [subjectPublicId]);

    await expect(externalDomain.authenticate(businessRequest)).resolves.toBeTruthy();
    await pool.query(
      `UPDATE business_memberships SET status = 'disabled'
        WHERE user_id = (SELECT id FROM users WHERE public_id = $1)
          AND business_id = (SELECT id FROM businesses WHERE public_id = $2)`,
      [subjectPublicId, tenantPublicId],
    );
    await expect(externalDomain.authenticate(businessRequest)).rejects.toMatchObject({
      apiCode: 'ACCESS_DENIED',
      status: 403,
    });
    await expect(
      externalDomain.refreshExternalSession(
        externalRequest({ sessionPublicId: null, token: 'external.known.token' }),
        accountSessionPublicId,
      ),
    ).resolves.toMatchObject({ roles: ['creator'], workspaces: [] });
    await pool.query(
      `UPDATE business_memberships SET status = 'active'
        WHERE user_id = (SELECT id FROM users WHERE public_id = $1)
          AND business_id = (SELECT id FROM businesses WHERE public_id = $2)`,
      [subjectPublicId, tenantPublicId],
    );
  });

  it('invalidates the same provider token immediately after Local Missions logout', async () => {
    const request = externalRequest({ role: 'creator', token: 'external.known.token' });
    const principal = await externalDomain.authenticate(request);
    await externalDomain.revokeAccountSession(principal, accountSessionPublicId, randomUUID());
    await expect(externalDomain.authenticate(request)).rejects.toMatchObject({
      apiCode: 'AUTHENTICATION_REQUIRED',
      status: 401,
    });
    await expect(
      externalDomain.refreshExternalSession(
        externalRequest({ sessionPublicId: null, token: 'external.known.token' }),
        accountSessionPublicId,
      ),
    ).rejects.toMatchObject({ apiCode: 'AUTHENTICATION_REQUIRED', status: 401 });
  });

  it('rejects an expired Local Missions session even while the provider token remains valid', async () => {
    const request = externalRequest({ role: 'creator', token: 'external.known.token' });
    await expect(externalDomain.authenticate(request)).resolves.toBeTruthy();
    await pool.query(
      `UPDATE account_sessions
          SET status = 'expired', revoked_at = now(), revocation_reason = 'SESSION_EXPIRED',
              version = version + 1, updated_at = now()
        WHERE public_id = $1`,
      [accountSessionPublicId],
    );
    await expect(externalDomain.authenticate(request)).rejects.toMatchObject({
      apiCode: 'AUTHENTICATION_REQUIRED',
      status: 401,
    });
    await expect(
      externalDomain.refreshExternalSession(
        externalRequest({ sessionPublicId: null, token: 'external.known.token' }),
        accountSessionPublicId,
      ),
    ).rejects.toMatchObject({ apiCode: 'AUTHENTICATION_REQUIRED', status: 401 });
  });

  it('stops accepting the same external token immediately after its identity binding is revoked', async () => {
    const suffix = randomUUID().replaceAll('-', '');
    const publicId = `usr_external_revoke_synthetic_${suffix}`;
    const creatorPublicId = `cr_external_revoke_synthetic_${suffix}`;
    const issuer = 'https://identity.local.test/revocation';
    const subject = `synthetic-provider-subject-${suffix}`;
    const token = `external.${suffix}.token`;
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (public_id) VALUES ($1) RETURNING id`,
      [publicId],
    );
    await pool.query(
      `INSERT INTO external_identities (user_id, provider, issuer, subject, verified_at)
       VALUES ($1,'google',$2,$3,now())`,
      [user.rows[0]!.id, issuer, subject],
    );
    await pool.query(
      `INSERT INTO creator_profiles (
         user_id, public_id, status, locality_status, verified_postal_area,
         locality_verified_at, locality_expires_at
       ) VALUES ($1,$2,'approved','verified','32801',now(),now() + interval '1 year')`,
      [user.rows[0]!.id, creatorPublicId],
    );
    externalEvidenceByToken.set(token, { issuer, subject });
    const sessionPublicId = `ses_${suffix}${suffix}`;
    await externalDomain.bootstrapExternalSession(
      externalRequest({ sessionPublicId: null, token }),
      sessionPublicId,
      randomUUID(),
    );
    const request = externalRequest({ role: 'creator', sessionPublicId, token });
    await expect(externalDomain.authenticate(request)).resolves.toBeTruthy();
    await pool.query(
      `UPDATE external_identities
          SET status = 'revoked', revoked_at = now(), version = version + 1, updated_at = now()
        WHERE issuer = $1 AND subject = $2`,
      [issuer, subject],
    );
    await expect(externalDomain.authenticate(request)).rejects.toMatchObject({
      apiCode: 'AUTHENTICATION_REQUIRED',
      status: 401,
    });
  });

  it('keeps deployed verification fail-closed and synthetic verification local-only', async () => {
    const deployedToken = 'structurally.valid.token';
    const privateWorkspaceMarker = 'biz_private_log_marker_0001';
    const privateSessionMarker = `ses_${'c'.repeat(64)}`;
    const missing = await productionApp.inject({ method: 'GET', url: '/v1/me' });
    const deployed = await productionApp.inject({
      headers: {
        authorization: `Bearer ${deployedToken}`,
        'x-local-missions-business': privateWorkspaceMarker,
        'x-local-missions-role': 'business_owner',
      },
      method: 'GET',
      url: '/v1/me',
    });
    const deployedBootstrap = await productionApp.inject({
      headers: { authorization: `Bearer ${deployedToken}` },
      method: 'POST',
      payload: { sessionPublicId: privateSessionMarker },
      url: '/v1/session/bootstrap',
    });
    const token = await issueToken('creator');
    const local = await localApp.inject({
      headers: { authorization: `Bearer ${token}` },
      method: 'GET',
      url: '/v1/me',
    });

    expect(missing.statusCode).toBe(401);
    expect(deployed.statusCode).toBe(503);
    expect(deployedBootstrap.statusCode).toBe(503);
    expect(local.statusCode).toBe(200);
    expect(local.json()).toMatchObject({
      business: null,
      creator: { locality: { status: 'verified' }, status: 'approved' },
      role: 'creator',
      userPublicId: subjectPublicId,
    });
    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain(token);
    expect(serializedLogs).not.toContain(deployedToken);
    expect(serializedLogs).not.toContain(privateWorkspaceMarker);
    expect(serializedLogs).not.toContain(privateSessionMarker);
    expect(serializedLogs).not.toContain('x-local-missions-role');
  });

  it('resolves a current Business workspace and denies invented tenant membership', async () => {
    const ownerToken = await issueToken('business_owner');
    const otherTenantToken = await issueToken('business_owner', otherTenantPublicId);
    const owner = await localApp.inject({
      headers: { authorization: `Bearer ${ownerToken}` },
      method: 'GET',
      url: '/v1/me',
    });
    const denied = await localApp.inject({
      headers: { authorization: `Bearer ${otherTenantToken}` },
      method: 'GET',
      url: '/v1/me',
    });

    expect(owner.statusCode).toBe(200);
    expect(owner.json()).toMatchObject({
      business: { membershipRole: 'owner', publicId: tenantPublicId },
      creator: null,
      role: 'business_owner',
    });
    expect(denied.statusCode).toBe(403);
  });

  it('returns only safe account-owned identity and active-session metadata', async () => {
    const token = await issueToken('creator');
    const response = await localApp.inject({
      headers: { authorization: `Bearer ${token}` },
      method: 'GET',
      url: '/v1/account',
    });
    const body = response.json();
    const serialized = response.body;

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      identities: [{ provider: 'apple', status: 'active' }],
      role: 'creator',
      sensitiveHoldActive: false,
      sessions: [{ provider: 'apple', publicId: accountSessionPublicId, status: 'active' }],
      status: 'active',
      userPublicId: subjectPublicId,
    });
    expect(body.identities).toHaveLength(1);
    expect(serialized).not.toContain('microsoft');
    expect(serialized).not.toContain('issuer');
    expect(serialized).not.toContain('subject');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('street');
  });

  it('links and unlinks only through recent auth plus one-time local provider control', async () => {
    const account = await createSyntheticAccountFixture('api_identity');
    const token = await issueToken('creator', undefined, account.userPublicId);
    const proofResponse = await localApp.inject({
      headers: { authorization: `Bearer ${token}` },
      method: 'POST',
      payload: { provider: 'google' },
      url: '/v1/dev/provider-proof',
    });
    const proofToken = proofResponse.json<{ proofToken: string }>().proofToken;
    const link = await localApp.inject({
      headers: { authorization: `Bearer ${token}` },
      method: 'POST',
      payload: {
        providerProofToken: proofToken,
        recentAuthGrantPublicId: await createRecentAuthGrant(account, 'identity_link'),
      },
      url: '/v1/account/identities',
    });
    const replay = await localApp.inject({
      headers: { authorization: `Bearer ${token}` },
      method: 'POST',
      payload: {
        providerProofToken: proofToken,
        recentAuthGrantPublicId: await createRecentAuthGrant(account, 'identity_link'),
      },
      url: '/v1/account/identities',
    });
    const unlink = await localApp.inject({
      headers: { authorization: `Bearer ${token}` },
      method: 'DELETE',
      payload: {
        recentAuthGrantPublicId: await createRecentAuthGrant(account, 'identity_unlink'),
      },
      url: '/v1/account/identities/google',
    });
    const lastMethod = await localApp.inject({
      headers: { authorization: `Bearer ${token}` },
      method: 'DELETE',
      payload: {
        recentAuthGrantPublicId: await createRecentAuthGrant(account, 'identity_unlink'),
      },
      url: '/v1/account/identities/apple',
    });

    expect(proofResponse.statusCode).toBe(201);
    expect(link.statusCode).toBe(201);
    expect(link.json()).toEqual({ provider: 'google', status: 'active' });
    expect(replay.statusCode).toBe(409);
    expect(unlink.statusCode).toBe(200);
    expect(unlink.json()).toEqual({ provider: 'google', status: 'revoked' });
    expect(lastMethod.statusCode).toBe(409);
    expect(lastMethod.json().error.message).toMatch(/another sign-in method/);
    expect(JSON.stringify(logs)).not.toContain(proofToken);
  });

  it('revokes only own sessions and accepts export/deletion requests with the right proof', async () => {
    const logoutAccount = await createSyntheticAccountFixture('api_logout');
    const requestAccount = await createSyntheticAccountFixture('api_requests');
    const rootToken = await issueToken('creator');
    const logoutToken = await issueToken('creator', undefined, logoutAccount.userPublicId);
    const requestToken = await issueToken('creator', undefined, requestAccount.userPublicId);

    const crossAccountLogout = await localApp.inject({
      headers: { authorization: `Bearer ${rootToken}` },
      method: 'POST',
      payload: { sessionPublicId: logoutAccount.sessionPublicId },
      url: '/v1/account/logout',
    });
    const logout = await localApp.inject({
      headers: { authorization: `Bearer ${logoutToken}` },
      method: 'POST',
      payload: { sessionPublicId: logoutAccount.sessionPublicId },
      url: '/v1/account/logout',
    });
    const exportRequest = await localApp.inject({
      headers: { authorization: `Bearer ${requestToken}` },
      method: 'POST',
      payload: {
        publicId: `acr_export_synthetic_${randomUUID().replaceAll('-', '')}`,
        sessionPublicId: requestAccount.sessionPublicId,
        type: 'export',
      },
      url: '/v1/account/requests',
    });
    const deletionWithoutProof = await localApp.inject({
      headers: { authorization: `Bearer ${requestToken}` },
      method: 'POST',
      payload: {
        publicId: `acr_deletion_synthetic_${randomUUID().replaceAll('-', '')}`,
        sessionPublicId: requestAccount.sessionPublicId,
        type: 'deletion',
      },
      url: '/v1/account/requests',
    });
    const deletionRequest = await localApp.inject({
      headers: { authorization: `Bearer ${requestToken}` },
      method: 'POST',
      payload: {
        publicId: `acr_deletion_synthetic_${randomUUID().replaceAll('-', '')}`,
        recentAuthGrantPublicId: await createRecentAuthGrant(requestAccount, 'account_deletion'),
        sessionPublicId: requestAccount.sessionPublicId,
        type: 'deletion',
      },
      url: '/v1/account/requests',
    });
    const afterDeletion = await localApp.inject({
      headers: { authorization: `Bearer ${requestToken}` },
      method: 'GET',
      url: '/v1/account',
    });

    expect(crossAccountLogout.statusCode).toBe(403);
    expect(logout.statusCode).toBe(200);
    expect(logout.json()).toEqual({
      sessionPublicId: logoutAccount.sessionPublicId,
      status: 'revoked',
    });
    expect(exportRequest.statusCode).toBe(201);
    expect(exportRequest.json()).toMatchObject({ status: 'requested', type: 'export' });
    expect(deletionWithoutProof.statusCode).toBe(400);
    expect(deletionRequest.statusCode).toBe(201);
    expect(deletionRequest.json()).toMatchObject({ status: 'requested', type: 'deletion' });
    expect(afterDeletion.statusCode).toBe(403);
  });

  it('rejects disabled and deletion-requested users at the bearer boundary', async () => {
    const token = await issueToken('creator');
    for (const status of ['disabled', 'deletion_requested'] as const) {
      await pool.query(`UPDATE users SET status = $1 WHERE public_id = $2`, [
        status,
        subjectPublicId,
      ]);
      const response = await localApp.inject({
        headers: { authorization: `Bearer ${token}` },
        method: 'GET',
        url: '/v1/account',
      });
      expect(response.statusCode).toBe(403);
    }
  });

  it('enforces role separation and hides cross-tenant campaign reads', async () => {
    const creatorToken = await issueToken('creator');
    const ownerToken = await issueToken('business_owner');
    const creatorOnBusiness = await localApp.inject({
      headers: { authorization: `Bearer ${creatorToken}` },
      method: 'GET',
      url: '/v1/business/campaigns',
    });
    const businessOnCreator = await localApp.inject({
      headers: { authorization: `Bearer ${ownerToken}` },
      method: 'GET',
      url: '/v1/creator/missions',
    });
    const crossTenant = await localApp.inject({
      headers: { authorization: `Bearer ${ownerToken}` },
      method: 'GET',
      url: `/v1/business/campaigns/${otherCampaignPublicId}`,
    });

    expect(creatorOnBusiness.statusCode).toBe(403);
    expect(businessOnCreator.statusCode).toBe(403);
    expect(crossTenant.statusCode).toBe(404);
  });

  it('returns Creator feed/detail and stable Business cursor pages', async () => {
    const creatorToken = await issueToken('creator');
    const ownerToken = await issueToken('business_owner');
    const feed = await localApp.inject({
      headers: { authorization: `Bearer ${creatorToken}` },
      method: 'GET',
      url: '/v1/creator/missions?limit=1',
    });
    const detail = await localApp.inject({
      headers: { authorization: `Bearer ${creatorToken}` },
      method: 'GET',
      url: `/v1/creator/missions/${campaignPublicId}`,
    });
    const first = await localApp.inject({
      headers: { authorization: `Bearer ${ownerToken}` },
      method: 'GET',
      url: '/v1/business/campaigns?limit=1',
    });
    const firstBody = first.json<{ page: { nextCursor: string } }>();
    const second = await localApp.inject({
      headers: { authorization: `Bearer ${ownerToken}` },
      method: 'GET',
      url: `/v1/business/campaigns?limit=1&cursor=${firstBody.page.nextCursor}`,
    });

    expect(feed.statusCode).toBe(200);
    expect(feed.json()).toMatchObject({
      data: [{ availableCommunitySlots: 10, baseRewardMinor: 5_000, publicId: campaignPublicId }],
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({
      publicId: campaignPublicId,
      requirements: [
        { requiredCount: 5, type: 'photo' },
        { requiredCount: 2, type: 'raw_clip' },
      ],
    });
    expect(first.statusCode).toBe(200);
    expect(firstBody.page.nextCursor).toBeTruthy();
    expect(second.statusCode).toBe(200);
    expect(second.json().data).toHaveLength(1);
  });

  it('requires current locality and replays the same application retry exactly once', async () => {
    const token = await issueToken('creator');
    await pool.query(
      `UPDATE creator_profiles SET locality_expires_at = now() - interval '1 minute'
        WHERE user_id = (SELECT id FROM users WHERE public_id = $1)`,
      [subjectPublicId],
    );
    const expired = await localApp.inject({
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': 'api-domain-test-expired-0001',
      },
      method: 'POST',
      payload: { publicId: 'app_api_synthetic_0001' },
      url: `/v1/creator/missions/${campaignPublicId}/applications`,
    });
    expect(expired.statusCode).toBe(403);

    await pool.query(
      `UPDATE creator_profiles SET locality_expires_at = now() + interval '1 year'
        WHERE user_id = (SELECT id FROM users WHERE public_id = $1)`,
      [subjectPublicId],
    );
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': 'api-domain-test-apply-000001',
      },
      method: 'POST' as const,
      payload: { publicId: 'app_api_synthetic_0001' },
      url: `/v1/creator/missions/${campaignPublicId}/applications`,
    };
    const first = await localApp.inject(request);
    const retry = await localApp.inject(request);
    const reused = await localApp.inject({
      ...request,
      payload: { publicId: 'app_api_synthetic_0002' },
    });
    const count = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM mission_applications
        WHERE public_id = 'app_api_synthetic_0001'`,
    );

    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(201);
    expect(retry.json()).toEqual(first.json());
    expect(reused.statusCode).toBe(409);
    expect(count.rows[0]?.count).toBe('1');
  });

  it('returns Creator-owned Reach state and records then revokes per-platform consent', async () => {
    const creatorToken = await issueToken('creator');
    const ownerToken = await issueToken('business_owner');
    const initial = await localApp.inject({
      headers: { authorization: `Bearer ${creatorToken}` },
      method: 'GET',
      url: '/v1/creator/reach',
    });
    const denied = await localApp.inject({
      headers: { authorization: `Bearer ${ownerToken}` },
      method: 'POST',
      url: '/v1/creator/reach/instagram/consent',
    });
    const granted = await localApp.inject({
      headers: { authorization: `Bearer ${creatorToken}` },
      method: 'POST',
      url: '/v1/creator/reach/instagram/consent',
    });
    const revoked = await localApp.inject({
      headers: { authorization: `Bearer ${creatorToken}` },
      method: 'DELETE',
      url: '/v1/creator/reach/instagram/consent',
    });

    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toMatchObject({ communityAccessIndependent: true });
    expect(initial.json().platforms).toHaveLength(3);
    expect(initial.json().platforms.map((item: { platform: string }) => item.platform)).toEqual([
      'instagram',
      'tiktok',
      'youtube',
    ]);
    expect(
      initial
        .json()
        .platforms.every(
          (item: { capabilityStatus: string; connectionAvailable: boolean }) =>
            item.capabilityStatus === 'disabled' && !item.connectionAvailable,
        ),
    ).toBe(true);
    expect(denied.statusCode).toBe(403);
    expect(granted.statusCode).toBe(200);
    expect(granted.json().platforms[0]).toMatchObject({ consentStatus: 'active' });
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json().platforms[0]).toMatchObject({ consentStatus: 'revoked' });
  });

  it('gives Business members only fixed Reach packages and capability availability', async () => {
    const ownerToken = await issueToken('business_owner');
    const creatorToken = await issueToken('creator');
    const response = await localApp.inject({
      headers: { authorization: `Bearer ${ownerToken}` },
      method: 'GET',
      url: '/v1/business/reach-options',
    });
    const denied = await localApp.inject({
      headers: { authorization: `Bearer ${creatorToken}` },
      method: 'GET',
      url: '/v1/business/reach-options',
    });
    const serialized = response.body;

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      communityMinimumPercent: 80,
      packages: [
        { creatorRewardMultiplierBps: 15_000, level: 'level_1' },
        { creatorRewardMultiplierBps: 20_000, level: 'level_2' },
        { creatorRewardMultiplierBps: 30_000, level: 'level_3' },
      ],
      rawAudienceFiltersAllowed: false,
    });
    expect(response.json().platforms).toEqual([
      { bookingAvailable: false, capabilityStatus: 'disabled', platform: 'instagram' },
      { bookingAvailable: false, capabilityStatus: 'disabled', platform: 'tiktok' },
      { bookingAvailable: false, capabilityStatus: 'disabled', platform: 'youtube' },
    ]);
    expect(serialized).not.toContain('estimatedLocalAudienceCount');
    expect(serialized).not.toContain('evidenceReference');
    expect(serialized).not.toContain('providerConnectionReference');
    expect(denied.statusCode).toBe(403);
  });
});
