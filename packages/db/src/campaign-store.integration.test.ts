import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { CampaignStore } from './campaign-store.js';
import { IdentityTenantStore } from './tenant-store.js';

const migrationPaths = [
  fileURLToPath(new URL('../drizzle/0000_giant_snowbird.sql', import.meta.url)),
  fileURLToPath(new URL('../drizzle/0001_empty_tyrannus.sql', import.meta.url)),
];
const databaseName = `local_missions_m3_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let store: CampaignStore;
let tenantStore: IdentityTenantStore;

async function createCampaign(overrides: { idempotencyKey?: string; publicId?: string } = {}) {
  const { actorId, businessId } = await createOwnerBusiness();
  const campaign = await store.createDraftCampaign({
    actorId,
    businessId,
    correlationId: randomUUID(),
    creatorRewardPoolMinor: 50_000,
    currency: 'USD',
    idempotencyKey: overrides.idempotencyKey ?? `create_${randomUUID()}`,
    platformFeeMinor: 7_500,
    publicId: overrides.publicId ?? `cmp_${randomUUID()}`,
    slotCount: 10,
    title: 'Family Adventure Preview',
    totalDueMinor: 57_500,
  });
  return { actorId, campaign };
}

async function createOwnerBusiness() {
  const owner = await tenantStore.createUserWithIdentity({
    correlationId: randomUUID(),
    issuer: 'https://identity.local.test/v1',
    provider: 'apple',
    publicId: `usr_${randomUUID()}`,
    subject: `subject_${randomUUID()}`,
  });
  const businessId = await tenantStore.createBusinessWithOwner({
    correlationId: randomUUID(),
    name: 'Lakeview Discovery Center',
    ownerUserId: owner.id,
    publicId: `biz_${randomUUID()}`,
  });
  return { actorId: owner.id, businessId };
}

async function countRows(table: string, campaignId?: string): Promise<number> {
  if (!/^[a-z_]+$/.test(table)) throw new Error('Unsafe table name in test.');
  const result = campaignId
    ? await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${table} WHERE campaign_id = $1`,
        [campaignId],
      )
    : await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function countCampaignAudits(campaignId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM audit_events
      WHERE subject_type = 'campaign' AND subject_id = $1`,
    [campaignId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 8 });
  for (const migrationPath of migrationPaths) {
    const migration = await readFile(migrationPath, 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) {
      if (statement.trim()) await pool.query(statement);
    }
  }
  store = new CampaignStore(pool);
  tenantStore = new IdentityTenantStore(pool);
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
  await adminPool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [databaseName],
  );
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('CampaignStore against real PostgreSQL', () => {
  it('applies the empty-database migration with money and capacity constraints', async () => {
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (
         'businesses', 'campaigns', 'campaign_status_history', 'audit_events', 'idempotency_records'
       ) ORDER BY table_name`,
    );
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'audit_events',
      'businesses',
      'campaign_status_history',
      'campaigns',
      'idempotency_records',
    ]);

    const { actorId, businessId } = await createOwnerBusiness();
    await expect(
      store.createDraftCampaign({
        actorId,
        businessId,
        correlationId: randomUUID(),
        creatorRewardPoolMinor: 50_000,
        currency: 'USD',
        idempotencyKey: 'invalid-total',
        platformFeeMinor: 7_500,
        publicId: 'cmp_invalid_total',
        slotCount: 10,
        title: 'Invalid total',
        totalDueMinor: 57_499,
      }),
    ).rejects.toMatchObject({ code: '23514' });
    expect(await countRows('campaigns')).toBe(0);
    expect(await countRows('idempotency_records')).toBe(0);
  });

  it('returns the original result for a repeated idempotency key and rejects changed input', async () => {
    const { actorId, businessId } = await createOwnerBusiness();
    const input = {
      actorId,
      businessId,
      correlationId: randomUUID(),
      creatorRewardPoolMinor: 50_000,
      currency: 'USD',
      idempotencyKey: 'same-create-key',
      platformFeeMinor: 7_500,
      publicId: 'cmp_idempotent',
      slotCount: 10,
      title: 'Idempotent campaign',
      totalDueMinor: 57_500,
    } as const;

    const created = await store.createDraftCampaign(input);
    const replayed = await store.createDraftCampaign({ ...input, correlationId: randomUUID() });
    expect(replayed).toEqual(created);
    expect(await countRows('campaigns')).toBe(1);
    expect(await countRows('campaign_status_history', created.id)).toBe(1);
    expect(await countCampaignAudits(created.id)).toBe(1);
    expect(await countRows('idempotency_records')).toBe(1);

    await expect(store.createDraftCampaign({ ...input, slotCount: 9 })).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSE',
    });
  });

  it('commits the legal publish path and rolls illegal transitions back completely', async () => {
    const created = await createCampaign();
    const { actorId } = created;
    let { campaign } = created;
    const states = ['submitted', 'approved', 'funded', 'published'] as const;
    for (const [index, toStatus] of states.entries()) {
      const transition = {
        actorId,
        campaignId: campaign.id,
        correlationId: randomUUID(),
        expectedVersion: campaign.version,
        idempotencyKey: `transition_${index}`,
        toStatus,
      } as const;
      campaign = await store.transitionCampaign(transition);
      if (toStatus === 'submitted') {
        const replayed = await store.transitionCampaign({
          ...transition,
          correlationId: randomUUID(),
        });
        expect(replayed).toEqual(campaign);
      }
    }

    expect(campaign).toMatchObject({ status: 'published', version: 5 });
    expect(await countRows('campaign_status_history', campaign.id)).toBe(5);
    expect(await countCampaignAudits(campaign.id)).toBe(5);

    await expect(
      store.transitionCampaign({
        actorId,
        campaignId: campaign.id,
        correlationId: randomUUID(),
        expectedVersion: campaign.version,
        idempotencyKey: 'illegal-published-to-funded',
        toStatus: 'funded',
      }),
    ).rejects.toMatchObject({
      code: 'CAMPAIGN_TRANSITION_CONFLICT',
    });
    expect(await store.getCampaign(campaign.id, actorId)).toMatchObject({
      status: 'published',
      version: 5,
    });
    expect(await countRows('campaign_status_history', campaign.id)).toBe(5);
    expect(await countCampaignAudits(campaign.id)).toBe(5);
    expect(await countRows('idempotency_records')).toBe(5);
  });

  it('allows only one writer to win an optimistic-concurrency race', async () => {
    const { actorId, campaign } = await createCampaign();
    const attempts = await Promise.allSettled(
      ['writer_a', 'writer_b'].map((idempotencyKey) =>
        store.transitionCampaign({
          actorId,
          campaignId: campaign.id,
          correlationId: randomUUID(),
          expectedVersion: 1,
          idempotencyKey,
          toStatus: 'submitted',
        }),
      ),
    );

    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    const rejected = attempts.find((attempt) => attempt.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: expect.objectContaining({ code: 'CAMPAIGN_VERSION_CONFLICT' }),
      status: 'rejected',
    });
    expect(await store.getCampaign(campaign.id, actorId)).toMatchObject({
      status: 'submitted',
      version: 2,
    });
    expect(await countRows('campaign_status_history', campaign.id)).toBe(2);
    expect(await countCampaignAudits(campaign.id)).toBe(2);
    expect(await countRows('idempotency_records')).toBe(2);
  });
});
