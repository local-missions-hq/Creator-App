import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabaseUrl } from '../scripts/local-database.js';
import { MissionApplicationStore } from './mission-application-store.js';
import { NotificationStore } from './notification-store.js';

const migrationsBeforeNotifications = [
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
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const notificationMigrations = [
  '0010_wide_lady_ursula.sql',
  '0011_perpetual_ender_wiggin.sql',
  '0012_notification_preference_history_backfill.sql',
].map((name) => fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)));
const databaseName = `local_missions_m3_notifications_${randomUUID().replaceAll('-', '')}`;
const baseUrl = new URL(getLocalDatabaseUrl());
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;
const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
let pool: Pool;
let missionStore: MissionApplicationStore;
let store: NotificationStore;
let platformAdminId: string;
let upgradePreserved = false;

type MissionFixture = {
  applicationId: string;
  businessId: string;
  campaignId: string;
  creatorId: string;
  locationId: string;
  missionAssignmentId?: string;
  missionSlotId: string;
  outsiderId: string;
  ownerId: string;
};

async function applyMigration(path: string): Promise<void> {
  const migration = await readFile(path, 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) {
    if (statement.trim()) await pool.query(statement);
  }
}

async function insertUser(label: string): Promise<string> {
  const user = await pool.query<{ id: string }>(
    `INSERT INTO users (public_id) VALUES ($1) RETURNING id`,
    [`usr_notification_${label}_${randomUUID()}`],
  );
  const id = user.rows[0]?.id;
  if (!id) throw new Error('Synthetic notification user insert returned no row.');
  return id;
}

async function createMissionFixture(label: string): Promise<MissionFixture> {
  const ownerId = await insertUser(`${label}_owner`);
  const creatorId = await insertUser(`${label}_creator`);
  const outsiderId = await insertUser(`${label}_outsider`);
  const business = await pool.query<{ id: string }>(
    `INSERT INTO businesses (public_id, name) VALUES ($1,$2) RETURNING id`,
    [`biz_notification_${label}_${randomUUID()}`, `Synthetic ${label} Business`],
  );
  const businessId = business.rows[0]?.id;
  if (!businessId) throw new Error('Synthetic notification business insert returned no row.');
  await pool.query(
    `INSERT INTO business_memberships (business_id, user_id, role, status)
     VALUES ($1,$2,'owner','active')`,
    [businessId, ownerId],
  );
  const location = await pool.query<{ id: string }>(
    `INSERT INTO business_locations (
       public_id, business_id, name, address_line_1, city, region, postal_code, timezone
     ) VALUES ($1,$2,'Synthetic Venue','100 Synthetic Way','Orlando','FL','32801',
               'America/New_York') RETURNING id`,
    [`loc_notification_${label}_${randomUUID()}`, businessId],
  );
  const locationId = location.rows[0]?.id;
  if (!locationId) throw new Error('Synthetic notification location insert returned no row.');
  const template = await pool.query<{ id: string }>(
    `INSERT INTO mission_templates (code, version, name, checklist_schema)
     VALUES ('visit_create',$1,$2,'{"type":"object"}'::jsonb) RETURNING id`,
    [Math.floor(Math.random() * 1_000_000) + 100, `Notification ${label} Template`],
  );
  const templateId = template.rows[0]?.id;
  if (!templateId) throw new Error('Synthetic notification template insert returned no row.');
  const campaign = await pool.query<{ id: string }>(
    `INSERT INTO campaigns (
       public_id, business_id, title, creator_reward_pool_minor, platform_fee_minor,
       total_due_minor, currency, slot_count, status
     ) VALUES ($1,$2,'Synthetic notification campaign',5000,750,5750,'USD',1,'published')
     RETURNING id`,
    [`cmp_notification_${label}_${randomUUID()}`, businessId],
  );
  const campaignId = campaign.rows[0]?.id;
  if (!campaignId) throw new Error('Synthetic notification campaign insert returned no row.');
  const brief = await pool.query<{ id: string }>(
    `INSERT INTO campaign_brief_versions (
       campaign_id, version, mission_template_id,
       plain_language_brief, checklist, created_by
     ) VALUES ($1,1,$2,'Complete the synthetic objective checklist.',
               '{"photos":5}'::jsonb,$3) RETURNING id`,
    [campaignId, templateId, ownerId],
  );
  const briefId = brief.rows[0]?.id;
  if (!briefId) throw new Error('Synthetic notification brief insert returned no row.');
  const slot = await pool.query<{ id: string }>(
    `INSERT INTO mission_slots (
       public_id, campaign_id, ordinal, type, base_reward_minor, reach_bonus_minor,
       contract_add_on_bonus_minor, bonus_reward_minor, reward_minor, currency, status
     ) VALUES ($1,$2,1,'community',5000,0,0,0,5000,'USD','reserved') RETURNING id`,
    [`slot_notification_${label}_${randomUUID()}`, campaignId],
  );
  const missionSlotId = slot.rows[0]?.id;
  if (!missionSlotId) throw new Error('Synthetic notification slot insert returned no row.');
  const application = await pool.query<{ id: string }>(
    `INSERT INTO mission_applications (public_id, campaign_id, creator_user_id, status)
     VALUES ($1,$2,$3,'submitted') RETURNING id`,
    [`app_notification_${label}_${randomUUID()}`, campaignId, creatorId],
  );
  const applicationId = application.rows[0]?.id;
  if (!applicationId) throw new Error('Synthetic notification application insert returned no row.');
  await pool.query(
    `INSERT INTO slot_reservations (mission_slot_id, application_id, status)
     VALUES ($1,$2,'active')`,
    [missionSlotId, applicationId],
  );
  return {
    applicationId,
    businessId,
    campaignId,
    creatorId,
    locationId,
    missionSlotId,
    outsiderId,
    ownerId,
  };
}

