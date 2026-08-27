import { Pool } from 'pg';

import { initialSchemaTables } from '../src/schema.js';
import { getLocalDatabaseUrl } from './local-database.js';

const pool = new Pool({ connectionString: getLocalDatabaseUrl() });

try {
  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name`,
    [initialSchemaTables],
  );
  const actual = result.rows.map((row) => row.table_name);
  const expected = [...initialSchemaTables].sort();

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Database schema mismatch. Expected ${expected.join(', ')}, found ${actual.join(', ')}.`,
    );
  }

  const campaign = await pool.query<{
    creator_reward_pool_minor: number;
    platform_fee_minor: number;
    public_id: string;
    slot_count: number;
    status: string;
    total_due_minor: number;
  }>(
    `SELECT public_id, status, creator_reward_pool_minor, platform_fee_minor, total_due_minor, slot_count
       FROM campaigns
      WHERE public_id = 'cmp_orlando_synthetic_001'`,
  );
  const row = campaign.rows[0];
  if (
    !row ||
    row.status !== 'draft' ||
    row.creator_reward_pool_minor !== 50_000 ||
    row.platform_fee_minor !== 7_500 ||
    row.total_due_minor !== 57_500 ||
    row.slot_count !== 10
  ) {
    throw new Error('Deterministic synthetic campaign seed is missing or incorrect.');
  }

  process.stdout.write(
    `Database check passed for ${actual.length} tables and the synthetic campaign.\n`,
  );
} finally {
  await pool.end();
}
