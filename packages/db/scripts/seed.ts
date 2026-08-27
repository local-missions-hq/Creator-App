import { Pool } from 'pg';

import { CampaignStore } from '../src/campaign-store.js';
import { getLocalDatabaseUrl } from './local-database.js';

const pool = new Pool({ connectionString: getLocalDatabaseUrl() });
const store = new CampaignStore(pool);

try {
  const businessId = await store.createBusiness({
    name: 'Lakeview Discovery Center',
    publicId: 'biz_orlando_synthetic_001',
  });
  const campaign = await store.createDraftCampaign({
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
  });

  process.stdout.write(
    `Seeded synthetic campaign ${campaign.publicId} in ${campaign.status} at version ${campaign.version}.\n`,
  );
} finally {
  await pool.end();
}
