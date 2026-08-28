import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { SafeRequestLog } from './api-logging.js';
import { AppModule } from './app.module.js';
import { createApiApplication } from './create-application.js';
import { LocalAppModule } from './local-only/local-app.module.js';

const localDatabaseUrl =
  'postgresql://local_missions:local_missions_local_only@127.0.0.1:5432/local_missions';
const subjectPublicId = 'usr_orlando_synthetic_001';
const tenantPublicId = 'biz_orlando_synthetic_001';
const campaignPublicId = 'cmp_orlando_synthetic_001';
const secondCampaignPublicId = 'cmp_orlando_synthetic_002';
const otherTenantPublicId = 'biz_other_synthetic_001';
const otherCampaignPublicId = 'cmp_other_synthetic_001';

let productionApp: NestFastifyApplication;
let localApp: NestFastifyApplication;
let pool: Pool;
const logs: SafeRequestLog[] = [];

async function issueToken(
  role: 'creator' | 'business_owner',
  tenant = role === 'creator' ? undefined : tenantPublicId,
) {
  const response = await localApp.inject({
    method: 'POST',
    payload: {
      role,
      subjectPublicId,
      ...(tenant ? { tenantPublicId: tenant } : {}),
    },
    url: '/v1/dev/token',
  });
  expect(response.statusCode).toBe(201);
  return response.json<{ accessToken: string }>().accessToken;
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
  await pool.end();
});

describe('authenticated Creator and Business API slice', () => {
  it('keeps deployed verification fail-closed and synthetic verification local-only', async () => {
    const missing = await productionApp.inject({ method: 'GET', url: '/v1/me' });
    const deployed = await productionApp.inject({
      headers: { authorization: 'Bearer structurally.valid.token' },
      method: 'GET',
      url: '/v1/me',
    });
    const token = await issueToken('creator');
    const local = await localApp.inject({
      headers: { authorization: `Bearer ${token}` },
      method: 'GET',
      url: '/v1/me',
    });

    expect(missing.statusCode).toBe(401);
    expect(deployed.statusCode).toBe(503);
    expect(local.statusCode).toBe(200);
    expect(local.json()).toMatchObject({
      business: null,
      creator: { locality: { status: 'verified' }, status: 'approved' },
      role: 'creator',
      userPublicId: subjectPublicId,
    });
    expect(JSON.stringify(logs)).not.toContain(token);
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
