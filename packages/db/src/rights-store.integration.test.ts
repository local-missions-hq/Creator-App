import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { RightsStore } from './rights-store.js';

const migrations = [
  '0000_giant_snowbird.sql',
  '0001_empty_tyrannus.sql',
  '0002_material_rachel_grey.sql',
  '0003_orange_tempest.sql',
  '0004_handy_gideon.sql',
  '0005_huge_agent_brand.sql',
  '0006_dapper_mordo.sql',
  '0007_thick_sharon_ventura.sql',
  '0008_fair_sheva_callister.sql',
  '0009_nifty_scorpion.sql',
  '0010_wide_lady_ursula.sql',
  '0011_perpetual_ender_wiggin.sql',
  '0012_notification_preference_history_backfill.sql',
  '0013_brave_maddog.sql',
  '0014_serious_terror.sql',
  '0015_slim_joshua_kane.sql',
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const databaseName = `local_missions_m3_rights_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;
const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let store: RightsStore;
let templateId: string;
let termsDocumentId: string;
let disclosureDocumentId: string;
let platformAdminId: string;

type Fixture = {
  acceptanceId?: string;
  applicationId: string;
  briefId: string;
  businessId: string;
  campaignId: string;
  creatorId: string;
  missionAssignmentId: string;
  missionSlotId: string;
  otherUserId: string;
  ownerId: string;
  requirementId: string;
  rightsOfferId: string;
};

type FinalizedFixture = Fixture & {
  financialIntentId?: string;
  mediaAssetId?: string;
  submissionAttemptId: string;
};

async function applyMigration(path: string): Promise<void> {
  const migration = await readFile(path, 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) {
    if (statement.trim()) await pool.query(statement);
  }
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

async function createFixture(input?: {
  accept?: boolean;
  extendedOwnedMediaSelected?: boolean;
  paidAdvertisingSelected?: boolean;
  publicDisclosureRequired?: boolean;
}): Promise<Fixture> {
  const accept = input?.accept ?? true;
  const extended = input?.extendedOwnedMediaSelected ?? true;
  const paid = input?.paidAdvertisingSelected ?? true;
  const disclosureRequired = input?.publicDisclosureRequired ?? true;
  const label = randomUUID();
  const baseRewardMinor = 5_000;
  const extendedBonusMinor = extended ? 2_500 : 0;
  const paidBonusMinor = paid ? 5_000 : 0;
  const bonusRewardMinor = extendedBonusMinor + paidBonusMinor;
  const rewardMinor = baseRewardMinor + bonusRewardMinor;
  const platformFeeMinor = Math.floor((rewardMinor * 15 + 50) / 100);
  const ownerId = await insertUser(`owner_${label}`);
  const creatorId = await insertUser(`creator_${label}`);
  const otherUserId = await insertUser(`other_${label}`);
  const business = await pool.query<{ id: string }>(
    `INSERT INTO businesses (public_id, name) VALUES ($1,'Synthetic Rights Cafe') RETURNING id`,
    [`biz_${label}`],
  );
  const businessId = business.rows[0]?.id;
  if (!businessId) throw new Error('Synthetic business insert failed.');
  await pool.query(
    `INSERT INTO business_memberships (business_id, user_id, role, status)
     VALUES ($1,$2,'owner','active')`,
    [businessId, ownerId],
  );
  const location = await pool.query<{ id: string }>(
    `INSERT INTO business_locations (
       public_id, business_id, name, address_line_1, city, region, postal_code, timezone
     ) VALUES ($1,$2,'Synthetic Rights Venue','100 Synthetic Way','Orlando','FL','32801','America/New_York')
     RETURNING id`,
    [`loc_${label}`, businessId],
  );
  const locationId = location.rows[0]?.id;
  const campaign = await pool.query<{ id: string }>(
    `INSERT INTO campaigns (
       public_id, business_id, title, status, creator_reward_pool_minor,
       platform_fee_minor, total_due_minor, currency, slot_count
     ) VALUES ($1,$2,'Synthetic Rights Campaign','draft',$3,$4,$5,'USD',1) RETURNING id`,
    [`cmp_${label}`, businessId, rewardMinor, platformFeeMinor, rewardMinor + platformFeeMinor],
  );
  const campaignId = campaign.rows[0]?.id;
  if (!locationId || !campaignId) throw new Error('Synthetic campaign dependencies missing.');
  const brief = await pool.query<{ id: string }>(
    `INSERT INTO campaign_brief_versions (
       campaign_id, version, mission_template_id, plain_language_brief, checklist, created_by
     ) VALUES ($1,1,$2,'Create one synthetic licensed photo.','{}'::jsonb,$3) RETURNING id`,
    [campaignId, templateId, ownerId],
  );
  const briefId = brief.rows[0]?.id;
  if (!briefId) throw new Error('Synthetic brief missing.');
  const requirement = await pool.query<{ id: string }>(
    `INSERT INTO deliverable_requirements (
       public_id, campaign_brief_version_id, ordinal, type, required_count,
       allowed_mime_types, orientation, min_width_pixels, min_height_pixels,
       requires_disclosure, objective_description
     ) VALUES ($1,$2,1,'photo',1,'["image/jpeg"]'::jsonb,'any',1080,1080,$3,
               'Provide one verified original photo.') RETURNING id`,
    [`req_${label}`, briefId, disclosureRequired],
  );
  const slot = await pool.query<{ id: string }>(
    `INSERT INTO mission_slots (
       public_id, campaign_id, ordinal, type, status, base_reward_minor,
       reach_bonus_minor, contract_add_on_bonus_minor, bonus_reward_minor, reward_minor, currency
     ) VALUES ($1,$2,1,'community','accepted',$3,0,$4,$4,$5,'USD') RETURNING id`,
    [`slot_${label}`, campaignId, baseRewardMinor, bonusRewardMinor, rewardMinor],
  );
  const missionSlotId = slot.rows[0]?.id;
  const requirementId = requirement.rows[0]?.id;
  if (!missionSlotId || !requirementId) throw new Error('Synthetic mission contract missing.');
  const rightsOffer = await store.configureRightsOffer({
    actorUserId: ownerId,
    campaignBriefVersionId: briefId,
    correlationId: randomUUID(),
    extendedOwnedMediaSelected: extended,
    missionSlotId,
    paidAdvertisingSelected: paid,
    publicId: `rgt_${label}`,
    rightsVersion: 1,
  });
  const application = await pool.query<{ id: string }>(
    `INSERT INTO mission_applications (public_id, campaign_id, creator_user_id, status)
     VALUES ($1,$2,$3,'accepted') RETURNING id`,
    [`app_${label}`, campaignId, creatorId],
  );
  const applicationId = application.rows[0]?.id;
  if (!applicationId) throw new Error('Synthetic application missing.');
  const assignment = await pool.query<{ id: string }>(
    `INSERT INTO mission_assignments (
       public_id, application_id, campaign_id, campaign_brief_version_id,
       mission_slot_id, creator_user_id, business_location_id, window_starts_at,
       window_ends_at, timezone, status, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,now()+interval '1 day',now()+interval '2 days',
               'America/New_York','scheduled',$8) RETURNING id`,
    [
      `asn_${label}`,
      applicationId,
      campaignId,
      briefId,
      missionSlotId,
      creatorId,
      locationId,
      ownerId,
    ],
  );
  const missionAssignmentId = assignment.rows[0]?.id;
  if (!missionAssignmentId) throw new Error('Synthetic assignment missing.');
  let acceptanceId: string | undefined;
  if (accept) {
    const acceptance = await store.acceptMissionContract({
      campaignBriefVersionId: briefId,
      compensationAcknowledged: true,
      correlationId: randomUUID(),
      creatorTermsDocumentId: termsDocumentId,
      creatorUserId: creatorId,
      deliverablesAcknowledged: true,
      disclosureAcknowledged: true,
      disclosureDocumentId,
      missionAssignmentId,
      missionRightsOfferId: rightsOffer.id,
      publicId: `acc_${label}`,
      rightsAcknowledged: true,
    });
    acceptanceId = acceptance.id;
  }
  return {
    acceptanceId,
    applicationId,
    briefId,
    businessId,
    campaignId,
    creatorId,
    missionAssignmentId,
    missionSlotId,
    otherUserId,
    ownerId,
    requirementId,
    rightsOfferId: rightsOffer.id,
  };
}

async function finalizeFixture(
  fixture: Fixture,
  input?: {
    action?: 'creator_payable_full' | 'slot_refund_full';
    includeAsset?: boolean;
    submissionStatus?: 'approved' | 'auto_approved' | 'resolved_approved' | 'resolved_no_payout';
  },
): Promise<FinalizedFixture> {
  const submissionStatus = input?.submissionStatus ?? 'approved';
  const fullPayout = submissionStatus !== 'resolved_no_payout';
  await pool.query(`UPDATE campaigns SET status = 'published' WHERE id = $1`, [fixture.campaignId]);
  await pool.query(`UPDATE mission_applications SET status = $2 WHERE id = $1`, [
    fixture.applicationId,
    fullPayout ? 'completed' : 'no_payout',
  ]);
  await pool.query(`UPDATE mission_slots SET status = $2 WHERE id = $1`, [
    fixture.missionSlotId,
    fullPayout ? 'completed' : 'no_payout',
  ]);
  await pool.query(`UPDATE mission_assignments SET status = $2 WHERE id = $1`, [
    fixture.missionAssignmentId,
    fullPayout ? 'completed' : 'no_payout',
  ]);
  const submission = await pool.query<{ id: string }>(
    `INSERT INTO submission_attempts (
       public_id, mission_assignment_id, attempt_number, status, submitted_at, review_deadline_at
     ) VALUES ($1,$2,1,$3,now()-interval '3 hours',now()-interval '3 hours'+interval '48 hours')
     RETURNING id`,
    [`sub_${randomUUID()}`, fixture.missionAssignmentId, submissionStatus],
  );
  const submissionAttemptId = submission.rows[0]?.id;
  if (!submissionAttemptId) throw new Error('Synthetic submission missing.');
  let mediaAssetId: string | undefined;
  if (input?.includeAsset ?? true) {
    const media = await pool.query<{ id: string }>(
      `INSERT INTO media_assets (
         public_id, mission_assignment_id, creator_user_id, storage_object_key,
         checksum_sha256, mime_type, byte_size, width_pixels, height_pixels,
         orientation, status, verified_at
       ) VALUES ($1,$2,$3,$4,$5,'image/jpeg',1000,1080,1080,'any','verified',now())
       RETURNING id`,
      [
        `media_${randomUUID()}`,
        fixture.missionAssignmentId,
        fixture.creatorId,
        `private/synthetic/${randomUUID()}.jpg`,
        createHash('sha256').update(randomUUID()).digest('hex'),
      ],
    );
    mediaAssetId = media.rows[0]?.id;
    await pool.query(
      `INSERT INTO submission_assets
         (submission_attempt_id, deliverable_requirement_id, media_asset_id, position)
       VALUES ($1,$2,$3,1)`,
      [submissionAttemptId, fixture.requirementId, mediaAssetId],
    );
  }
  const action = input?.action;
  let financialIntentId: string | undefined;
  if (action) {
    const intent = await pool.query<{ id: string }>(
      `INSERT INTO financial_action_intents (
         public_id, mission_assignment_id, source_type, source_id, action
       ) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [
        `fin_${randomUUID()}`,
        fixture.missionAssignmentId,
        action === 'creator_payable_full' ? 'submission_approval' : 'dispute_resolution',
        randomUUID(),
        action,
      ],
    );
    financialIntentId = intent.rows[0]?.id;
  }
  return { ...fixture, financialIntentId, mediaAssetId, submissionAttemptId };
}

