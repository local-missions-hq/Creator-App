import { Pool } from 'pg';

import { CampaignStore } from '../src/campaign-store.js';
import { getLocalDatabaseUrl } from './local-database.js';

const pool = new Pool({ connectionString: getLocalDatabaseUrl() });
const store = new CampaignStore(pool);

try {
  const client = await pool.connect();
  let businessId: string;
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, public_id)
       VALUES ('10000000-0000-4000-8000-000000000001', 'usr_orlando_synthetic_001')
       ON CONFLICT (id) DO NOTHING`,
    );
    await client.query(
      `INSERT INTO businesses (public_id, name)
       VALUES ('biz_orlando_synthetic_001', 'Lakeview Discovery Center')
       ON CONFLICT (public_id) DO NOTHING`,
    );
    const business = await client.query<{ id: string }>(
      `SELECT id FROM businesses WHERE public_id = 'biz_orlando_synthetic_001'`,
    );
    const businessRow = business.rows[0];
    if (!businessRow) throw new Error('Synthetic business insert returned no row.');
    businessId = businessRow.id;
    await client.query(
      `INSERT INTO external_identities (
         id, user_id, provider, issuer, subject, verified_at
       ) VALUES (
         '11000000-0000-4000-8000-000000000001',
         '10000000-0000-4000-8000-000000000001',
         'apple', 'https://identity.local.test/v1', 'synthetic-provider-subject-001',
         '2026-08-27T12:00:00.000Z'
       ) ON CONFLICT (issuer, subject) DO NOTHING`,
    );
    await client.query(
      `INSERT INTO creator_profiles (
         user_id, public_id, status, locality_status, verified_postal_area,
         locality_verified_at, locality_expires_at
       ) VALUES (
         '10000000-0000-4000-8000-000000000001', 'cr_orlando_synthetic_001',
         'approved', 'verified', '32801', '2026-08-27T12:00:00.000Z',
         '2027-08-27T12:00:00.000Z'
       ) ON CONFLICT (user_id) DO NOTHING`,
    );
    await client.query(
      `INSERT INTO business_memberships (
         id, business_id, user_id, role, status
       ) VALUES (
         '12000000-0000-4000-8000-000000000001', $1,
         '10000000-0000-4000-8000-000000000001', 'owner', 'active'
       ) ON CONFLICT (business_id, user_id) DO NOTHING`,
      [businessId],
    );
    await client.query(
      `INSERT INTO business_locations (
         id, public_id, business_id, name, address_line_1, city, region,
         postal_code, timezone
       ) VALUES (
         '13000000-0000-4000-8000-000000000001', 'loc_orlando_synthetic_001', $1,
         'Synthetic Orlando Venue', '100 Synthetic Way', 'Orlando', 'FL',
         '32801', 'America/New_York'
       ) ON CONFLICT (public_id) DO NOTHING`,
      [businessId],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const existingCampaign = await pool.query<{
    public_id: string;
    status: 'draft';
    version: number;
  }>(
    `SELECT public_id, status, version
       FROM campaigns
      WHERE public_id = 'cmp_orlando_synthetic_001'`,
  );
  const campaign =
    existingCampaign.rows[0] ??
    (await store.createDraftCampaign({
      actorId: '10000000-0000-4000-8000-000000000001',
      businessId,
      correlationId: '30000000-0000-4000-8000-000000000001',
      creatorRewardPoolMinor: 50_000,
      currency: 'USD',
      idempotencyKey: 'seed-campaign-orlando-001',
      platformFeeMinor: 7_500,
      publicId: 'cmp_orlando_synthetic_001',
      slotCount: 10,
      title: 'Family Adventure Preview',
      totalDueMinor: 57_500,
    }));

  process.stdout.write(
    `Seeded synthetic shared user, creator profile, business workspace, location, and campaign ${'publicId' in campaign ? campaign.publicId : campaign.public_id} in ${campaign.status} at version ${campaign.version}.\n`,
  );
} finally {
  await pool.end();
}
