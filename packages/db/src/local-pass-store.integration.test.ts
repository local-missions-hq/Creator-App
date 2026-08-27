import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { LocalPassStore } from './local-pass-store.js';

const migrationsBeforeLocalPass = [
  '0000_giant_snowbird.sql',
  '0001_empty_tyrannus.sql',
  '0002_material_rachel_grey.sql',
  '0003_orange_tempest.sql',
  '0004_handy_gideon.sql',
  '0005_huge_agent_brand.sql',
  '0006_dapper_mordo.sql',
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const localPassMigration = fileURLToPath(
  new URL('../drizzle/0007_thick_sharon_ventura.sql', import.meta.url),
);
const databaseName = `local_missions_m3_local_pass_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;
const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let store: LocalPassStore;
let templateId: string;

type Fixture = {
  assignmentIds: [string, string];
  campaignId: string;
  creatorIds: [string, string];
  linkTokens: [string, string];
  locationId: string;
  offerId: string;
  otherLocationId: string;
  outsiderId: string;
  ownerId: string;
  staffId: string;
};

async function applyMigration(path: string): Promise<void> {
  const migration = await readFile(path, 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) {
    if (statement.trim()) await pool.query(statement);
  }
}

function rawToken(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '')}_${randomUUID().replaceAll('-', '')}`;
}

function customerToken(label: string): string {
  return createHash('sha256').update(`synthetic-customer:${label}`).digest('hex');
}