function licensePublicIds(label = randomUUID()) {
  return {
    extendedOwnedMedia: `lic_extended_${label}`,
    organicOwnedSocial: `lic_organic_${label}`,
    paidAdvertising: `lic_paid_${label}`,
  };
}

async function createRenewableLicense(
  kind: 'organic_owned_social_90d' | 'extended_owned_media_12m' | 'paid_advertising_30d',
) {
  const fixture = await finalizeFixture(
    await createFixture({
      extendedOwnedMediaSelected: kind === 'extended_owned_media_12m',
      paidAdvertisingSelected: kind === 'paid_advertising_30d',
    }),
    { action: 'creator_payable_full' },
  );
  const compensation =
    kind === 'organic_owned_social_90d' ? 0 : kind === 'extended_owned_media_12m' ? 2_500 : 5_000;
  const activation =
    kind === 'organic_owned_social_90d'
      ? `now() - interval '70 days'`
      : kind === 'extended_owned_media_12m'
        ? `now() - interval '12 months' + interval '20 days'`
        : `now() - interval '10 days'`;
  const duration =
    kind === 'organic_owned_social_90d'
      ? `interval '90 days'`
      : kind === 'extended_owned_media_12m'
        ? `interval '12 months'`
        : `interval '30 days'`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const license = await client.query<{ id: string; public_id: string }>(
      `INSERT INTO content_licenses (
       public_id, mission_assignment_id, mission_contract_acceptance_id,
       submission_attempt_id, financial_action_intent_id, kind, rights_version,
       base_reward_minor_snapshot, compensation_component_minor, currency,
       permitted_edits, activated_at, expires_at
     ) VALUES ($1,$2,$3,$4,$5,$6,1,5000,$7,'USD',
               '["crop","resize","caption","logo_placement","minor_formatting"]'::jsonb,
               ${activation}, ${activation} + ${duration})
     RETURNING id, public_id`,
      [
        `lic_renewable_${kind}_${randomUUID()}`,
        fixture.missionAssignmentId,
        fixture.acceptanceId,
        fixture.submissionAttemptId,
        fixture.financialIntentId,
        kind,
        compensation,
      ],
    );
    const sourceLicenseId = license.rows[0]?.id;
    const sourceLicensePublicId = license.rows[0]?.public_id;
    if (!sourceLicenseId || !sourceLicensePublicId || !fixture.mediaAssetId) {
      throw new Error('Synthetic renewable license dependencies missing.');
    }
    await client.query(
      `INSERT INTO content_license_assets (public_id, content_license_id, media_asset_id, position)
     VALUES ($1,$2,$3,1)`,
      [`cla_renewable_${randomUUID()}`, sourceLicenseId, fixture.mediaAssetId],
    );
    const channels =
      kind === 'organic_owned_social_90d'
        ? ['owned_social']
        : kind === 'extended_owned_media_12m'
          ? ['owned_social', 'business_website', 'business_email']
          : ['paid_advertising'];
    for (const channel of channels) {
      await client.query(
        `INSERT INTO content_license_channels (public_id, content_license_id, channel)
       VALUES ($1,$2,$3)`,
        [`clc_renewable_${randomUUID()}`, sourceLicenseId, channel],
      );
    }
    await client.query(
      `INSERT INTO content_license_status_history (
       content_license_id, to_status, license_version, actor_type, reason, occurred_at
     ) SELECT id,'active',1,'service','Synthetic renewable source activation',activated_at
         FROM content_licenses WHERE id = $1`,
      [sourceLicenseId],
    );
    await client.query('COMMIT');
    return { ...fixture, sourceLicenseId, sourceLicensePublicId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 10 });
  for (const migration of migrations.slice(0, 8)) await applyMigration(migration);
  await pool.query(`INSERT INTO users (public_id) VALUES ('usr_rights_upgrade_proof')`);
  for (const migration of migrations.slice(8)) await applyMigration(migration);
  store = new RightsStore(pool);
  platformAdminId = await insertUser('platform_admin');
  await pool.query(
    `INSERT INTO platform_staff_memberships (public_id, user_id, role, status)
     VALUES ('staff_rights_admin', $1, 'admin', 'active')`,
    [platformAdminId],
  );
  const template = await pool.query<{ id: string }>(
    `INSERT INTO mission_templates (code, version, name, checklist_schema)
     VALUES ('visit_create', 908, 'Rights test template', '{"type":"object"}'::jsonb) RETURNING id`,
  );
  templateId = template.rows[0]?.id ?? '';
  const terms = await store.publishLegalDocumentVersion({
    actorUserId: platformAdminId,
    bodySha256: createHash('sha256').update('synthetic creator terms v1').digest('hex'),
    correlationId: randomUUID(),
    effectiveAt: new Date(Date.now() - 86_400_000),
    publicId: 'doc_creator_terms_v1',
    title: 'Synthetic Creator Terms',
    type: 'creator_terms',
    version: 1,
  });
  const disclosure = await store.publishLegalDocumentVersion({
    actorUserId: platformAdminId,
    bodySha256: createHash('sha256').update('synthetic sponsorship disclosure v1').digest('hex'),
    correlationId: randomUUID(),
    effectiveAt: new Date(Date.now() - 86_400_000),
    publicId: 'doc_sponsorship_disclosure_v1',
    title: 'Synthetic Sponsorship Disclosure',
    type: 'sponsorship_disclosure',
    version: 1,
  });
  termsDocumentId = terms.id;
  disclosureDocumentId = disclosure.id;
}, 30_000);

