import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { migrationsDirectory } from '../scripts/migration-manifest.js';
import { AuthorizationPolicyStore } from './authorization-policy-store.js';

const databaseName = `local_missions_authorization_matrix_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const ids = {
  admin: '10000000-0000-4000-8000-000000000008',
  applicationA: '30000000-0000-4000-8000-000000000001',
  applicationB: '30000000-0000-4000-8000-000000000002',
  assignmentA: '40000000-0000-4000-8000-000000000001',
  assignmentB: '40000000-0000-4000-8000-000000000002',
  businessA: '20000000-0000-4000-8000-000000000001',
  businessB: '20000000-0000-4000-8000-000000000002',
  creatorA: '10000000-0000-4000-8000-000000000001',
  creatorB: '10000000-0000-4000-8000-000000000002',
  disputeA: '60000000-0000-4000-8000-000000000001',
  finance: '10000000-0000-4000-8000-000000000007',
  ownerA: '10000000-0000-4000-8000-000000000003',
  ownerB: '10000000-0000-4000-8000-000000000004',
  support: '10000000-0000-4000-8000-000000000005',
  submissionA: '50000000-0000-4000-8000-000000000001',
  submissionB: '50000000-0000-4000-8000-000000000002',
  venueA: '10000000-0000-4000-8000-000000000009',
  venueB: '10000000-0000-4000-8000-000000000010',
} as const;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let policy: AuthorizationPolicyStore;

async function createFixture(): Promise<void> {
  await pool.query(`
    INSERT INTO users (id, public_id) VALUES
      ('${ids.creatorA}', 'usr_matrix_creator_a'),
      ('${ids.creatorB}', 'usr_matrix_creator_b'),
      ('${ids.ownerA}', 'usr_matrix_owner_a'),
      ('${ids.ownerB}', 'usr_matrix_owner_b'),
      ('${ids.support}', 'usr_matrix_support'),
      ('${ids.finance}', 'usr_matrix_finance'),
      ('${ids.admin}', 'usr_matrix_admin'),
      ('${ids.venueA}', 'usr_matrix_venue_a'),
      ('${ids.venueB}', 'usr_matrix_venue_b');

    INSERT INTO businesses (id, public_id, name) VALUES
      ('${ids.businessA}', 'biz_matrix_a', 'Synthetic Business A'),
      ('${ids.businessB}', 'biz_matrix_b', 'Synthetic Business B');

    INSERT INTO business_memberships (id, business_id, user_id, role, status) VALUES
      ('21000000-0000-4000-8000-000000000001', '${ids.businessA}', '${ids.ownerA}', 'owner', 'active'),
      ('21000000-0000-4000-8000-000000000002', '${ids.businessB}', '${ids.ownerB}', 'owner', 'active'),
      ('21000000-0000-4000-8000-000000000003', '${ids.businessA}', '${ids.venueA}', 'venue_staff', 'active'),
      ('21000000-0000-4000-8000-000000000004', '${ids.businessB}', '${ids.venueB}', 'venue_staff', 'active');

    INSERT INTO platform_staff_memberships (public_id, user_id, role, status) VALUES
      ('staff_matrix_support', '${ids.support}', 'support_agent', 'active'),
      ('staff_matrix_finance', '${ids.finance}', 'finance_operator', 'active'),
      ('staff_matrix_admin', '${ids.admin}', 'admin', 'active');

    INSERT INTO business_locations (
      id, public_id, business_id, name, address_line_1, city, region, postal_code, timezone
    ) VALUES
      ('22000000-0000-4000-8000-000000000001', 'loc_matrix_a', '${ids.businessA}',
       'Synthetic Venue A', '100 Private A Way', 'Orlando', 'FL', '32801', 'America/New_York'),
      ('22000000-0000-4000-8000-000000000002', 'loc_matrix_b', '${ids.businessB}',
       'Synthetic Venue B', '200 Private B Way', 'Orlando', 'FL', '32802', 'America/New_York');

    INSERT INTO campaigns (
      id, public_id, business_id, title, status, creator_reward_pool_minor,
      platform_fee_minor, total_due_minor, currency, slot_count
    ) VALUES
      ('23000000-0000-4000-8000-000000000001', 'cmp_matrix_a', '${ids.businessA}',
       'Synthetic Campaign A', 'published', 5000, 750, 5750, 'USD', 1),
      ('23000000-0000-4000-8000-000000000002', 'cmp_matrix_b', '${ids.businessB}',
       'Synthetic Campaign B', 'published', 5000, 750, 5750, 'USD', 1);

    INSERT INTO mission_templates (id, code, version, name, checklist_schema)
      VALUES ('24000000-0000-4000-8000-000000000001', 'visit_create', 1,
              'Visit and Create', '{"type":"object"}'::jsonb);

    INSERT INTO campaign_brief_versions (
      id, campaign_id, version, mission_template_id, plain_language_brief, checklist, created_by
    ) VALUES
      ('25000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
       1, '24000000-0000-4000-8000-000000000001', 'Synthetic brief A', '{}'::jsonb, '${ids.ownerA}'),
      ('25000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002',
       1, '24000000-0000-4000-8000-000000000001', 'Synthetic brief B', '{}'::jsonb, '${ids.ownerB}');

    INSERT INTO deliverable_requirements (
      id, public_id, campaign_brief_version_id, ordinal, type, required_count,
      allowed_mime_types, objective_description
    ) VALUES
      ('26000000-0000-4000-8000-000000000001', 'req_matrix_a',
       '25000000-0000-4000-8000-000000000001', 1, 'photo', 1,
       '["image/jpeg"]'::jsonb, 'One synthetic photo'),
      ('26000000-0000-4000-8000-000000000002', 'req_matrix_b',
       '25000000-0000-4000-8000-000000000002', 1, 'photo', 1,
       '["image/jpeg"]'::jsonb, 'One synthetic photo');

    INSERT INTO mission_slots (
      id, public_id, campaign_id, ordinal, type, status, base_reward_minor,
      bonus_reward_minor, reward_minor, currency
    ) VALUES
      ('27000000-0000-4000-8000-000000000001', 'slot_matrix_a',
       '23000000-0000-4000-8000-000000000001', 1, 'community', 'accepted', 5000, 0, 5000, 'USD'),
      ('27000000-0000-4000-8000-000000000002', 'slot_matrix_b',
       '23000000-0000-4000-8000-000000000002', 1, 'community', 'accepted', 5000, 0, 5000, 'USD');

    INSERT INTO mission_applications (id, public_id, campaign_id, creator_user_id, status) VALUES
      ('${ids.applicationA}', 'app_matrix_a', '23000000-0000-4000-8000-000000000001',
       '${ids.creatorA}', 'accepted'),
      ('${ids.applicationB}', 'app_matrix_b', '23000000-0000-4000-8000-000000000002',
       '${ids.creatorB}', 'accepted');

    INSERT INTO mission_assignments (
      id, public_id, application_id, campaign_id, campaign_brief_version_id,
      mission_slot_id, creator_user_id, business_location_id, window_starts_at,
      window_ends_at, timezone, status, created_by
    ) VALUES
      ('${ids.assignmentA}', 'asn_matrix_a', '${ids.applicationA}',
       '23000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001',
       '27000000-0000-4000-8000-000000000001', '${ids.creatorA}',
       '22000000-0000-4000-8000-000000000001', '2026-08-28T15:00:00Z',
       '2026-08-28T17:00:00Z', 'America/New_York', 'checked_in', '${ids.ownerA}'),
      ('${ids.assignmentB}', 'asn_matrix_b', '${ids.applicationB}',
       '23000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000002',
       '27000000-0000-4000-8000-000000000002', '${ids.creatorB}',
       '22000000-0000-4000-8000-000000000002', '2026-08-28T15:00:00Z',
       '2026-08-28T17:00:00Z', 'America/New_York', 'checked_in', '${ids.ownerB}');

    INSERT INTO submission_attempts (
      id, public_id, mission_assignment_id, attempt_number, status, submitted_at, review_deadline_at
    ) VALUES
      ('${ids.submissionA}', 'sub_matrix_a', '${ids.assignmentA}', 1, 'under_review',
       '2026-08-28T16:00:00Z', '2026-08-30T16:00:00Z'),
      ('${ids.submissionB}', 'sub_matrix_b', '${ids.assignmentB}', 1, 'under_review',
       '2026-08-28T16:00:00Z', '2026-08-30T16:00:00Z');

    INSERT INTO submission_disputes (
      id, public_id, mission_assignment_id, submission_attempt_id,
      deliverable_requirement_id, opened_by, opened_by_user_id,
      reason_code, explanation, status
    ) VALUES (
      '${ids.disputeA}', 'dsp_matrix_a', '${ids.assignmentA}', '${ids.submissionA}',
      '26000000-0000-4000-8000-000000000001', 'business', '${ids.ownerA}',
      'suspected_fraud', 'Synthetic support investigation fixture', 'open'
    );

    INSERT INTO venue_staff_assignments (
      public_id, business_membership_id, business_location_id,
      window_starts_at, window_ends_at, status, created_by
    ) VALUES
      ('vsa_matrix_a', '21000000-0000-4000-8000-000000000003',
       '22000000-0000-4000-8000-000000000001', '2026-08-28T15:00:00Z',
       '2026-08-28T17:00:00Z', 'active', '${ids.ownerA}'),
      ('vsa_matrix_b', '21000000-0000-4000-8000-000000000004',
       '22000000-0000-4000-8000-000000000002', '2026-08-28T15:00:00Z',
       '2026-08-28T17:00:00Z', 'active', '${ids.ownerB}');
  `);
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 8 });
  await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory });
  policy = new AuthorizationPolicyStore(pool);
  await createFixture();
}, 30_000);

afterAll(async () => {
  await pool?.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('M4 authorization matrix against real PostgreSQL', () => {
  it('requires an authenticated server actor before any private resource query', async () => {
    await expect(
      policy.readCreatorApplication({ actorUserId: null, applicationPublicId: 'app_matrix_a' }),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED', httpStatus: 401 });
    await expect(
      policy.readSupportDispute({ actorUserId: null, disputePublicId: 'dsp_matrix_a' }),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED', httpStatus: 401 });
  });

  it('lets a Creator read only their own application and submission', async () => {
    await expect(
      policy.readCreatorApplication({
        actorUserId: ids.creatorA,
        applicationPublicId: 'app_matrix_a',
      }),
    ).resolves.toMatchObject({ campaignPublicId: 'cmp_matrix_a', publicId: 'app_matrix_a' });
    await expect(
      policy.readCreatorSubmission({
        actorUserId: ids.creatorA,
        submissionPublicId: 'sub_matrix_a',
      }),
    ).resolves.toMatchObject({ applicationPublicId: 'app_matrix_a', publicId: 'sub_matrix_a' });
    for (const attempt of [
      policy.readCreatorApplication({
        actorUserId: ids.creatorA,
        applicationPublicId: 'app_matrix_b',
      }),
      policy.readCreatorSubmission({
        actorUserId: ids.creatorA,
        submissionPublicId: 'sub_matrix_b',
      }),
    ]) {
      await expect(attempt).rejects.toMatchObject({
        code: 'AUTHORIZATION_NOT_FOUND',
        httpStatus: 404,
      });
    }
  });

  it('conceals every cross-business campaign from the other active owner', async () => {
    await expect(
      policy.readBusinessCampaign({ actorUserId: ids.ownerA, campaignPublicId: 'cmp_matrix_a' }),
    ).resolves.toMatchObject({ businessPublicId: 'biz_matrix_a', publicId: 'cmp_matrix_a' });
    await expect(
      policy.readBusinessCampaign({ actorUserId: ids.ownerA, campaignPublicId: 'cmp_matrix_b' }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
    await expect(
      policy.readBusinessCampaign({ actorUserId: ids.ownerB, campaignPublicId: 'cmp_matrix_a' }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
  });

  it('returns only an assigned Venue Staff location and date window', async () => {
    const projection = await policy.readVenueStaffAssignment({
      actorUserId: ids.venueA,
      assignmentPublicId: 'vsa_matrix_a',
      now: new Date('2026-08-28T16:00:00Z'),
    });
    expect(projection).toMatchObject({
      city: 'Orlando',
      locationName: 'Synthetic Venue A',
      publicId: 'vsa_matrix_a',
      region: 'FL',
    });
    expect(Object.keys(projection).sort()).toEqual(
      ['city', 'locationName', 'publicId', 'region', 'windowEndsAt', 'windowStartsAt'].sort(),
    );
    expect(JSON.stringify(projection)).not.toContain('Private A Way');
    await expect(
      policy.readVenueStaffAssignment({
        actorUserId: ids.venueA,
        assignmentPublicId: 'vsa_matrix_b',
        now: new Date('2026-08-28T16:00:00Z'),
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
    await expect(
      policy.readVenueStaffAssignment({
        actorUserId: ids.venueA,
        assignmentPublicId: 'vsa_matrix_a',
        now: new Date('2026-08-29T16:00:00Z'),
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
  });

  it('gives Support a read-only investigation projection and requires separate Finance authority', async () => {
    const projection = await policy.readSupportDispute({
      actorUserId: ids.support,
      disputePublicId: 'dsp_matrix_a',
    });
    expect(projection).toMatchObject({
      publicId: 'dsp_matrix_a',
      reasonCode: 'suspected_fraud',
      status: 'open',
    });
    expect(Object.keys(projection).sort()).toEqual(
      ['openedAt', 'publicId', 'reasonCode', 'status'].sort(),
    );
    await expect(policy.authorizeFinancialStateMutation(ids.support)).rejects.toMatchObject({
      code: 'FINANCIAL_ACCESS_DENIED',
      httpStatus: 403,
    });
    await expect(policy.authorizeFinancialStateMutation(ids.finance)).resolves.toBeUndefined();
    await expect(
      policy.readSupportDispute({ actorUserId: ids.admin, disputePublicId: 'dsp_matrix_a' }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
  });

  it('requires an active Admin, a bounded reason, and one high-priority override audit', async () => {
    const correlationId = randomUUID();
    await expect(
      policy.recordAdminOverride({
        actorUserId: ids.support,
        correlationId,
        reason: 'Synthetic documented exception for matrix testing.',
        subjectId: ids.disputeA,
        subjectType: 'submission-dispute',
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
    await expect(
      policy.recordAdminOverride({
        actorUserId: ids.admin,
        correlationId,
        reason: 'too short',
        subjectId: ids.disputeA,
        subjectType: 'submission-dispute',
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_OVERRIDE_INVALID', httpStatus: 409 });
    await policy.recordAdminOverride({
      actorUserId: ids.admin,
      correlationId,
      reason: 'Synthetic documented exception for matrix testing.',
      subjectId: ids.disputeA,
      subjectType: 'submission-dispute',
    });
    const proof = await pool.query<{ action: string; details: Record<string, string> }>(
      `SELECT action, details FROM audit_events
        WHERE correlation_id = $1 AND subject_id = $2`,
      [correlationId, ids.disputeA],
    );
    expect(proof.rows).toEqual([
      {
        action: 'authorization.admin-override',
        details: {
          priority: 'high',
          reason: 'Synthetic documented exception for matrix testing.',
        },
      },
    ]);
    await expect(
      pool.query(`UPDATE audit_events SET details = '{}'::jsonb WHERE correlation_id = $1`, [
        correlationId,
      ]),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('rechecks disabled-user state immediately and ignores role-shaped caller intent', async () => {
    await pool.query(`UPDATE users SET status = 'disabled' WHERE id IN ($1,$2)`, [
      ids.creatorA,
      ids.venueA,
    ]);
    await expect(
      policy.readCreatorApplication({
        actorUserId: ids.creatorA,
        applicationPublicId: 'app_matrix_a',
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
    await expect(
      policy.readVenueStaffAssignment({
        actorUserId: ids.venueA,
        assignmentPublicId: 'vsa_matrix_a',
        now: new Date('2026-08-28T16:00:00Z'),
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
    await expect(
      policy.readBusinessCampaign({ actorUserId: ids.support, campaignPublicId: 'cmp_matrix_a' }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_NOT_FOUND', httpStatus: 404 });
  });
});