async function insertUser(label: string): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (public_id) VALUES ($1) RETURNING id`,
    [`usr_${label}_${randomUUID()}`],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error('Synthetic user insert failed.');
  return id;
}

async function createFixture(totalQuantity = 2): Promise<Fixture> {
  const label = randomUUID();
  const ownerId = await insertUser(`owner_${label}`);
  const creatorOneId = await insertUser(`creator_one_${label}`);
  const creatorTwoId = await insertUser(`creator_two_${label}`);
  const staffId = await insertUser(`staff_${label}`);
  const outsiderId = await insertUser(`outsider_${label}`);
  const business = await pool.query<{ id: string }>(
    `INSERT INTO businesses (public_id, name) VALUES ($1, 'Synthetic Local Pass Cafe') RETURNING id`,
    [`biz_${label}`],
  );
  const businessId = business.rows[0]?.id;
  if (!businessId) throw new Error('Synthetic business insert failed.');
  await pool.query(
    `INSERT INTO business_memberships (business_id, user_id, role, status)
     VALUES ($1,$2,'owner','active'), ($1,$3,'venue_staff','active')`,
    [businessId, ownerId, staffId],
  );
  const locations = await pool.query<{ id: string }>(
    `INSERT INTO business_locations (
       public_id, business_id, name, address_line_1, city, region, postal_code, timezone
     ) VALUES
       ($1,$3,'Primary Synthetic Venue','100 Synthetic Way','Orlando','FL','32801','America/New_York'),
       ($2,$3,'Other Synthetic Venue','200 Synthetic Way','Orlando','FL','32801','America/New_York')
     RETURNING id`,
    [`loc_primary_${label}`, `loc_other_${label}`, businessId],
  );
  const locationId = locations.rows[0]?.id;
  const otherLocationId = locations.rows[1]?.id;
  if (!locationId || !otherLocationId) throw new Error('Synthetic locations missing.');
  const campaign = await pool.query<{ id: string }>(
    `INSERT INTO campaigns (
       public_id, business_id, title, status, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES ($1,$2,'Synthetic Local Pass campaign','draft',10000,1500,11500,'USD',2)
     RETURNING id`,
    [`cmp_${label}`, businessId],
  );
  const campaignId = campaign.rows[0]?.id;
  if (!campaignId) throw new Error('Synthetic campaign missing.');
  const brief = await pool.query<{ id: string }>(
    `INSERT INTO campaign_brief_versions (
       campaign_id, version, mission_template_id, plain_language_brief, checklist, created_by
     ) VALUES ($1,1,$2,'Complete the objective visit.','{}'::jsonb,$3) RETURNING id`,
    [campaignId, templateId, ownerId],
  );
  const briefId = brief.rows[0]?.id;
  if (!briefId) throw new Error('Synthetic campaign brief missing.');
  const slots = await pool.query<{ id: string }>(
    `INSERT INTO mission_slots (
       public_id, campaign_id, ordinal, type, status, base_reward_minor,
       bonus_reward_minor, reward_minor, currency
     ) VALUES
       ($1,$3,1,'community','completed',5000,0,5000,'USD'),
       ($2,$3,2,'community','completed',5000,0,5000,'USD') RETURNING id`,
    [`slot_one_${label}`, `slot_two_${label}`, campaignId],
  );
  const slotOneId = slots.rows[0]?.id;
  const slotTwoId = slots.rows[1]?.id;
  const applications = await pool.query<{ id: string }>(
    `INSERT INTO mission_applications (public_id, campaign_id, creator_user_id, status)
     VALUES ($1,$3,$4,'completed'), ($2,$3,$5,'completed') RETURNING id`,
    [`app_one_${label}`, `app_two_${label}`, campaignId, creatorOneId, creatorTwoId],
  );
  const applicationOneId = applications.rows[0]?.id;
  const applicationTwoId = applications.rows[1]?.id;
  if (!slotOneId || !slotTwoId || !applicationOneId || !applicationTwoId) {
    throw new Error('Synthetic mission inputs missing.');
  }
  const assignments = await pool.query<{ id: string }>(
    `INSERT INTO mission_assignments (
       public_id, application_id, campaign_id, campaign_brief_version_id,
       mission_slot_id, creator_user_id, business_location_id, window_starts_at,
       window_ends_at, timezone, status, created_by
     ) VALUES
       ($1,$3,$5,$6,$7,$9,$11,now()-interval '1 day',now()+interval '1 day','America/New_York','completed',$12),
       ($2,$4,$5,$6,$8,$10,$11,now()-interval '1 day',now()+interval '1 day','America/New_York','completed',$12)
     RETURNING id`,
    [
      `asn_one_${label}`,
      `asn_two_${label}`,
      applicationOneId,
      applicationTwoId,
      campaignId,
      briefId,
      slotOneId,
      slotTwoId,
      creatorOneId,
      creatorTwoId,
      locationId,
      ownerId,
    ],
  );
  const assignmentOneId = assignments.rows[0]?.id;
  const assignmentTwoId = assignments.rows[1]?.id;
  if (!assignmentOneId || !assignmentTwoId) throw new Error('Synthetic assignments missing.');
  const membership = await pool.query<{ id: string }>(
    `SELECT id FROM business_memberships WHERE business_id = $1 AND user_id = $2`,
    [businessId, staffId],
  );
  await pool.query(
    `INSERT INTO venue_staff_assignments (
       public_id, business_membership_id, business_location_id,
       window_starts_at, window_ends_at, created_by
     ) VALUES ($1,$2,$3,now()-interval '1 day',now()+interval '1 day',$4)`,
    [`vsa_${label}`, membership.rows[0]?.id, locationId, ownerId],
  );
  const offer = await store.configureOffer({
    actorUserId: ownerId,
    availableEndsAt: new Date(Date.now() + 9 * 86_400_000),
    availableStartsAt: new Date(Date.now() - 3_600_000),
    businessLocationId: locationId,
    campaignId,
    correlationId: randomUUID(),
    currency: 'USD',
    exclusions: 'No cash value.',
    offerDescription: 'One complete synthetic meal.',
    preapprovedSubstituteDescription: 'One equal-or-greater synthetic meal.',
    preapprovedSubstituteValueMinor: 3000,
    publicId: `lpo_${label}`,
    statedRetailValueMinor: 2500,
    title: 'Synthetic Meal Pass',
    totalQuantity,
  });
  await pool.query(`UPDATE campaigns SET status = 'published' WHERE id = $1`, [campaignId]);
  await store.activateOffer({
    actorUserId: ownerId,
    correlationId: randomUUID(),
    localPassOfferId: offer.id,
  });
  const linkTokens: [string, string] = [rawToken('link_one'), rawToken('link_two')];
  await store.issueCreatorLink({
    correlationId: randomUUID(),
    localPassOfferId: offer.id,
    missionAssignmentId: assignmentOneId,
    publicId: `lpl_one_${label}`,
    rawLinkToken: linkTokens[0],
  });
  await store.issueCreatorLink({
    correlationId: randomUUID(),
    localPassOfferId: offer.id,
    missionAssignmentId: assignmentTwoId,
    publicId: `lpl_two_${label}`,
    rawLinkToken: linkTokens[1],
  });
  return {
    assignmentIds: [assignmentOneId, assignmentTwoId],
    campaignId,
    creatorIds: [creatorOneId, creatorTwoId],
    linkTokens,
    locationId,
    offerId: offer.id,
    otherLocationId,
    outsiderId,
    ownerId,
    staffId,
  };
}

async function claim(
  fixture: Fixture,
  linkIndex: 0 | 1,
  customer: string,
  rawClaimToken = rawToken('claim'),
) {
  return store.claimPass({
    claimPublicId: `lpc_${randomUUID()}`,
    claimTokenPublicId: `lpct_${randomUUID()}`,
    correlationId: randomUUID(),
    customerDedupToken: customerToken(customer),
    eventPublicId: `lpe_${randomUUID()}`,
    rawClaimToken,
    rawLinkToken: fixture.linkTokens[linkIndex],
    tokenKeyVersion: 1,
  });
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 8 });
  for (const migration of migrationsBeforeLocalPass) await applyMigration(migration);
  await pool.query(`INSERT INTO users (public_id) VALUES ('usr_local_pass_upgrade_proof')`);
  await applyMigration(localPassMigration);
  store = new LocalPassStore(pool);
  const template = await pool.query<{ id: string }>(
    `INSERT INTO mission_templates (code, version, name, checklist_schema)
     VALUES ('visit_create', 907, 'Local Pass test template', '{"type":"object"}'::jsonb)
     RETURNING id`,
  );
  templateId = template.rows[0]?.id ?? '';
}, 30_000);

afterAll(async () => {
  await pool?.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('LocalPassStore', () => {
  it('migrates forward, stores only hashes, and keeps offer terms and evidence immutable', async () => {
    const upgrade = await pool.query(
      `SELECT 1 FROM users WHERE public_id = 'usr_local_pass_upgrade_proof'`,
    );
    expect(upgrade.rowCount).toBe(1);
    const fixture = await createFixture();
    await store.recordLinkOpen({
      correlationId: randomUUID(),
      eventPublicId: `lpe_${randomUUID()}`,
      rawLinkToken: fixture.linkTokens[0],
    });
    const columns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name LIKE 'local_pass_%'`,
    );
    expect(columns.rows.map((row) => row.column_name).join(' ')).not.toMatch(
      /phone|email|ip_address|device_id|raw_token/,
    );
    const storedLink = await pool.query<{ committed_quantity: number; token_hash: string }>(
      `SELECT l.token_hash, o.committed_quantity FROM local_pass_links l
       JOIN local_pass_offers o ON o.id = l.local_pass_offer_id
       WHERE l.local_pass_offer_id = $1 LIMIT 1`,
      [fixture.offerId],
    );
    expect(storedLink.rows[0]?.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedLink.rows[0]?.token_hash).not.toBe(fixture.linkTokens[0]);
    expect(storedLink.rows[0]?.committed_quantity).toBe(0);
    await expect(
      pool.query(`UPDATE local_pass_offers SET title = 'Rewritten' WHERE id = $1`, [
        fixture.offerId,
      ]),
    ).rejects.toThrow(/immutable/);
    await expect(
      pool.query(`DELETE FROM local_pass_attribution_events WHERE campaign_id = $1`, [
        fixture.campaignId,
      ]),
    ).rejects.toThrow(/immutable/);
  });

  it('locks first-valid attribution under concurrent duplicate-customer claims', async () => {
    const fixture = await createFixture();
    const attempts = await Promise.allSettled([
      claim(fixture, 0, `same_${fixture.campaignId}`),
      claim(fixture, 1, `same_${fixture.campaignId}`),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    const rejection = attempts.find((attempt) => attempt.status === 'rejected');
    expect((rejection as PromiseRejectedResult).reason).toMatchObject({
      code: 'LOCAL_PASS_ATTRIBUTION_LOCKED',
    });
    const winning = attempts.find(
      (attempt) => attempt.status === 'fulfilled',
    ) as PromiseFulfilledResult<Awaited<ReturnType<typeof claim>>>;
    expect(winning.value).not.toHaveProperty('customerDedupToken');
    const proof = await pool.query<{
      committed_quantity: number;
      creator_user_id: string;
      count: string;
    }>(
      `SELECT o.committed_quantity, c.creator_user_id, count(*) OVER ()::text AS count
       FROM local_pass_claims c JOIN local_pass_offers o ON o.id = c.local_pass_offer_id
       WHERE c.campaign_id = $1`,
      [fixture.campaignId],
    );
    expect(proof.rows).toHaveLength(1);
    expect(proof.rows[0]?.committed_quantity).toBe(1);
    expect(fixture.creatorIds).toContain(proof.rows[0]?.creator_user_id);
  });

  it('prevents final-inventory oversubscription and preserves active claims when future claims pause', async () => {
    const fixture = await createFixture(1);
    const attempts = await Promise.allSettled([
      claim(fixture, 0, `inventory_a_${fixture.campaignId}`),
      claim(fixture, 1, `inventory_b_${fixture.campaignId}`),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(
      (attempts.find((attempt) => attempt.status === 'rejected') as PromiseRejectedResult).reason,
    ).toMatchObject({
      code: 'LOCAL_PASS_INVENTORY_FULL',
    });
    const pausedFixture = await createFixture(2);
    const active = await claim(pausedFixture, 0, `pause_a_${pausedFixture.campaignId}`);
    await store.pauseFutureClaims({
      actorUserId: pausedFixture.ownerId,
      correlationId: randomUUID(),
      localPassOfferId: pausedFixture.offerId,
    });
    await expect(
      claim(pausedFixture, 1, `pause_b_${pausedFixture.campaignId}`),
    ).rejects.toMatchObject({
      code: 'LOCAL_PASS_CLAIMS_PAUSED',
    });
    const activeProof = await pool.query<{ status: string }>(
      `SELECT status FROM local_pass_claims WHERE id = $1`,
      [active.id],
    );
    expect(activeProof.rows[0]?.status).toBe('active');
  });

  it('rotates screenshot tokens and enforces exact venue and staff authorization', async () => {
    const fixture = await createFixture();
    const oldToken = rawToken('old_claim');
    const activeClaim = await claim(fixture, 0, `rotation_${fixture.campaignId}`, oldToken);
    const newToken = rawToken('new_claim');
    await store.rotateClaimToken({
      claimId: activeClaim.id,
      claimTokenPublicId: `lpct_${randomUUID()}`,
      correlationId: randomUUID(),
      customerDedupToken: customerToken(`rotation_${fixture.campaignId}`),
      rawClaimToken: newToken,
    });
    const baseRedeem = {
      businessLocationId: fixture.locationId,
      correlationId: randomUUID(),
      eventPublicId: `lpe_${randomUUID()}`,
      fulfillmentKind: 'original_offer' as const,
      offerConfirmed: true,
      publicId: `lpr_${randomUUID()}`,
    };
    await expect(
      store.redeemPass({ ...baseRedeem, actorUserId: fixture.ownerId, rawClaimToken: oldToken }),
    ).rejects.toMatchObject({
      code: 'LOCAL_PASS_TOKEN_INVALID',
    });
    await expect(
      store.redeemPass({
        ...baseRedeem,
        actorUserId: fixture.ownerId,
        businessLocationId: fixture.otherLocationId,
        rawClaimToken: newToken,
      }),
    ).rejects.toMatchObject({ code: 'LOCAL_PASS_WRONG_VENUE' });
    await expect(
      store.redeemPass({ ...baseRedeem, actorUserId: fixture.outsiderId, rawClaimToken: newToken }),
    ).rejects.toMatchObject({
      code: 'LOCAL_PASS_ACCESS_DENIED',
    });
    const attempts = await Promise.allSettled([
      store.redeemPass({ ...baseRedeem, actorUserId: fixture.staffId, rawClaimToken: newToken }),
      store.redeemPass({
        ...baseRedeem,
        actorUserId: fixture.staffId,
        correlationId: randomUUID(),
        eventPublicId: `lpe_${randomUUID()}`,
        publicId: `lpr_${randomUUID()}`,
        rawClaimToken: newToken,
      }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(
      (attempts.find((attempt) => attempt.status === 'rejected') as PromiseRejectedResult).reason,
    ).toMatchObject({
      code: 'LOCAL_PASS_TOKEN_REPLAYED',
    });
    const evidence = await pool.query<{ kind: string }>(
      `SELECT kind FROM local_pass_attribution_events WHERE local_pass_claim_id = $1 ORDER BY occurred_at`,
      [activeClaim.id],
    );
    expect(evidence.rows.map((row) => row.kind)).toEqual([
      'pass_claimed',
      'verified_pass_redemption',
    ]);
    const missionProof = await pool.query<{ status: string }>(
      `SELECT status FROM mission_assignments WHERE id = ANY($1::uuid[]) ORDER BY id`,
      [fixture.assignmentIds],
    );
    expect(missionProof.rows.every((row) => row.status === 'completed')).toBe(true);
    expect(
      (
        await pool.query(
          `SELECT 1 FROM financial_action_intents WHERE mission_assignment_id = ANY($1::uuid[])`,
          [fixture.assignmentIds],
        )
      ).rowCount,
    ).toBe(0);
  });

  it('releases inventory when a seven-day claim expires unredeemed', async () => {
    const fixture = await createFixture(1);
    const link = await pool.query<{ id: string }>(
      `SELECT id FROM local_pass_links WHERE local_pass_offer_id = $1 ORDER BY created_at LIMIT 1`,
      [fixture.offerId],
    );
    const claimResult = await pool.query<{ id: string }>(
      `INSERT INTO local_pass_claims (
         public_id, local_pass_offer_id, local_pass_link_id, campaign_id, creator_user_id,
         customer_dedup_token, token_key_version, claimed_at, expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,1,now()-interval '8 days',now()-interval '1 day') RETURNING id`,
      [
        `lpc_expired_${randomUUID()}`,
        fixture.offerId,
        link.rows[0]?.id,
        fixture.campaignId,
        fixture.creatorIds[0],
        customerToken(`expired_${fixture.campaignId}`),
      ],
    );
    const claimId = claimResult.rows[0]?.id ?? '';
    await pool.query(`UPDATE local_pass_offers SET committed_quantity = 1 WHERE id = $1`, [
      fixture.offerId,
    ]);
    await pool.query(
      `INSERT INTO local_pass_claim_tokens
         (public_id, local_pass_claim_id, rotation, token_hash, issued_at, expires_at)
       VALUES ($1,$2,1,$3,now()-interval '8 days',now()-interval '8 days'+interval '5 minutes')`,
      [
        `lpct_expired_${randomUUID()}`,
        claimId,
        createHash('sha256').update(rawToken('expired')).digest('hex'),
      ],
    );
    const expired = await store.expireClaim({ claimId, correlationId: randomUUID() });
    expect(expired.status).toBe('expired');
    const proof = await pool.query<{ committed_quantity: number; status: string }>(
      `SELECT o.committed_quantity, t.status FROM local_pass_offers o
       JOIN local_pass_claims c ON c.local_pass_offer_id = o.id
       JOIN local_pass_claim_tokens t ON t.local_pass_claim_id = c.id
       WHERE c.id = $1`,
      [claimId],
    );
    expect(proof.rows[0]).toMatchObject({ committed_quantity: 0, status: 'expired' });
  });
});