afterAll(async () => {
  if (pool) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('RightsStore', () => {
  it('migrates forward and publishes immutable hash-only legal document versions under admin control', async () => {
    expect(
      (await pool.query(`SELECT 1 FROM users WHERE public_id = 'usr_rights_upgrade_proof'`))
        .rowCount,
    ).toBe(1);
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN (
          'legal_document_versions','mission_rights_offers','mission_contract_acceptances',
          'content_licenses','content_license_assets','content_license_channels',
          'content_license_status_history'
        )`,
    );
    expect(tables.rows).toHaveLength(7);
    const columns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name IN ('legal_document_versions','mission_contract_acceptances','content_licenses')`,
    );
    expect(columns.rows.map((row) => row.column_name).join(' ')).not.toMatch(
      /body_text|document_body|signature|ip_address|device_id/,
    );
    const outsider = await insertUser('document_outsider');
    await expect(
      store.publishLegalDocumentVersion({
        actorUserId: outsider,
        bodySha256: createHash('sha256').update('unauthorized').digest('hex'),
        correlationId: randomUUID(),
        effectiveAt: new Date(),
        publicId: `doc_unauthorized_${randomUUID()}`,
        title: 'Unauthorized document',
        type: 'creator_terms',
        version: 99,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_ACCESS_DENIED' });
    await expect(
      pool.query(`UPDATE legal_document_versions SET title = 'Rewritten' WHERE id = $1`, [
        termsDocumentId,
      ]),
    ).rejects.toThrow(/immutable/);
  });

  it('locks exact rights economics and creator consent without cross-role substitution', async () => {
    const fixture = await createFixture({ accept: false });
    const offer = await pool.query<{
      extended_owned_media_bonus_minor: number;
      paid_advertising_bonus_minor: number;
      public_disclosure_required: boolean;
      total_rights_bonus_minor: number;
    }>(`SELECT * FROM mission_rights_offers WHERE id = $1`, [fixture.rightsOfferId]);
    expect(offer.rows[0]).toMatchObject({
      extended_owned_media_bonus_minor: 2_500,
      paid_advertising_bonus_minor: 5_000,
      public_disclosure_required: true,
      total_rights_bonus_minor: 7_500,
    });
    await expect(
      store.acceptMissionContract({
        campaignBriefVersionId: fixture.briefId,
        compensationAcknowledged: true,
        correlationId: randomUUID(),
        creatorTermsDocumentId: termsDocumentId,
        creatorUserId: fixture.otherUserId,
        deliverablesAcknowledged: true,
        disclosureAcknowledged: true,
        disclosureDocumentId,
        missionAssignmentId: fixture.missionAssignmentId,
        missionRightsOfferId: fixture.rightsOfferId,
        publicId: `acc_wrong_${randomUUID()}`,
        rightsAcknowledged: true,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_ACCEPTANCE_INVALID' });
    const attempts = await Promise.allSettled([
      store.acceptMissionContract({
        campaignBriefVersionId: fixture.briefId,
        compensationAcknowledged: true,
        correlationId: randomUUID(),
        creatorTermsDocumentId: termsDocumentId,
        creatorUserId: fixture.creatorId,
        deliverablesAcknowledged: true,
        disclosureAcknowledged: true,
        disclosureDocumentId,
        missionAssignmentId: fixture.missionAssignmentId,
        missionRightsOfferId: fixture.rightsOfferId,
        publicId: `acc_one_${randomUUID()}`,
        rightsAcknowledged: true,
      }),
      store.acceptMissionContract({
        campaignBriefVersionId: fixture.briefId,
        compensationAcknowledged: true,
        correlationId: randomUUID(),
        creatorTermsDocumentId: termsDocumentId,
        creatorUserId: fixture.creatorId,
        deliverablesAcknowledged: true,
        disclosureAcknowledged: true,
        disclosureDocumentId,
        missionAssignmentId: fixture.missionAssignmentId,
        missionRightsOfferId: fixture.rightsOfferId,
        publicId: `acc_two_${randomUUID()}`,
        rightsAcknowledged: true,
      }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(
      (attempts.find((attempt) => attempt.status === 'rejected') as PromiseRejectedResult).reason,
    ).toMatchObject({ code: 'RIGHTS_ALREADY_ACCEPTED' });
  });

  it('grants no rights to incomplete, unpaid, canceled, or final no-payout work', async () => {
    const incomplete = await createFixture();
    await expect(
      store.activateInitialLicenses({
        correlationId: randomUUID(),
        licensePublicIds: licensePublicIds(),
        missionAssignmentId: incomplete.missionAssignmentId,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_LICENSE_NOT_READY' });

    const unpaid = await finalizeFixture(await createFixture());
    await expect(
      store.activateInitialLicenses({
        correlationId: randomUUID(),
        licensePublicIds: licensePublicIds(),
        missionAssignmentId: unpaid.missionAssignmentId,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_LICENSE_NOT_READY' });

    const noPayout = await finalizeFixture(await createFixture(), {
      action: 'slot_refund_full',
      submissionStatus: 'resolved_no_payout',
    });
    await expect(
      store.activateInitialLicenses({
        correlationId: randomUUID(),
        licensePublicIds: licensePublicIds(),
        missionAssignmentId: noPayout.missionAssignmentId,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_LICENSE_NOT_READY' });

    const canceled = await createFixture();
    await pool.query(`UPDATE campaigns SET status = 'canceled' WHERE id = $1`, [
      canceled.campaignId,
    ]);
    await pool.query(`UPDATE mission_assignments SET status = 'canceled' WHERE id = $1`, [
      canceled.missionAssignmentId,
    ]);
    await expect(
      store.activateInitialLicenses({
        correlationId: randomUUID(),
        licensePublicIds: licensePublicIds(),
        missionAssignmentId: canceled.missionAssignmentId,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_LICENSE_NOT_READY' });
    expect(
      (
        await pool.query(
          `SELECT 1 FROM content_licenses WHERE mission_assignment_id = ANY($1::uuid[])`,
          [
            [
              incomplete.missionAssignmentId,
              unpaid.missionAssignmentId,
              noPayout.missionAssignmentId,
              canceled.missionAssignmentId,
            ],
          ],
        )
      ).rowCount,
    ).toBe(0);
  });

  it('activates one immutable fixed license set under concurrency without changing payment state', async () => {
    const fixture = await finalizeFixture(await createFixture(), {
      action: 'creator_payable_full',
    });
    const ids = licensePublicIds();
    const attempts = await Promise.all([
      store.activateInitialLicenses({
        correlationId: randomUUID(),
        licensePublicIds: ids,
        missionAssignmentId: fixture.missionAssignmentId,
      }),
      store.activateInitialLicenses({
        correlationId: randomUUID(),
        licensePublicIds: ids,
        missionAssignmentId: fixture.missionAssignmentId,
      }),
    ]);
    expect(attempts[0]).toHaveLength(3);
    expect(attempts[1].map((license) => license.id).sort()).toEqual(
      attempts[0].map((license) => license.id).sort(),
    );
    const proof = await pool.query<{
      compensation_component_minor: number;
      kind: string;
      term_seconds: string;
    }>(
      `SELECT kind, compensation_component_minor,
              extract(epoch FROM expires_at - activated_at)::text AS term_seconds
         FROM content_licenses WHERE mission_assignment_id = $1 ORDER BY kind`,
      [fixture.missionAssignmentId],
    );
    expect(proof.rows.map((row) => [row.kind, row.compensation_component_minor])).toEqual([
      ['organic_owned_social_90d', 0],
      ['extended_owned_media_12m', 2_500],
      ['paid_advertising_30d', 5_000],
    ]);
    const view = await store.listLicensesForBusiness({
      actorUserId: fixture.ownerId,
      missionAssignmentId: fixture.missionAssignmentId,
    });
    expect(view).toHaveLength(3);
    expect(view.every((license) => license.assetPublicIds.length === 1)).toBe(true);
    expect(view.find((license) => license.kind === 'extended_owned_media_12m')?.channels).toEqual([
      'business_email',
      'business_website',
      'owned_social',
    ]);
    expect(view.every((license) => license.isCurrentlyUsable)).toBe(true);
    await expect(
      store.listLicensesForBusiness({
        actorUserId: fixture.otherUserId,
        missionAssignmentId: fixture.missionAssignmentId,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_ACCESS_DENIED' });
    await expect(
      pool.query(`UPDATE content_licenses SET currency = 'EUR' WHERE mission_assignment_id = $1`, [
        fixture.missionAssignmentId,
      ]),
    ).rejects.toThrow(/immutable/);
    await expect(
      pool.query(
        `DELETE FROM content_license_assets
          WHERE content_license_id = (SELECT id FROM content_licenses WHERE mission_assignment_id = $1 LIMIT 1)`,
        [fixture.missionAssignmentId],
      ),
    ).rejects.toThrow(/immutable/);
    const intent = await pool.query<{ action: string; status: string }>(
      `SELECT action, status FROM financial_action_intents WHERE id = $1`,
      [fixture.financialIntentId],
    );
    expect(intent.rows[0]).toEqual({ action: 'creator_payable_full', status: 'pending_ledger' });
    expect(
      (
        await pool.query(`SELECT 1 FROM ledger_transactions WHERE mission_assignment_id = $1`, [
          fixture.missionAssignmentId,
        ])
      ).rowCount,
    ).toBe(0);
  });

  it('rejects approval without verified accepted content instead of licensing business access', async () => {
    const fixture = await finalizeFixture(await createFixture(), {
      action: 'creator_payable_full',
      includeAsset: false,
    });
    await expect(
      store.activateInitialLicenses({
        correlationId: randomUUID(),
        licensePublicIds: licensePublicIds(),
        missionAssignmentId: fixture.missionAssignmentId,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_NO_CONTENT' });
    expect(
      (
        await pool.query(`SELECT 1 FROM content_licenses WHERE mission_assignment_id = $1`, [
          fixture.missionAssignmentId,
        ])
      ).rowCount,
    ).toBe(0);
  });

  it('expires a fixed term with matching audit history and never renews automatically', async () => {
    const fixture = await finalizeFixture(
      await createFixture({
        extendedOwnedMediaSelected: false,
        paidAdvertisingSelected: false,
      }),
      { action: 'creator_payable_full' },
    );
    const licenseId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO content_licenses (
           id, public_id, mission_assignment_id, mission_contract_acceptance_id,
           submission_attempt_id, financial_action_intent_id, kind, rights_version,
           base_reward_minor_snapshot, compensation_component_minor, currency,
           permitted_edits, activated_at, expires_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,'organic_owned_social_90d',1,5000,0,'USD',
           '["crop","resize","caption","logo_placement","minor_formatting"]'::jsonb,
           now()-interval '91 days',now()-interval '1 day'
         )`,
        [
          licenseId,
          `lic_expiring_${randomUUID()}`,
          fixture.missionAssignmentId,
          fixture.acceptanceId,
          fixture.submissionAttemptId,
          fixture.financialIntentId,
        ],
      );
      await client.query(
        `INSERT INTO content_license_assets (public_id, content_license_id, media_asset_id, position)
         VALUES ($1,$2,$3,1)`,
        [`cla_${randomUUID()}`, licenseId, fixture.mediaAssetId],
      );
      await client.query(
        `INSERT INTO content_license_channels (public_id, content_license_id, channel)
         VALUES ($1,$2,'owned_social')`,
        [`clc_${randomUUID()}`, licenseId],
      );
      await client.query(
        `INSERT INTO content_license_status_history (
           content_license_id, to_status, license_version, actor_type, reason,
           occurred_at
         ) VALUES ($1,'active',1,'service','Synthetic fixed term activation',now()-interval '91 days')`,
        [licenseId],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    const expired = await store.expireDueLicenses({
      correlationId: randomUUID(),
      missionAssignmentId: fixture.missionAssignmentId,
    });
    expect(expired).toHaveLength(1);
    expect(expired[0]?.status).toBe('expired');
    expect(
      await store.expireDueLicenses({
        correlationId: randomUUID(),
        missionAssignmentId: fixture.missionAssignmentId,
      }),
    ).toEqual([]);
    const history = await pool.query<{ to_status: string }>(
      `SELECT to_status FROM content_license_status_history
        WHERE content_license_id = $1 ORDER BY license_version`,
      [licenseId],
    );
    expect(history.rows.map((row) => row.to_status)).toEqual(['active', 'expired']);
    const view = await store.listLicensesForBusiness({
      actorUserId: fixture.ownerId,
      missionAssignmentId: fixture.missionAssignmentId,
    });
    expect(view[0]).toMatchObject({
      isCurrentlyUsable: false,
      status: 'expired',
      usagePolicy: 'archived_organic_nonboostable',
    });
    expect(
      (
        await pool.query(
          `SELECT 1 FROM content_licenses
            WHERE mission_assignment_id = $1 AND public_id LIKE 'renewal_%'`,
          [fixture.missionAssignmentId],
        )
      ).rowCount,
    ).toBe(0);
  });

  it('prices creator-visible renewals from the original base and enforces the 30-day window', async () => {
    const earlyFixture = await finalizeFixture(
      await createFixture({
        extendedOwnedMediaSelected: false,
        paidAdvertisingSelected: false,
      }),
      { action: 'creator_payable_full' },
    );
    const earlyLicense = await store.activateInitialLicenses({
      correlationId: randomUUID(),
      licensePublicIds: licensePublicIds(),
      missionAssignmentId: earlyFixture.missionAssignmentId,
    });
    await expect(
      store.requestRenewal({
        actorUserId: earlyFixture.ownerId,
        correlationId: randomUUID(),
        publicId: `ren_early_${randomUUID()}`,
        sourceContentLicenseId: earlyLicense[0]?.id ?? '',
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_RENEWAL_WINDOW_CLOSED' });

    const cases = [
      ['organic_owned_social_90d', 1_250, 188, 1_438, '90 days'],
      ['extended_owned_media_12m', 2_500, 375, 2_875, '12 months'],
      ['paid_advertising_30d', 5_000, 750, 5_750, '30 days'],
    ] as const;
    for (const [kind, reward, fee, total, term] of cases) {
      const fixture = await createRenewableLicense(kind);
      await expect(
        store.requestRenewal({
          actorUserId: fixture.otherUserId,
          correlationId: randomUUID(),
          publicId: `ren_wrong_tenant_${randomUUID()}`,
          sourceContentLicenseId: fixture.sourceLicenseId,
        }),
      ).rejects.toMatchObject({ code: 'RIGHTS_ACCESS_DENIED' });
      const renewal = await store.requestRenewal({
        actorUserId: fixture.ownerId,
        correlationId: randomUUID(),
        publicId: `ren_${kind}_${randomUUID()}`,
        sourceContentLicenseId: fixture.sourceLicenseId,
      });
      expect(renewal).toMatchObject({
        creatorRewardMinor: reward,
        originalBaseRewardMinor: 5_000,
        platformFeeMinor: fee,
        status: 'requested',
        totalDueMinor: total,
      });
      const creatorView = await store.getRenewalForCreator({
        actorUserId: fixture.creatorId,
        renewalId: renewal.id,
      });
      expect(creatorView).toMatchObject({
        businessName: 'Synthetic Rights Cafe',
        creatorRewardMinor: reward,
        kind,
        term,
      });
      expect(creatorView.assetPublicIds).toHaveLength(1);
      await expect(
        store.getRenewalForCreator({ actorUserId: fixture.otherUserId, renewalId: renewal.id }),
      ).rejects.toMatchObject({ code: 'RIGHTS_ACCESS_DENIED' });
      if (kind === 'organic_owned_social_90d') {
        expect(
          await store.recordDueLicenseExpiryReminders({
            correlationId: randomUUID(),
            missionAssignmentId: fixture.missionAssignmentId,
          }),
        ).toEqual([
          {
            contentLicenseId: fixture.sourceLicenseId,
            expiresAt: creatorView.currentLicenseExpiresAt,
            stage: '30_days',
          },
        ]);
        expect(
          await store.recordDueLicenseExpiryReminders({
            correlationId: randomUUID(),
            missionAssignmentId: fixture.missionAssignmentId,
          }),
        ).toEqual([]);
        const declined = await store.decideRenewal({
          actorUserId: fixture.creatorId,
          correlationId: randomUUID(),
          decision: 'decline',
          renewalId: renewal.id,
        });
        expect(declined.status).toBe('declined');
        const unchanged = await pool.query<{ assignment_status: string; license_count: number }>(
          `SELECT assignment.status AS assignment_status,
                  (SELECT count(*)::int FROM content_licenses WHERE mission_assignment_id = assignment.id)
                    AS license_count
             FROM mission_assignments assignment WHERE assignment.id = $1`,
          [fixture.missionAssignmentId],
        );
        expect(unchanged.rows[0]).toEqual({ assignment_status: 'completed', license_count: 1 });
      }
    }
  });

  it('keeps accepted renewals unfunded and preserves old expiry after provider failure', async () => {
    const fixture = await createRenewableLicense('paid_advertising_30d');
    const source = await pool.query<{ expires_at: Date }>(
      `SELECT expires_at FROM content_licenses WHERE id = $1`,
      [fixture.sourceLicenseId],
    );
    const renewal = await store.requestRenewal({
      actorUserId: fixture.ownerId,
      correlationId: randomUUID(),
      publicId: `ren_failure_${randomUUID()}`,
      sourceContentLicenseId: fixture.sourceLicenseId,
    });
    await store.decideRenewal({
      actorUserId: fixture.creatorId,
      correlationId: randomUUID(),
      decision: 'accept',
      renewalId: renewal.id,
    });
    expect(
      (
        await pool.query(`SELECT 1 FROM content_licenses WHERE mission_assignment_id = $1`, [
          fixture.missionAssignmentId,
        ])
      ).rowCount,
    ).toBe(1);
    expect((await pool.query(`SELECT 1 FROM content_license_renewal_payables`)).rowCount).toBe(0);
    await expect(
      store.beginRenewalFunding({
        actorUserId: fixture.otherUserId,
        correlationId: randomUUID(),
        fundingIntentPublicId: `rfi_wrong_${randomUUID()}`,
        renewalId: renewal.id,
      }),
    ).rejects.toMatchObject({ code: 'RIGHTS_ACCESS_DENIED' });
    const intent = await store.beginRenewalFunding({
      actorUserId: fixture.ownerId,
      correlationId: randomUUID(),
      fundingIntentPublicId: `rfi_failure_${randomUUID()}`,
      renewalId: renewal.id,
    });
    expect(intent).toMatchObject({
      creatorRewardMinor: 5_000,
      platformFeeMinor: 750,
      status: 'pending_provider',
      totalDueMinor: 5_750,
    });
    expect((await pool.query(`SELECT 1 FROM content_license_renewal_payables`)).rowCount).toBe(0);
    await store.closeRenewalFunding({
      correlationId: randomUUID(),
      fundingIntentId: intent.id,
      outcome: 'failed',
    });
    const proof = await pool.query<{
      expires_at: Date;
      license_count: number;
      payable_count: number;
      renewal_status: string;
    }>(
      `SELECT source.expires_at, renewal.status AS renewal_status,
              (SELECT count(*)::int FROM content_licenses WHERE mission_assignment_id = source.mission_assignment_id)
                AS license_count,
              (SELECT count(*)::int FROM content_license_renewal_payables WHERE content_license_renewal_id = renewal.id)
                AS payable_count
         FROM content_license_renewals renewal
         JOIN content_licenses source ON source.id = renewal.source_content_license_id
        WHERE renewal.id = $1`,
      [renewal.id],
    );
    expect(proof.rows[0]).toMatchObject({
      license_count: 1,
      payable_count: 0,
      renewal_status: 'funding_failed',
    });
    expect(proof.rows[0]?.expires_at).toEqual(source.rows[0]?.expires_at);
  });

  it('activates a future non-backdated term and full payable only from authoritative funding', async () => {
    const fixture = await createRenewableLicense('extended_owned_media_12m');
    const source = await pool.query<{ expires_at: Date }>(
      `SELECT expires_at FROM content_licenses WHERE id = $1`,
      [fixture.sourceLicenseId],
    );
    const renewal = await store.requestRenewal({
      actorUserId: fixture.ownerId,
      correlationId: randomUUID(),
      publicId: `ren_success_${randomUUID()}`,
      sourceContentLicenseId: fixture.sourceLicenseId,
    });
    await store.decideRenewal({
      actorUserId: fixture.creatorId,
      correlationId: randomUUID(),
      decision: 'accept',
      renewalId: renewal.id,
    });
    const intent = await store.beginRenewalFunding({
      actorUserId: fixture.ownerId,
      correlationId: randomUUID(),
      fundingIntentPublicId: `rfi_success_${randomUUID()}`,
      renewalId: renewal.id,
    });
    const label = randomUUID();
    const fundingInput = {
      correlationId: randomUUID(),
      fundedAt: new Date(),
      fundingIntentId: intent.id,
      fundingSnapshotPublicId: `rfs_${label}`,
      invoiceProviderObjectId: `in_synthetic_${label}`,
      invoiceProviderReferencePublicId: `ppr_invoice_${label}`,
      licensePublicId: `lic_renewed_${label}`,
      payablePublicId: `rpay_${label}`,
      paymentIntentProviderObjectId: `pi_synthetic_${label}`,
      paymentIntentProviderReferencePublicId: `ppr_pi_${label}`,
      provider: 'stripe' as const,
      providerAccountReference: 'acct_synthetic_platform',
      providerEventId: `evt_synthetic_${label}`,
    };
    const activated = await store.recordAuthoritativeRenewalFunding(fundingInput);
    expect(activated).toMatchObject({
      compensationComponentMinor: 2_500,
      status: 'active',
      termNumber: 2,
    });
    expect(activated.activatedAt).toEqual(source.rows[0]?.expires_at);
    expect(await store.recordAuthoritativeRenewalFunding(fundingInput)).toMatchObject({
      id: activated.id,
      termNumber: 2,
    });
    const view = await store.listLicensesForBusiness({
      actorUserId: fixture.ownerId,
      missionAssignmentId: fixture.missionAssignmentId,
    });
    expect(view).toHaveLength(2);
    expect(view.find((license) => license.termNumber === 1)).toMatchObject({
      isCurrentlyUsable: true,
      usagePolicy: 'active_usage',
    });
    expect(view.find((license) => license.termNumber === 2)).toMatchObject({
      isCurrentlyUsable: false,
      usagePolicy: 'future_term',
    });
    const money = await pool.query<{
      amount_minor: number;
      object_types: string[];
      platform_fee_minor: number;
      submission_count: number;
      total_due_minor: number;
    }>(
      `SELECT payable.amount_minor, snapshot.platform_fee_minor, snapshot.total_due_minor,
              array_agg(reference.object_type::text ORDER BY reference.object_type::text) AS object_types,
              (SELECT count(*)::int FROM submission_attempts WHERE mission_assignment_id = renewal.mission_assignment_id)
                AS submission_count
         FROM content_license_renewals renewal
         JOIN content_license_renewal_payables payable ON payable.content_license_renewal_id = renewal.id
         JOIN content_license_renewal_funding_intents intent ON intent.content_license_renewal_id = renewal.id
         JOIN content_license_renewal_funding_snapshots snapshot
           ON snapshot.content_license_renewal_funding_intent_id = intent.id
         JOIN payment_provider_references reference
           ON reference.id IN (snapshot.invoice_provider_reference_id, snapshot.payment_intent_provider_reference_id)
        WHERE renewal.id = $1
        GROUP BY payable.amount_minor, snapshot.platform_fee_minor, snapshot.total_due_minor,
                 renewal.mission_assignment_id`,
      [renewal.id],
    );
    expect(money.rows[0]).toEqual({
      amount_minor: 2_500,
      object_types: ['invoice', 'payment_intent'],
      platform_fee_minor: 375,
      submission_count: 1,
      total_due_minor: 2_875,
    });
    await expect(
      pool.query(
        `UPDATE content_license_renewal_payables SET amount_minor = 1 WHERE public_id = $1`,
        [fundingInput.payablePublicId],
      ),
    ).rejects.toThrow(/immutable/);
  });

  it('allows exactly one authoritative funding winner under concurrency', async () => {
    const fixture = await createRenewableLicense('organic_owned_social_90d');
    const renewal = await store.requestRenewal({
      actorUserId: fixture.ownerId,
      correlationId: randomUUID(),
      publicId: `ren_race_${randomUUID()}`,
      sourceContentLicenseId: fixture.sourceLicenseId,
    });
    await store.decideRenewal({
      actorUserId: fixture.creatorId,
      correlationId: randomUUID(),
      decision: 'accept',
      renewalId: renewal.id,
    });
    const intent = await store.beginRenewalFunding({
      actorUserId: fixture.ownerId,
      correlationId: randomUUID(),
      fundingIntentPublicId: `rfi_race_${randomUUID()}`,
      renewalId: renewal.id,
    });
    const inputFor = (label: string) => ({
      correlationId: randomUUID(),
      fundedAt: new Date(),
      fundingIntentId: intent.id,
      fundingSnapshotPublicId: `rfs_${label}_${randomUUID()}`,
      invoiceProviderObjectId: `in_${label}_${randomUUID()}`,
      invoiceProviderReferencePublicId: `ppr_invoice_${label}_${randomUUID()}`,
      licensePublicId: `lic_${label}_${randomUUID()}`,
      payablePublicId: `rpay_${label}_${randomUUID()}`,
      paymentIntentProviderObjectId: `pi_${label}_${randomUUID()}`,
      paymentIntentProviderReferencePublicId: `ppr_pi_${label}_${randomUUID()}`,
      provider: 'stripe' as const,
      providerAccountReference: 'acct_synthetic_platform',
      providerEventId: `evt_${label}_${randomUUID()}`,
    });
    const attempts = await Promise.allSettled([
      store.recordAuthoritativeRenewalFunding(inputFor('one')),
      store.recordAuthoritativeRenewalFunding(inputFor('two')),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(
      (attempts.find((attempt) => attempt.status === 'rejected') as PromiseRejectedResult).reason,
    ).toMatchObject({ code: 'RIGHTS_TRANSITION_CONFLICT' });
    const proof = await pool.query<{ licenses: number; payables: number; snapshots: number }>(
      `SELECT
         (SELECT count(*)::int FROM content_licenses WHERE mission_assignment_id = $1 AND term_number = 2) AS licenses,
         (SELECT count(*)::int FROM content_license_renewal_payables WHERE content_license_renewal_id = $2) AS payables,
         (SELECT count(*)::int FROM content_license_renewal_funding_snapshots snapshot
           JOIN content_license_renewal_funding_intents intent
             ON intent.id = snapshot.content_license_renewal_funding_intent_id
          WHERE intent.content_license_renewal_id = $2) AS snapshots`,
      [fixture.missionAssignmentId, renewal.id],
    );
    expect(proof.rows[0]).toEqual({ licenses: 1, payables: 1, snapshots: 1 });
  });
});
