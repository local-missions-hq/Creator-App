import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { CampaignStore } from './campaign-store.js';
import { IdentityTenantStore } from './tenant-store.js';

const migration0000 = fileURLToPath(new URL('../drizzle/0000_giant_snowbird.sql', import.meta.url));
const migration0001 = fileURLToPath(new URL('../drizzle/0001_empty_tyrannus.sql', import.meta.url));
const databaseName = `local_missions_tenant_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let tenantStore: IdentityTenantStore;
let campaignStore: CampaignStore;
let upgradeProof: { businessName: string; campaignTitle: string; totalDueMinor: number };

async function applyMigration(path: string): Promise<void> {
  const migration = await readFile(path, 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) {
    if (statement.trim()) await pool.query(statement);
  }
}

async function createUser(label: string, subject = `subject_${randomUUID()}`) {
  return tenantStore.createUserWithIdentity({
    correlationId: randomUUID(),
    issuer: 'https://identity.local.test/v1',
    provider: 'apple',
    publicId: `usr_${label}_${randomUUID()}`,
    subject,
  });
}

async function countRows(table: string): Promise<number> {
  if (!/^[a-z_]+$/.test(table)) throw new Error('Unsafe table name in test.');
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${table}`,
  );
  return Number(result.rows[0]?.count ?? 0);
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 8 });

  await applyMigration(migration0000);
  const baselineBusinessId = '40000000-0000-4000-8000-000000000001';
  await pool.query(
    `INSERT INTO businesses (id, public_id, name)
     VALUES ($1, 'biz_before_upgrade', 'Pre-upgrade Synthetic Business')`,
    [baselineBusinessId],
  );
  await pool.query(
    `INSERT INTO campaigns (
       id, public_id, business_id, title, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES (
       '50000000-0000-4000-8000-000000000001', 'cmp_before_upgrade', $1,
       'Pre-upgrade Campaign', 50000, 7500, 57500, 'USD', 10
     )`,
    [baselineBusinessId],
  );

  await applyMigration(migration0001);
  const preserved = await pool.query<{
    business_name: string;
    campaign_title: string;
    total_due_minor: number;
  }>(
    `SELECT b.name AS business_name, c.title AS campaign_title, c.total_due_minor
       FROM businesses b
       JOIN campaigns c ON c.business_id = b.id
      WHERE c.public_id = 'cmp_before_upgrade'`,
  );
  const row = preserved.rows[0];
  if (!row) throw new Error('Forward migration did not preserve the baseline campaign.');
  upgradeProof = {
    businessName: row.business_name,
    campaignTitle: row.campaign_title,
    totalDueMinor: row.total_due_minor,
  };

  tenantStore = new IdentityTenantStore(pool);
  campaignStore = new CampaignStore(pool);
}, 30_000);

beforeEach(async () => {
  await pool.query(
    `TRUNCATE idempotency_records, audit_events, campaign_status_history, campaigns,
              business_locations, business_memberships, creator_profiles, external_identities,
              businesses, users CASCADE`,
  );
});

