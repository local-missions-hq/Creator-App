import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles, type MigrationMeta } from 'drizzle-orm/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { createMigrationManifest, migrationsDirectory } from '../scripts/migration-manifest.js';
import { initialSchemaTables } from './schema.js';

const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let migrations: MigrationMeta[];

async function withTemporaryDatabase(
  label: string,
  operation: (pool: Pool) => Promise<void>,
): Promise<void> {
  const databaseName = `local_missions_${label}_${randomUUID().replaceAll('-', '')}`;
  const databaseUrl = new URL(baseUrl);
  databaseUrl.pathname = `/${databaseName}`;
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  const pool = new Pool({ connectionString: databaseUrl.toString(), max: 5 });
  try {
    await operation(pool);
  } finally {
    await pool.end();
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  }
}

async function prepareTrackingTable(pool: Pool): Promise<void> {
  await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function applyTrackedMigrations(pool: Pool, count: number, start = 0): Promise<void> {
  await prepareTrackingTable(pool);
  for (const migration of migrations.slice(start, count)) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const statement of migration.sql) await client.query(statement);
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [migration.hash, migration.folderMillis],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

async function tableNames(pool: Pool): Promise<string[]> {
  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  return result.rows.map((row) => row.table_name);
}

async function trackedMigrations(pool: Pool) {
  const result = await pool.query<{ created_at: string; hash: string }>(
    `SELECT created_at::text, hash
       FROM drizzle.__drizzle_migrations
      ORDER BY created_at`,
  );
  return result.rows;
}

async function insertNMinusOneFixture(pool: Pool): Promise<void> {
  await pool.query(`
    INSERT INTO users (id, public_id)
    VALUES ('10000000-0000-4000-8000-000000000091', 'usr_synthetic_recovery_001')
  `);
  await pool.query(`
    INSERT INTO creator_profiles (
      user_id, public_id, status, locality_status, verified_postal_area,
      locality_verified_at, locality_expires_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000091', 'cr_synthetic_recovery_001',
      'approved', 'verified', '32801', '2026-08-01T12:00:00Z', '2027-08-01T12:00:00Z'
    )
  `);
  await pool.query(`
    INSERT INTO businesses (id, public_id, name)
    VALUES (
      '20000000-0000-4000-8000-000000000091',
      'biz_synthetic_recovery_001',
      'Synthetic Recovery Business'
    )
  `);
  await pool.query(`
    INSERT INTO business_memberships (id, business_id, user_id, role, status)
    VALUES (
      '30000000-0000-4000-8000-000000000091',
      '20000000-0000-4000-8000-000000000091',
      '10000000-0000-4000-8000-000000000091',
      'owner',
      'active'
    )
  `);
  await pool.query(`
    INSERT INTO campaigns (
      id, public_id, business_id, title, status, creator_reward_pool_minor,
      platform_fee_minor, total_due_minor, currency, slot_count
    ) VALUES (
      '40000000-0000-4000-8000-000000000091',
      'cmp_synthetic_recovery_001',
      '20000000-0000-4000-8000-000000000091',
      'Synthetic Recovery Campaign',
      'draft', 50000, 7500, 57500, 'USD', 10
    )
  `);
  await pool.query(`
    INSERT INTO campaign_status_history (
      campaign_id, from_status, to_status, campaign_version, actor_id, reason
    ) VALUES (
      '40000000-0000-4000-8000-000000000091',
      NULL, 'draft', 1, '10000000-0000-4000-8000-000000000091', 'synthetic recovery fixture'
    )
  `);
  await pool.query(`
    INSERT INTO audit_events (
      actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
    ) VALUES (
      '10000000-0000-4000-8000-000000000091',
      'user', 'campaign.created', '50000000-0000-4000-8000-000000000091',
      'campaign', '40000000-0000-4000-8000-000000000091', '{"synthetic":true}'::jsonb
    )
  `);
  await pool.query(`
    INSERT INTO notification_preferences (
      id, public_id, user_id, category, channel, enabled, version
    ) VALUES (
      '60000000-0000-4000-8000-000000000091',
      'np_synthetic_recovery_001',
      '10000000-0000-4000-8000-000000000091',
      'mission_reminder', 'push', false, 1
    )
  `);
}

async function expectFixtureIntact(pool: Pool): Promise<void> {
  const result = await pool.query<{
    audit_count: number;
    campaign_count: number;
    history_count: number;
    preference_count: number;
    user_count: number;
  }>(`
    SELECT
      (SELECT count(*)::int FROM users WHERE public_id = 'usr_synthetic_recovery_001') AS user_count,
      (SELECT count(*)::int FROM campaigns WHERE public_id = 'cmp_synthetic_recovery_001'
        AND creator_reward_pool_minor = 50000 AND platform_fee_minor = 7500
        AND total_due_minor = 57500) AS campaign_count,
      (SELECT count(*)::int FROM campaign_status_history
        WHERE campaign_id = '40000000-0000-4000-8000-000000000091') AS history_count,
      (SELECT count(*)::int FROM audit_events
        WHERE correlation_id = '50000000-0000-4000-8000-000000000091') AS audit_count,
      (SELECT count(*)::int FROM notification_preferences
        WHERE public_id = 'np_synthetic_recovery_001' AND enabled = false AND version = 1)
        AS preference_count
  `);
  expect(result.rows[0]).toEqual({
    audit_count: 1,
    campaign_count: 1,
    history_count: 1,
    preference_count: 1,
    user_count: 1,
  });
}

beforeAll(() => {
  migrations = readMigrationFiles({ migrationsFolder: migrationsDirectory });
});

afterAll(async () => {
  await adminPool.end();
});

describe.sequential('latest schema and roll-forward recovery', () => {
  it('applies every manifested migration atomically to a truly empty PostgreSQL database', async () => {
    await withTemporaryDatabase('empty', async (pool) => {
      await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory });
      const manifest = await createMigrationManifest();
      const tracked = await trackedMigrations(pool);

      expect(await tableNames(pool)).toEqual([...initialSchemaTables].sort());
      expect(tracked).toEqual(
        manifest.entries.map((entry) => ({
          created_at: String(entry.journalTimestamp),
          hash: entry.sqlSha256,
        })),
      );
      expect(tracked).toHaveLength(migrations.length);
    });
  }, 30_000);

  it('rolls an injected N-1 migration failure back, then recovers forward without data loss', async () => {
    await withTemporaryDatabase('recovery', async (pool) => {
      await applyTrackedMigrations(pool, migrations.length - 1);
      await insertNMinusOneFixture(pool);
      await expectFixtureIntact(pool);
      expect(await trackedMigrations(pool)).toHaveLength(migrations.length - 1);

      const latest = migrations.at(-1);
      if (!latest) throw new Error('Latest migration is missing.');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const statement of latest.sql) await client.query(statement);
        await expect(
          client.query('SELECT local_missions_injected_migration_failure()'),
        ).rejects.toMatchObject({ code: '42883' });
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }

      expect(await trackedMigrations(pool)).toHaveLength(migrations.length - 1);
      expect(
        await pool.query(`SELECT to_regclass('public.account_sessions') AS relation`),
      ).toMatchObject({ rows: [{ relation: null }] });
      await expectFixtureIntact(pool);

      await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory });
      expect(await trackedMigrations(pool)).toHaveLength(migrations.length);
      await expectFixtureIntact(pool);
      const claimEdgeSchema = await pool.query<{
        challenges: string;
        incident_history: string;
        incidents: string;
      }>(`
        SELECT
          to_regclass('public.local_pass_customer_challenges')::text AS challenges,
          to_regclass('public.local_pass_fulfillment_incidents')::text AS incidents,
          to_regclass('public.local_pass_fulfillment_incident_history')::text AS incident_history
      `);
      expect(claimEdgeSchema.rows[0]).toEqual({
        challenges: 'local_pass_customer_challenges',
        incident_history: 'local_pass_fulfillment_incident_history',
        incidents: 'local_pass_fulfillment_incidents',
      });
      expect(
        await pool.query(`SELECT to_regclass('public.content_license_renewals') AS relation`),
      ).toMatchObject({ rows: [{ relation: 'content_license_renewals' }] });
      expect(
        await pool.query(`SELECT to_regclass('public.reach_platform_capabilities') AS relation`),
      ).toMatchObject({ rows: [{ relation: 'reach_platform_capabilities' }] });
      expect(
        await pool.query(`SELECT to_regclass('public.venue_contacts') AS relation`),
      ).toMatchObject({ rows: [{ relation: 'venue_contacts' }] });
      expect(
        await pool.query(`SELECT to_regclass('public.account_sessions') AS relation`),
      ).toMatchObject({ rows: [{ relation: 'account_sessions' }] });

      await pool.query(`
        UPDATE notification_preferences
           SET enabled = true, version = 2, updated_at = now()
         WHERE id = '60000000-0000-4000-8000-000000000091'
      `);
      const history = await pool.query<{ preference_version: number }>(`
        SELECT preference_version
          FROM notification_preference_history
         WHERE notification_preference_id = '60000000-0000-4000-8000-000000000091'
         ORDER BY preference_version
      `);
      expect(history.rows).toEqual([{ preference_version: 1 }, { preference_version: 2 }]);
    });
  }, 30_000);
});