async function acceptAndAssign(
  fixture: MissionFixture,
  label: string,
): Promise<MissionFixture & { missionAssignmentId: string }> {
  await missionStore.acceptApplication({
    actorUserId: fixture.ownerId,
    applicationId: fixture.applicationId,
    correlationId: randomUUID(),
  });
  const brief = await pool.query<{ id: string }>(
    `SELECT id FROM campaign_brief_versions WHERE campaign_id = $1`,
    [fixture.campaignId],
  );
  const assignment = await pool.query<{ id: string }>(
    `INSERT INTO mission_assignments (
       public_id, application_id, campaign_id, campaign_brief_version_id,
       mission_slot_id, creator_user_id, business_location_id, window_starts_at,
       window_ends_at, timezone, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,now() + interval '1 day',
               now() + interval '1 day 2 hours','America/New_York',$8) RETURNING id`,
    [
      `asn_notification_${label}_${randomUUID()}`,
      fixture.applicationId,
      fixture.campaignId,
      brief.rows[0]?.id,
      fixture.missionSlotId,
      fixture.creatorId,
      fixture.locationId,
      fixture.ownerId,
    ],
  );
  const missionAssignmentId = assignment.rows[0]?.id;
  if (!missionAssignmentId) throw new Error('Synthetic notification assignment returned no row.');
  return { ...fixture, missionAssignmentId };
}

async function drainLocalOutbox(): Promise<void> {
  for (;;) {
    const claim = await store.claimNext({ workerId: 'notification-local-drain' });
    if (!claim) return;
    await store.completeClaimLocally({
      correlationId: randomUUID(),
      lockToken: claim.lockToken,
      outboxId: claim.outboxId,
    });
  }
}