afterAll(async () => {
  if (pool) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('shared identity and tenant boundaries against real PostgreSQL', () => {
  it('preserves the existing campaign through the forward migration', async () => {
    expect(upgradeProof).toEqual({
      businessName: 'Pre-upgrade Synthetic Business',
      campaignTitle: 'Pre-upgrade Campaign',
      totalDueMinor: 57_500,
    });

    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (
         'users', 'external_identities', 'creator_profiles', 'businesses',
         'business_memberships', 'business_locations', 'campaigns',
         'campaign_status_history', 'audit_events', 'idempotency_records'
       ) ORDER BY table_name`,
    );
    expect(tables.rows).toHaveLength(10);

    const emailColumns = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('users', 'external_identities')
         AND column_name ILIKE '%email%'`,
    );
    expect(emailColumns.rows).toEqual([]);
  });

  it('allows only one root user to bind a provider issuer and subject', async () => {
    const subject = 'one-provider-subject';
    const attempts = await Promise.allSettled([
      createUser('first', subject),
      createUser('second', subject),
    ]);

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'IDENTITY_ALREADY_BOUND', httpStatus: 409 }),
      status: 'rejected',
    });
    expect(await countRows('users')).toBe(1);
    expect(await countRows('external_identities')).toBe(1);
    expect(await countRows('audit_events')).toBe(1);
  });

  it('requires a different provider when linking another identity to one user', async () => {
    const user = await createUser('linked');
    await tenantStore.linkIdentity({
      actorUserId: user.id,
      correlationId: randomUUID(),
      issuer: 'https://identity.local.test/v1',
      provider: 'google',
      subject: 'google-subject-1',
    });
    await expect(
      tenantStore.linkIdentity({
        actorUserId: user.id,
        correlationId: randomUUID(),
        issuer: 'https://identity.local.test/v1',
        provider: 'google',
        subject: 'google-subject-2',
      }),
    ).rejects.toMatchObject({
      code: 'USER_IDENTITY_PROVIDER_ALREADY_LINKED',
      httpStatus: 409,
    });
    expect(await countRows('external_identities')).toBe(2);
    expect(await countRows('audit_events')).toBe(2);
  });

  it('stores a private annual locality credential without identity email or street data', async () => {
    const user = await createUser('creator');
    const verifiedAt = new Date('2026-08-27T12:00:00.000Z');
    const expiresAt = new Date('2027-08-27T12:00:00.000Z');
    const profile = await tenantStore.createCreatorProfile({
      correlationId: randomUUID(),
      localityExpiresAt: expiresAt,
      localityStatus: 'verified',
      localityVerifiedAt: verifiedAt,
      publicId: 'cr_orlando_synthetic_001',
      userId: user.id,
      verifiedPostalArea: '32801',
    });
    expect(profile).toMatchObject({
      localityStatus: 'verified',
      payoutOnboardingStatus: 'not_started',
      verifiedPostalArea: '32801',
    });

    const secondUser = await createUser('creator-invalid');
    await expect(
      tenantStore.createCreatorProfile({
        correlationId: randomUUID(),
        localityStatus: 'verified',
        publicId: 'cr_invalid_locality',
        userId: secondUser.id,
        verifiedPostalArea: '32801',
      }),
    ).rejects.toMatchObject({ code: '23514' });
    expect(await countRows('creator_profiles')).toBe(1);
  });

  it('prevents one business owner from reading or creating inside another workspace', async () => {
    const ownerA = await createUser('owner-a');
    const ownerB = await createUser('owner-b');
    const businessA = await tenantStore.createBusinessWithOwner({
      correlationId: randomUUID(),
      name: 'Synthetic Business A',
      ownerUserId: ownerA.id,
      publicId: 'biz_tenant_a',
    });
    const businessB = await tenantStore.createBusinessWithOwner({
      correlationId: randomUUID(),
      name: 'Synthetic Business B',
      ownerUserId: ownerB.id,
      publicId: 'biz_tenant_b',
    });

    const locationB = await tenantStore.createBusinessLocation({
      actorUserId: ownerB.id,
      addressLine1: '100 Synthetic Way',
      businessId: businessB,
      city: 'Orlando',
      correlationId: randomUUID(),
      name: 'Synthetic Orlando Venue',
      postalCode: '32801',
      publicId: 'loc_tenant_b',
      region: 'FL',
      timezone: 'America/New_York',
    });
    expect(locationB.businessId).toBe(businessB);

    const campaignB = await campaignStore.createDraftCampaign({
      actorId: ownerB.id,
      businessId: businessB,
      correlationId: randomUUID(),
      creatorRewardPoolMinor: 50_000,
      currency: 'USD',
      idempotencyKey: 'tenant-b-campaign',
      platformFeeMinor: 7_500,
      publicId: 'cmp_tenant_b',
      slotCount: 10,
      title: 'Tenant B Campaign',
      totalDueMinor: 57_500,
    });

    await expect(
      tenantStore.listBusinessLocations({ actorUserId: ownerA.id, businessId: businessB }),
    ).rejects.toMatchObject({ code: 'BUSINESS_ACCESS_DENIED', httpStatus: 403 });
    await expect(
      tenantStore.createBusinessLocation({
        actorUserId: ownerA.id,
        addressLine1: '200 Unauthorized Way',
        businessId: businessB,
        city: 'Orlando',
        correlationId: randomUUID(),
        name: 'Unauthorized Venue',
        postalCode: '32801',
        publicId: 'loc_unauthorized',
        region: 'FL',
        timezone: 'America/New_York',
      }),
    ).rejects.toMatchObject({ code: 'BUSINESS_ACCESS_DENIED', httpStatus: 403 });
    await expect(
      tenantStore.getCampaignForMember({
        actorUserId: ownerA.id,
        campaignId: campaignB.id,
      }),
    ).rejects.toMatchObject({ code: 'BUSINESS_ACCESS_DENIED', httpStatus: 403 });
    await expect(
      campaignStore.createDraftCampaign({
        actorId: ownerA.id,
        businessId: businessB,
        correlationId: randomUUID(),
        creatorRewardPoolMinor: 50_000,
        currency: 'USD',
        idempotencyKey: 'tenant-b-campaign',
        platformFeeMinor: 7_500,
        publicId: 'cmp_tenant_b',
        slotCount: 10,
        title: 'Tenant B Campaign',
        totalDueMinor: 57_500,
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_ACCESS_DENIED', httpStatus: 403 });
    await expect(
      campaignStore.transitionCampaign({
        actorId: ownerA.id,
        campaignId: campaignB.id,
        correlationId: randomUUID(),
        expectedVersion: 1,
        idempotencyKey: 'unauthorized-transition',
        toStatus: 'submitted',
      }),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_ACCESS_DENIED', httpStatus: 403 });
    await expect(campaignStore.getCampaign(campaignB.id, ownerA.id)).rejects.toMatchObject({
      code: 'CAMPAIGN_ACCESS_DENIED',
      httpStatus: 403,
    });

    expect(
      await tenantStore.listBusinessLocations({ actorUserId: ownerB.id, businessId: businessB }),
    ).toHaveLength(1);
    expect(
      await tenantStore.getCampaignForMember({
        actorUserId: ownerB.id,
        campaignId: campaignB.id,
      }),
    ).toMatchObject({ id: campaignB.id, businessId: businessB });
    expect(await campaignStore.getCampaign(campaignB.id, ownerB.id)).toMatchObject({
      id: campaignB.id,
      businessId: businessB,
    });
    expect(await countRows('business_locations')).toBe(1);
    expect(businessA).not.toBe(businessB);
  });
});
