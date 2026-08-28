import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { migrationsDirectory } from '../scripts/migration-manifest.js';
import { IdentityTenantStore } from './tenant-store.js';

const databaseName = `local_missions_venue_contacts_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let store: IdentityTenantStore;

async function createUser(label: string) {
  return store.createUserWithIdentity({
    correlationId: randomUUID(),
    issuer: 'https://identity.local.test/v1',
    provider: 'apple',
    publicId: `usr_${label}_${randomUUID()}`,
    subject: `subject_${label}_${randomUUID()}`,
  });
}

async function createBusinessFixture(label: string) {
  const owner = await createUser(`${label}_owner`);
  const contactUser = await createUser(`${label}_contact`);
  const businessId = await store.createBusinessWithOwner({
    correlationId: randomUUID(),
    name: `${label} Synthetic Business`,
    ownerUserId: owner.id,
    publicId: `biz_${label}_${randomUUID()}`,
  });
  await store.addBusinessMembership({
    actorUserId: owner.id,
    businessId,
    correlationId: randomUUID(),
    role: 'venue_staff',
    userId: contactUser.id,
  });
  const location = await store.createBusinessLocation({
    actorUserId: owner.id,
    addressLine1: '100 Synthetic Way',
    businessId,
    city: 'Orlando',
    correlationId: randomUUID(),
    name: `${label} Venue`,
    postalCode: '32801',
    publicId: `loc_${label}_${randomUUID()}`,
    region: 'FL',
    timezone: 'America/New_York',
  });
  const membership = await pool.query<{ id: string }>(
    `SELECT id FROM business_memberships WHERE business_id = $1 AND user_id = $2`,
    [businessId, contactUser.id],
  );
  const businessMembershipId = membership.rows[0]?.id;
  if (!businessMembershipId) throw new Error('Synthetic venue membership was not created.');
  return { businessId, businessMembershipId, contactUser, location, owner };
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 8 });
  await migrate(drizzle(pool), { migrationsFolder: migrationsDirectory });
  store = new IdentityTenantStore(pool);
}, 30_000);

afterAll(async () => {
  await pool?.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('venue contacts against real PostgreSQL', () => {
  it('creates a privacy-safe same-business contact with history, audit, and timeline indexes', async () => {
    const fixture = await createBusinessFixture('create');
    const correlationId = randomUUID();
    const contact = await store.createVenueContact({
      actorUserId: fixture.owner.id,
      businessId: fixture.businessId,
      businessLocationId: fixture.location.id,
      businessMembershipId: fixture.businessMembershipId,
      correlationId,
      isPrimary: true,
      publicId: `vc_${randomUUID()}`,
    });

    expect(contact).toMatchObject({
      businessId: fixture.businessId,
      businessLocationId: fixture.location.id,
      businessMembershipId: fixture.businessMembershipId,
      isPrimary: true,
      status: 'active',
      version: 1,
    });
    const proof = await pool.query<{
      audit_count: number;
      history_count: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM venue_contact_status_history
           WHERE venue_contact_id = $1 AND to_status = 'active' AND contact_version = 1)
           AS history_count,
         (SELECT count(*)::int FROM audit_events
           WHERE subject_id = $1 AND action = 'venue-contact.created' AND correlation_id = $2)
           AS audit_count`,
      [contact.id, correlationId],
    );
    expect(proof.rows[0]).toEqual({ audit_count: 1, history_count: 1 });

    const privateColumns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'venue_contacts'
          AND column_name ~* '(email|phone|address|postal)'`,
    );
    expect(privateColumns.rows).toEqual([]);
    const indexes = await pool.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN ('venue_contact_status_history_timeline_idx',
                            'audit_events_subject_timeline_idx')
        ORDER BY indexname`,
    );
    expect(indexes.rows).toHaveLength(2);
    expect(indexes.rows.every((row) => row.indexdef.includes('occurred_at'))).toBe(true);
  });

  it('rejects cross-tenant actors and mismatched venue membership scope', async () => {
    const first = await createBusinessFixture('scope_a');
    const second = await createBusinessFixture('scope_b');

    await expect(
      store.createVenueContact({
        actorUserId: second.owner.id,
        businessId: first.businessId,
        businessLocationId: first.location.id,
        businessMembershipId: first.businessMembershipId,
        correlationId: randomUUID(),
        isPrimary: false,
        publicId: `vc_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'BUSINESS_ACCESS_DENIED', httpStatus: 403 });
    await expect(
      store.createVenueContact({
        actorUserId: first.owner.id,
        businessId: first.businessId,
        businessLocationId: first.location.id,
        businessMembershipId: second.businessMembershipId,
        correlationId: randomUUID(),
        isPrimary: false,
        publicId: `vc_${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'BUSINESS_ACCESS_DENIED', httpStatus: 403 });
    await expect(
      pool.query(
        `INSERT INTO venue_contacts (
           public_id, business_id, business_location_id, business_membership_id
         ) VALUES ($1,$2,$3,$4)`,
        [
          `vc_direct_${randomUUID()}`,
          first.businessId,
          first.location.id,
          second.businessMembershipId,
        ],
      ),
    ).rejects.toThrow(/active same-business location and membership/);
  });

  it('allows exactly one winner when two members race for primary contact', async () => {
    const fixture = await createBusinessFixture('primary_race');
    const secondContactUser = await createUser('primary_race_second_contact');
    await store.addBusinessMembership({
      actorUserId: fixture.owner.id,
      businessId: fixture.businessId,
      correlationId: randomUUID(),
      role: 'venue_staff',
      userId: secondContactUser.id,
    });
    const secondMembership = await pool.query<{ id: string }>(
      `SELECT id FROM business_memberships WHERE business_id = $1 AND user_id = $2`,
      [fixture.businessId, secondContactUser.id],
    );
    const secondMembershipId = secondMembership.rows[0]?.id;
    if (!secondMembershipId) throw new Error('Second venue membership was not created.');

    const attempts = await Promise.allSettled(
      [fixture.businessMembershipId, secondMembershipId].map((businessMembershipId) =>
        store.createVenueContact({
          actorUserId: fixture.owner.id,
          businessId: fixture.businessId,
          businessLocationId: fixture.location.id,
          businessMembershipId,
          correlationId: randomUUID(),
          isPrimary: true,
          publicId: `vc_${randomUUID()}`,
        }),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'VENUE_CONTACT_CONFLICT', httpStatus: 409 }),
      status: 'rejected',
    });
    const persisted = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM venue_contacts
        WHERE business_location_id = $1 AND status = 'active' AND is_primary = true`,
      [fixture.location.id],
    );
    expect(persisted.rows[0]?.count).toBe(1);
  });

  it('uses optimistic concurrency for revocation and keeps contacts and history immutable', async () => {
    const fixture = await createBusinessFixture('revoke');
    const contact = await store.createVenueContact({
      actorUserId: fixture.owner.id,
      businessId: fixture.businessId,
      businessLocationId: fixture.location.id,
      businessMembershipId: fixture.businessMembershipId,
      correlationId: randomUUID(),
      isPrimary: true,
      publicId: `vc_${randomUUID()}`,
    });
    const attempts = await Promise.allSettled([
      store.revokeVenueContact({
        actorUserId: fixture.owner.id,
        correlationId: randomUUID(),
        expectedVersion: 1,
        venueContactId: contact.id,
      }),
      store.revokeVenueContact({
        actorUserId: fixture.owner.id,
        correlationId: randomUUID(),
        expectedVersion: 1,
        venueContactId: contact.id,
      }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((attempt) => attempt.status === 'rejected')).toMatchObject({
      reason: expect.objectContaining({ code: 'VENUE_CONTACT_CONFLICT', httpStatus: 409 }),
      status: 'rejected',
    });
    const proof = await pool.query<{
      audit_count: number;
      history_count: number;
      status: string;
      version: number;
    }>(
      `SELECT vc.status, vc.version,
         (SELECT count(*)::int FROM venue_contact_status_history WHERE venue_contact_id = vc.id)
           AS history_count,
         (SELECT count(*)::int FROM audit_events WHERE subject_id = vc.id)
           AS audit_count
       FROM venue_contacts vc WHERE vc.id = $1`,
      [contact.id],
    );
    expect(proof.rows[0]).toEqual({
      audit_count: 2,
      history_count: 2,
      status: 'revoked',
      version: 2,
    });
    await expect(
      pool.query(
        `UPDATE venue_contacts
            SET status = 'active', revoked_at = NULL, version = version + 1, updated_at = now()
          WHERE id = $1`,
        [contact.id],
      ),
    ).rejects.toThrow(/Illegal venue contact status transition/);
    await expect(
      pool.query(`DELETE FROM venue_contacts WHERE id = $1`, [contact.id]),
    ).rejects.toThrow(/cannot be deleted/);
    await expect(
      pool.query(
        `UPDATE venue_contact_status_history SET reason = 'rewritten' WHERE venue_contact_id = $1`,
        [contact.id],
      ),
    ).rejects.toThrow(/history is immutable/);
  });
});