beforeAll(async () => {
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  pool = new Pool({ connectionString: testUrl.toString(), max: 20 });
  for (const migration of migrationsBeforeNotifications) await applyMigration(migration);
  const upgradePublicId = `usr_notification_upgrade_${randomUUID()}`;
  await pool.query(`INSERT INTO users (public_id) VALUES ($1)`, [upgradePublicId]);
  for (const migration of notificationMigrations) await applyMigration(migration);
  upgradePreserved =
    (await pool.query(`SELECT 1 FROM users WHERE public_id = $1`, [upgradePublicId])).rowCount ===
    1;
  missionStore = new MissionApplicationStore(pool);
  store = new NotificationStore(pool);
}, 30_000);

beforeEach(async () => {
  await pool.query(
    `TRUNCATE audit_events, idempotency_records, users, businesses, mission_templates CASCADE`,
  );
  platformAdminId = await insertUser('platform_admin');
  await pool.query(
    `INSERT INTO platform_staff_memberships (public_id, user_id, role, status)
     VALUES ($1,$2,'admin','active')`,
    [`staff_notification_admin_${randomUUID()}`, platformAdminId],
  );
});

afterAll(async () => {
  if (pool) await pool.end();
  await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await adminPool.end();
});

describe.sequential('NotificationStore', () => {
  it('upgrades prior data into a minimized immutable notification schema', async () => {
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE 'notification%'
           OR table_schema = 'public' AND table_name = 'in_app_notifications'
        ORDER BY table_name`,
    );
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'in_app_notifications',
      'notification_delivery_attempts',
      'notification_events',
      'notification_outbox_messages',
      'notification_outbox_status_history',
      'notification_preference_history',
      'notification_preferences',
    ]);
    const forbiddenColumns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN (
            'notification_events','notification_delivery_attempts',
            'notification_outbox_messages','in_app_notifications'
          )
          AND column_name ~ '(phone|email_address|device_token|provider_payload|provider_response|body_text|media_url)'`,
    );
    expect(forbiddenColumns.rowCount).toBe(0);
    expect(upgradePreserved).toBe(true);

    const event = await store.enqueueEvent({
      aggregateId: platformAdminId,
      aggregateType: 'user',
      audience: 'account_owner',
      correlationId: randomUUID(),
      deduplicationKey: `security:${randomUUID()}`,
      recipientUserId: platformAdminId,
      type: 'security_alert',
    });
    await expect(
      pool.query(`UPDATE notification_events SET template_key = 'changed' WHERE id = $1`, [
        event.id,
      ]),
    ).rejects.toThrow(/immutable/);
    await expect(
      pool.query(`DELETE FROM in_app_notifications WHERE notification_event_id = $1`, [event.id]),
    ).rejects.toThrow(/hard-deleted/);
  });

  it('commits mission acceptance, event, outbox, in-app notice, history, and audit atomically', async () => {
    const fixture = await createMissionFixture('atomic');
    const correlationId = randomUUID();
    await missionStore.acceptApplication({
      actorUserId: fixture.ownerId,
      applicationId: fixture.applicationId,
      correlationId,
    });
    const proof = await pool.query<{
      application_xmin: string;
      event_xmin: string;
      in_app_xmin: string;
      outbox_xmin: string;
      status: string;
    }>(
      `SELECT application.status, application.xmin::text AS application_xmin,
              event.xmin::text AS event_xmin, outbox.xmin::text AS outbox_xmin,
              notice.xmin::text AS in_app_xmin
         FROM mission_applications application
         JOIN notification_events event
           ON event.aggregate_type = 'mission_application' AND event.aggregate_id = application.id
         JOIN notification_outbox_messages outbox ON outbox.notification_event_id = event.id
         JOIN in_app_notifications notice ON notice.notification_event_id = event.id
        WHERE application.id = $1`,
      [fixture.applicationId],
    );
    expect(proof.rows[0]).toMatchObject({ status: 'accepted' });
    expect(
      new Set(Object.values(proof.rows[0] ?? {}).filter((value) => value !== 'accepted')).size,
    ).toBe(1);
    expect(
      (
        await pool.query(
          `SELECT 1 FROM audit_events
            WHERE correlation_id = $1
              AND action IN ('mission-application.accepted','notification.event-enqueued')`,
          [correlationId],
        )
      ).rowCount,
    ).toBe(2);

    const rollback = await createMissionFixture('rollback');
    const conflictingPublicId = `nte_accept_${rollback.applicationId.replaceAll('-', '')}`;
    await store.enqueueEvent({
      aggregateId: rollback.creatorId,
      aggregateType: 'user',
      audience: 'account_owner',
      correlationId: randomUUID(),
      deduplicationKey: `security:${randomUUID()}`,
      publicId: conflictingPublicId,
      recipientUserId: rollback.creatorId,
      type: 'security_alert',
    });
    await expect(
      missionStore.acceptApplication({
        actorUserId: rollback.ownerId,
        applicationId: rollback.applicationId,
        correlationId: randomUUID(),
      }),
    ).rejects.toThrow();
    expect(
      (
        await pool.query<{ status: string }>(
          `SELECT status FROM mission_applications WHERE id = $1`,
          [rollback.applicationId],
        )
      ).rows[0]?.status,
    ).toBe('submitted');
    expect(
      (
        await pool.query(
          `SELECT 1 FROM mission_application_status_history
            WHERE application_id = $1 AND to_status = 'accepted'`,
          [rollback.applicationId],
        )
      ).rowCount,
    ).toBe(0);
  });

  it('deduplicates events and enforces recipient, role, tenant, and in-app isolation', async () => {
    const fixture = await acceptAndAssign(await createMissionFixture('scope'), 'scope');
    const input = {
      aggregateId: fixture.missionAssignmentId,
      aggregateType: 'mission_assignment' as const,
      audience: 'creator' as const,
      businessId: fixture.businessId,
      correlationId: randomUUID(),
      deduplicationKey: 'mission-reminder:day-before',
      recipientUserId: fixture.creatorId,
      type: 'mission_reminder' as const,
    };
    const [first, second] = await Promise.all([
      store.enqueueEvent(input),
      store.enqueueEvent(input),
    ]);
    expect(first.id).toBe(second.id);
    expect(
      (
        await pool.query(
          `SELECT 1 FROM notification_events
            WHERE recipient_user_id = $1 AND deduplication_key = $2`,
          [fixture.creatorId, input.deduplicationKey],
        )
      ).rowCount,
    ).toBe(1);
    await expect(
      store.enqueueEvent({
        ...input,
        deduplicationKey: 'wrong-creator',
        recipientUserId: fixture.outsiderId,
      }),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_EVENT_INVALID' });

    const businessEvent = await store.enqueueEvent({
      aggregateId: fixture.missionAssignmentId,
      aggregateType: 'mission_assignment',
      audience: 'business_member',
      businessId: fixture.businessId,
      correlationId: randomUUID(),
      deduplicationKey: 'dispute:opened',
      recipientUserId: fixture.ownerId,
      type: 'dispute_update',
    });
    expect(businessEvent.recipientUserId).toBe(fixture.ownerId);
    await expect(
      store.listInAppNotifications({ actorUserId: fixture.outsiderId, userId: fixture.creatorId }),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_ACCESS_DENIED' });
    const creatorInbox = await store.listInAppNotifications({
      actorUserId: fixture.creatorId,
      userId: fixture.creatorId,
    });
    expect(creatorInbox.map((notice) => notice.type)).toEqual([
      'mission_reminder',
      'mission_accepted',
    ]);
    expect(creatorInbox.every((notice) => notice.deepLinkRoute.startsWith('/notifications/'))).toBe(
      true,
    );
    expect(JSON.stringify(creatorInbox)).not.toMatch(/Synthetic notification campaign|32801|5000/);
  });

  it('honors opt-out, allows one worker claim, and records only local no-send outcomes', async () => {
    const fixture = await acceptAndAssign(await createMissionFixture('local'), 'local');
    await drainLocalOutbox();
    await store.setPreference({
      actorUserId: fixture.creatorId,
      category: 'mission_reminder',
      channel: 'push',
      correlationId: randomUUID(),
      enabled: false,
      userId: fixture.creatorId,
    });
    const event = await store.enqueueEvent({
      aggregateId: fixture.missionAssignmentId,
      aggregateType: 'mission_assignment',
      audience: 'creator',
      businessId: fixture.businessId,
      correlationId: randomUUID(),
      deduplicationKey: 'submission:due-local',
      recipientUserId: fixture.creatorId,
      type: 'submission_due',
    });
    const claims = await Promise.all([
      store.claimNext({ workerId: 'notification-worker-a' }),
      store.claimNext({ workerId: 'notification-worker-b' }),
    ]);
    const claim = claims.find((candidate) => candidate?.id === event.id);
    expect(claim).toBeTruthy();
    expect(claims.filter((candidate) => candidate?.id === event.id)).toHaveLength(1);
    if (!claim) throw new Error('Expected notification claim is missing.');
    await store.completeClaimLocally({
      correlationId: randomUUID(),
      lockToken: claim.lockToken,
      outboxId: claim.outboxId,
    });
    const attempts = await pool.query<{
      adapter_receipt_id: string | null;
      channel: string;
      error_code: string | null;
      status: string;
    }>(
      `SELECT channel, status, error_code, adapter_receipt_id
         FROM notification_delivery_attempts
        WHERE notification_outbox_message_id = $1 ORDER BY channel`,
      [claim.outboxId],
    );
    expect(attempts.rows).toEqual([
      expect.objectContaining({
        channel: 'push',
        error_code: 'USER_OPT_OUT',
        status: 'suppressed',
      }),
      expect.objectContaining({ channel: 'email', error_code: null, status: 'no_send' }),
    ]);
    expect(
      attempts.rows.find((attempt) => attempt.channel === 'email')?.adapter_receipt_id,
    ).toMatch(/^local-no-send:/);
    expect(
      (
        await pool.query(
          `SELECT 1 FROM notification_preference_history
            WHERE notification_preference_id = (
              SELECT id FROM notification_preferences
               WHERE user_id = $1 AND category = 'mission_reminder' AND channel = 'push'
            )`,
          [fixture.creatorId],
        )
      ).rowCount,
    ).toBe(1);
    await expect(
      new NotificationStore(pool, 'public', null).completeClaimLocally({
        correlationId: randomUUID(),
        lockToken: claim.lockToken,
        outboxId: claim.outboxId,
      }),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_TRANSITION_CONFLICT' });
  });

  it('schedules exponential retry without raw errors and rejects stale claim completion', async () => {
    const event = await store.enqueueEvent({
      aggregateId: platformAdminId,
      aggregateType: 'user',
      audience: 'account_owner',
      correlationId: randomUUID(),
      deduplicationKey: `retry:${randomUUID()}`,
      recipientUserId: platformAdminId,
      type: 'security_alert',
    });
    const claim = await store.claimNext({ workerId: 'notification-retry-worker' });
    expect(claim?.id).toBe(event.id);
    if (!claim) throw new Error('Expected retry claim is missing.');
    const beforeFailure = new Date();
    const retry = await store.recordClaimFailure({
      correlationId: randomUUID(),
      errorCode: 'TRANSIENT_ADAPTER_FAILURE',
      lockToken: claim.lockToken,
      outboxId: claim.outboxId,
      retryable: true,
    });
    expect(retry.status).toBe('pending');
    expect(retry.availableAt.getTime()).toBeGreaterThanOrEqual(beforeFailure.getTime() + 55_000);
    await expect(
      store.completeClaimLocally({
        correlationId: randomUUID(),
        lockToken: claim.lockToken,
        outboxId: claim.outboxId,
      }),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_CLAIM_INVALID' });
    const errors = await pool.query<{ error_code: string }>(
      `SELECT DISTINCT error_code FROM notification_delivery_attempts
        WHERE notification_outbox_message_id = $1`,
      [claim.outboxId],
    );
    expect(errors.rows.map((row) => row.error_code)).toEqual(['TRANSIENT_ADAPTER_FAILURE']);
  });

  it('dead-letters non-retryable work and permits only audited admin replay', async () => {
    const outsiderId = await insertUser('replay_outsider');
    const event = await store.enqueueEvent({
      aggregateId: platformAdminId,
      aggregateType: 'user',
      audience: 'account_owner',
      correlationId: randomUUID(),
      deduplicationKey: `dead:${randomUUID()}`,
      recipientUserId: platformAdminId,
      type: 'security_alert',
    });
    const claim = await store.claimNext({ workerId: 'notification-dead-letter-worker' });
    expect(claim?.id).toBe(event.id);
    if (!claim) throw new Error('Expected dead-letter claim is missing.');
    const dead = await store.recordClaimFailure({
      correlationId: randomUUID(),
      errorCode: 'INVALID_DELIVERY_CONFIGURATION',
      lockToken: claim.lockToken,
      outboxId: claim.outboxId,
      retryable: false,
    });
    expect(dead.status).toBe('dead_letter');
    await expect(
      store.replayDeadLetter({
        actorUserId: outsiderId,
        correlationId: randomUUID(),
        outboxId: claim.outboxId,
        reason: 'Investigated and corrected configuration',
      }),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_ACCESS_DENIED' });
    const replay = await store.replayDeadLetter({
      actorUserId: platformAdminId,
      correlationId: randomUUID(),
      outboxId: claim.outboxId,
      reason: 'Investigated and corrected configuration',
    });
    expect(replay.status).toBe('pending');
    expect(
      (
        await pool.query(
          `SELECT 1 FROM audit_events
            WHERE subject_id = $1 AND action = 'notification.outbox-replayed'
              AND actor_id = $2`,
          [claim.outboxId, platformAdminId],
        )
      ).rowCount,
    ).toBe(1);
    const history = await pool.query<{ to_status: string }>(
      `SELECT to_status FROM notification_outbox_status_history
        WHERE notification_outbox_message_id = $1 ORDER BY outbox_version`,
      [claim.outboxId],
    );
    expect(history.rows.map((row) => row.to_status)).toEqual([
      'pending',
      'processing',
      'dead_letter',
      'pending',
    ]);
  });

  it('keeps durable in-app state recipient-scoped and acknowledgment-only', async () => {
    const recipientId = await insertUser('inbox_recipient');
    const outsiderId = await insertUser('inbox_outsider');
    await store.enqueueEvent({
      aggregateId: recipientId,
      aggregateType: 'user',
      audience: 'account_owner',
      correlationId: randomUUID(),
      deduplicationKey: `inbox:${randomUUID()}`,
      recipientUserId: recipientId,
      type: 'security_alert',
    });
    const inbox = await store.listInAppNotifications({
      actorUserId: recipientId,
      userId: recipientId,
    });
    expect(inbox).toHaveLength(1);
    await store.markInAppRead({
      actorUserId: recipientId,
      inAppNotificationId: inbox[0]?.inAppId ?? '',
    });
    await store.markInAppRead({
      actorUserId: recipientId,
      inAppNotificationId: inbox[0]?.inAppId ?? '',
    });
    expect(
      (
        await pool.query<{ read_at: Date | null }>(
          `SELECT read_at FROM in_app_notifications WHERE id = $1`,
          [inbox[0]?.inAppId],
        )
      ).rows[0]?.read_at,
    ).toBeInstanceOf(Date);
    await expect(
      store.markInAppRead({
        actorUserId: outsiderId,
        inAppNotificationId: inbox[0]?.inAppId ?? '',
      }),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_NOT_FOUND' });
    await expect(
      store.setPreference({
        actorUserId: recipientId,
        category: 'security',
        channel: 'email',
        correlationId: randomUUID(),
        enabled: false,
        userId: recipientId,
      }),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_PREFERENCE_INVALID' });
  });
});
