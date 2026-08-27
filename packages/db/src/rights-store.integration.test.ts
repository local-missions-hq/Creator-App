import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { RightsStore } from './rights-store.js';

const migrationsBeforeRights = [
  '0000_giant_snowbird.sql',
  '0001_empty_tyrannus.sql',
  '0002_material_rachel_grey.sql',
  '0003_orange_tempest.sql',
  '0004_handy_gideon.sql',
  '0005_huge_agent_brand.sql',
  '0006_dapper_mordo.sql',
  '0007_thick_sharon_ventura.sql',
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const rightsMigration = fileURLToPath(
  new URL('../drizzle/0008_fair_sheva_callister.sql', import.meta.url),
);
const slotBonusMigration = fileURLToPath(
  new URL('../drizzle/0009_nifty_scorpion.sql', import.meta.url),
);
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

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 10 });
  for (const migration of migrationsBeforeRights) await applyMigration(migration);
  await pool.query(`INSERT INTO users (public_id) VALUES ('usr_rights_upgrade_proof')`);
  await applyMigration(rightsMigration);
  await applyMigration(slotBonusMigration);
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
    expect(view[0]).toMatchObject({ isCurrentlyUsable: false, status: 'expired' });
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
});
