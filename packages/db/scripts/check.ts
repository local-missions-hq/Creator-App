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

  const identityBoundary = await pool.query<{
    creator_status: string;
    locality_status: string;
    membership_role: string;
    membership_status: string;
    provider: string;
  }>(
    `SELECT ei.provider, cp.status AS creator_status, cp.locality_status,
            bm.role AS membership_role, bm.status AS membership_status
       FROM users u
       JOIN external_identities ei ON ei.user_id = u.id
       JOIN creator_profiles cp ON cp.user_id = u.id
       JOIN business_memberships bm ON bm.user_id = u.id
      WHERE u.public_id = 'usr_orlando_synthetic_001'`,
  );
  expectOneSyntheticIdentity(identityBoundary.rows[0]);

  const location = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM business_locations
      WHERE public_id = 'loc_orlando_synthetic_001'
        AND city = 'Orlando'
        AND region = 'FL'
        AND postal_code = '32801'
        AND is_active = true`,
  );
  if (location.rows[0]?.count !== '1') {
    throw new Error('Deterministic synthetic business location is missing or incorrect.');
  }

  const contract = await pool.query<{
    brief_count: number;
    community_count: number;
    deliverable_count: number;
    reward_total: number;
    slot_count: number;
    template_count: number;
  }>(
    `SELECT
       (SELECT count(*)::int FROM mission_templates) AS template_count,
       (SELECT count(*)::int FROM campaign_brief_versions b WHERE b.campaign_id = c.id) AS brief_count,
       (SELECT count(*)::int
          FROM deliverable_requirements dr
          JOIN campaign_brief_versions b ON b.id = dr.campaign_brief_version_id
         WHERE b.campaign_id = c.id) AS deliverable_count,
       count(s.id)::int AS slot_count,
       count(s.id) FILTER (WHERE s.type = 'community')::int AS community_count,
       coalesce(sum(s.reward_minor), 0)::int AS reward_total
     FROM campaigns c
     LEFT JOIN mission_slots s ON s.campaign_id = c.id
     WHERE c.public_id = 'cmp_orlando_synthetic_001'
     GROUP BY c.id`,
  );
  const contractRow = contract.rows[0];
  if (
    !contractRow ||
    contractRow.template_count !== 4 ||
    contractRow.brief_count !== 1 ||
    contractRow.deliverable_count !== 2 ||
    contractRow.slot_count !== 10 ||
    contractRow.community_count !== 10 ||
    contractRow.reward_total !== 50_000
  ) {
    throw new Error('Deterministic synthetic mission contract is missing or incorrect.');
  }

  process.stdout.write(
    `Database check passed for ${actual.length} tables and the synthetic identity, business, campaign, four templates, versioned brief, two deliverable requirements, and 10 Community Slots.\n`,
  );
} finally {
  await pool.end();
}

function expectOneSyntheticIdentity(
  row:
    | {
        creator_status: string;
        locality_status: string;
        membership_role: string;
        membership_status: string;
        provider: string;
      }
    | undefined,
): void {
  if (
    !row ||
    row.provider !== 'apple' ||
    row.creator_status !== 'approved' ||
    row.locality_status !== 'verified' ||
    row.membership_role !== 'owner' ||
    row.membership_status !== 'active'
  ) {
    throw new Error('Deterministic synthetic shared identity boundary is missing or incorrect.');
  }
}
