import { randomUUID } from 'node:crypto';

import type {
  NotificationAggregateType,
  NotificationAudience,
  NotificationCategory,
  NotificationConflictCode,
  NotificationEventType,
  NotificationOutboxStatus,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

const externalChannels = ['push', 'email'] as const;
type ExternalNotificationChannel = (typeof externalChannels)[number];
type LocalNotificationEnvironment = 'local' | 'test';

const categoryByType: Record<NotificationEventType, NotificationCategory> = {
  check_in_reminder: 'mission_reminder',
  dispute_update: 'dispute',
  mission_accepted: 'mission_action',
  mission_approved: 'mission_action',
  mission_reminder: 'mission_reminder',
  payout_available: 'money',
  revision_requested: 'mission_action',
  security_alert: 'security',
  submission_due: 'mission_reminder',
};

export type NotificationPreferenceRecord = {
  category: NotificationCategory;
  channel: ExternalNotificationChannel;
  enabled: boolean;
  id: string;
  publicId: string;
  userId: string;
  version: number;
};

export type NotificationEventRecord = {
  aggregateId: string;
  aggregateType: NotificationAggregateType;
  audience: NotificationAudience;
  businessId: string | null;
  category: NotificationCategory;
  correlationId: string;
  deepLinkRoute: string;
  id: string;
  publicId: string;
  recipientUserId: string;
  templateKey: string;
  type: NotificationEventType;
};

export type NotificationOutboxClaim = NotificationEventRecord & {
  attemptCount: number;
  lockToken: string;
  lockedUntil: Date;
  maxAttempts: number;
  outboxId: string;
  outboxPublicId: string;
  outboxVersion: number;
};

export type InAppNotificationRecord = NotificationEventRecord & {
  archivedAt: Date | null;
  createdAt: Date;
  inAppId: string;
  inAppPublicId: string;
  readAt: Date | null;
};

export type NotificationOutboxResult = {
  attemptCount: number;
  availableAt: Date;
  status: NotificationOutboxStatus;
  version: number;
};

export class NotificationError extends Error {
  constructor(
    readonly code: NotificationConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

type PreferenceRow = QueryResultRow & {
  category: NotificationCategory;
  channel: ExternalNotificationChannel;
  enabled: boolean;
  id: string;
  public_id: string;
  user_id: string;
  version: number;
};

type EventRow = QueryResultRow & {
  aggregate_id: string;
  aggregate_type: NotificationAggregateType;
  audience: NotificationAudience;
  business_id: string | null;
  category: NotificationCategory;
  correlation_id: string;
  deep_link_route: string;
  id: string;
  public_id: string;
  recipient_user_id: string;
  template_key: string;
  type: NotificationEventType;
};

type ClaimRow = EventRow & {
  attempt_count: number;
  lock_token: string;
  locked_until: Date;
  max_attempts: number;
  outbox_id: string;
  outbox_public_id: string;
  outbox_version: number;
};

function quoteSchema(schemaName: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Database schema name must be a safe lowercase PostgreSQL identifier.');
  }
  return `"${schemaName}"`;
}

function postgresConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('constraint' in error)) return undefined;
  return typeof error.constraint === 'string' ? error.constraint : undefined;
}

function toPreference(row: PreferenceRow): NotificationPreferenceRecord {
  return {
    category: row.category,
    channel: row.channel,
    enabled: row.enabled,
    id: row.id,
    publicId: row.public_id,
    userId: row.user_id,
    version: row.version,
  };
}

function toEvent(row: EventRow): NotificationEventRecord {
  return {
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    audience: row.audience,
    businessId: row.business_id,
    category: row.category,
    correlationId: row.correlation_id,
    deepLinkRoute: row.deep_link_route,
    id: row.id,
    publicId: row.public_id,
    recipientUserId: row.recipient_user_id,
    templateKey: row.template_key,
    type: row.type,
  };
}

export class NotificationStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
    private readonly localEnvironment: LocalNotificationEnvironment | null = 'local',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async setPreference(input: {
    actorUserId: string;
    category: NotificationCategory;
    channel: ExternalNotificationChannel;
    correlationId: string;
    enabled: boolean;
    publicId?: string;
    userId: string;
  }): Promise<NotificationPreferenceRecord> {
    if (input.actorUserId !== input.userId) {
      throw new NotificationError(
        'NOTIFICATION_ACCESS_DENIED',
        403,
        'A user can change only their own notification preferences.',
      );
    }
    if (input.category === 'security' && !input.enabled) {
      throw new NotificationError(
        'NOTIFICATION_PREFERENCE_INVALID',
        409,
        'Required security notifications cannot be disabled.',
      );
    }
    return this.withTransaction(async (client) => {
      const user = await client.query(`SELECT 1 FROM users WHERE id = $1 AND status = 'active'`, [
        input.userId,
      ]);
      if (user.rowCount !== 1) {
        throw new NotificationError(
          'NOTIFICATION_ACCESS_DENIED',
          403,
          'Notification preferences require the active account owner.',
        );
      }
      const current = await client.query<PreferenceRow>(
        `SELECT id, public_id, user_id, category, channel, enabled, version
           FROM notification_preferences
          WHERE user_id = $1 AND category = $2 AND channel = $3
          FOR UPDATE`,
        [input.userId, input.category, input.channel],
      );
      const existing = current.rows[0];
      if (existing?.enabled === input.enabled) return toPreference(existing);

      const result = existing
        ? await client.query<PreferenceRow>(
            `UPDATE notification_preferences
                SET enabled = $2, version = version + 1, updated_at = now()
              WHERE id = $1
              RETURNING id, public_id, user_id, category, channel, enabled, version`,
            [existing.id, input.enabled],
          )
        : await client.query<PreferenceRow>(
            `INSERT INTO notification_preferences (
               public_id, user_id, category, channel, enabled
             ) VALUES ($1,$2,$3,$4,$5)
             RETURNING id, public_id, user_id, category, channel, enabled, version`,
            [
              input.publicId ?? `npf_${randomUUID()}`,
              input.userId,
              input.category,
              input.channel,
              input.enabled,
            ],
          );
      const preference = result.rows[0];
      if (!preference) throw new Error('Notification preference mutation returned no row.');
      await this.appendAudit(client, {
        action: 'notification.preference-changed',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: {
          category: input.category,
          channel: input.channel,
          enabled: input.enabled,
          version: preference.version,
        },
        subjectId: preference.id,
        subjectType: 'notification-preference',
      });
      return toPreference(preference);
    });
  }

  async enqueueEvent(input: {
    aggregateId: string;
    aggregateType: NotificationAggregateType;
    audience: NotificationAudience;
    businessId?: string;
    correlationId: string;
    deduplicationKey: string;
    publicId?: string;
    recipientUserId: string;
    type: NotificationEventType;
  }): Promise<NotificationEventRecord> {
    const publicId = input.publicId ?? `nte_${randomUUID()}`;
    try {
      return await this.withTransaction(async (client) => {
        const category = categoryByType[input.type];
        const result = await client.query<EventRow>(
          `INSERT INTO notification_events (
             public_id, type, category, audience, recipient_user_id, business_id,
             aggregate_type, aggregate_id, template_key, deep_link_route,
             deduplication_key, correlation_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id, public_id, type, category, audience, recipient_user_id,
                     business_id, aggregate_type, aggregate_id, template_key,
                     deep_link_route, correlation_id`,
          [
            publicId,
            input.type,
            category,
            input.audience,
            input.recipientUserId,
            input.businessId ?? null,
            input.aggregateType,
            input.aggregateId,
            `notification.${input.type}.v1`,
            `/notifications/${publicId}`,
            input.deduplicationKey,
            input.correlationId,
          ],
        );
        const event = result.rows[0];
        if (!event) throw new Error('Notification event insert returned no row.');
        await this.appendAudit(client, {
          action: 'notification.event-enqueued',
          actorId: null,
          actorType: 'service',
          correlationId: input.correlationId,
          details: { audience: input.audience, category, type: input.type },
          subjectId: event.id,
          subjectType: 'notification-event',
        });
        return toEvent(event);
      });
    } catch (error) {
      if (postgresConstraint(error) === 'notification_events_recipient_dedup_uq') {
        return this.withTransaction(async (client) => {
          const existing = await client.query<EventRow>(
            `SELECT id, public_id, type, category, audience, recipient_user_id,
                    business_id, aggregate_type, aggregate_id, template_key,
                    deep_link_route, correlation_id
               FROM notification_events
              WHERE recipient_user_id = $1 AND type = $2 AND deduplication_key = $3`,
            [input.recipientUserId, input.type, input.deduplicationKey],
          );
          const event = existing.rows[0];
          if (!event) throw error;
          return toEvent(event);
        });
      }
      throw new NotificationError(
        'NOTIFICATION_EVENT_INVALID',
        409,
        'Notification event recipient, tenant, aggregate, or template is invalid.',
      );
    }
  }

  async claimNext(input: {
    leaseSeconds?: number;
    workerId: string;
  }): Promise<NotificationOutboxClaim | null> {
    const leaseSeconds = input.leaseSeconds ?? 60;
    if (
      !/^[a-z0-9][a-z0-9:_-]{2,79}$/.test(input.workerId) ||
      !Number.isInteger(leaseSeconds) ||
      leaseSeconds < 15 ||
      leaseSeconds > 300
    ) {
      throw new NotificationError(
        'NOTIFICATION_CLAIM_INVALID',
        409,
        'Worker identity or lease duration is invalid.',
      );
    }
    return this.withTransaction(async (client) => {
      const due = await client.query<{
        attempt_count: number;
        id: string;
        status: NotificationOutboxStatus;
        version: number;
      }>(
        `SELECT id, status, attempt_count, version
           FROM notification_outbox_messages
          WHERE (status = 'pending' AND available_at <= now())
             OR (status = 'processing' AND locked_until <= now())
          ORDER BY available_at, created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1`,
      );
      const candidate = due.rows[0];
      if (!candidate) return null;
      const lockToken = randomUUID();
      const claimed = await client.query<ClaimRow>(
        `UPDATE notification_outbox_messages outbox
            SET status = 'processing', attempt_count = attempt_count + 1,
                lock_token = $2, locked_by = $3,
                locked_until = now() + ($4::int * interval '1 second'),
                version = version + 1, updated_at = now()
           FROM notification_events event
          WHERE outbox.id = $1 AND event.id = outbox.notification_event_id
          RETURNING outbox.id AS outbox_id, outbox.public_id AS outbox_public_id,
                    outbox.attempt_count, outbox.max_attempts,
                    outbox.lock_token, outbox.locked_until, outbox.version AS outbox_version,
                    event.id, event.public_id, event.type, event.category, event.audience,
                    event.recipient_user_id, event.business_id, event.aggregate_type,
                    event.aggregate_id, event.template_key, event.deep_link_route,
                    event.correlation_id`,
        [candidate.id, lockToken, input.workerId, leaseSeconds],
      );
      const claim = claimed.rows[0];
      if (!claim) throw new Error('Notification outbox claim returned no row.');
      await this.appendOutboxHistory(client, {
        attemptCount: claim.attempt_count,
        fromStatus: candidate.status,
        outboxId: candidate.id,
        reason:
          candidate.status === 'processing'
            ? 'Expired worker lease reclaimed'
            : 'Worker claimed due notification',
        toStatus: 'processing',
        version: claim.outbox_version,
      });
      return {
        ...toEvent(claim),
        attemptCount: claim.attempt_count,
        lockToken: claim.lock_token,
        lockedUntil: claim.locked_until,
        maxAttempts: claim.max_attempts,
        outboxId: claim.outbox_id,
        outboxPublicId: claim.outbox_public_id,
        outboxVersion: claim.outbox_version,
      };
    });
  }

  async completeClaimLocally(input: {
    correlationId: string;
    lockToken: string;
    outboxId: string;
  }): Promise<NotificationOutboxResult> {
    if (!this.localEnvironment) {
      throw new NotificationError(
        'NOTIFICATION_TRANSITION_CONFLICT',
        409,
        'The no-send adapter is unavailable outside local and test environments.',
      );
    }
    return this.withTransaction(async (client) => {
      const current = await this.selectActiveClaim(client, input.outboxId, input.lockToken);
      const enabledByChannel = await this.externalPreferenceState(
        client,
        current.recipient_user_id,
        current.category,
      );
      for (const channel of externalChannels) {
        const enabled = enabledByChannel[channel];
        await client.query(
          `INSERT INTO notification_delivery_attempts (
             public_id, notification_outbox_message_id, attempt_number, channel,
             status, error_code, adapter_receipt_id, started_at, completed_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())`,
          [
            `nda_${randomUUID()}`,
            current.id,
            current.attempt_count,
            channel,
            enabled ? 'no_send' : 'suppressed',
            enabled ? null : 'USER_OPT_OUT',
            enabled
              ? `${this.localEnvironment}-no-send:${current.public_id}:${current.attempt_count}:${channel}`
              : null,
          ],
        );
      }
      const updated = await client.query<{
        attempt_count: number;
        available_at: Date;
        status: NotificationOutboxStatus;
        version: number;
      }>(
        `UPDATE notification_outbox_messages
            SET status = 'completed', lock_token = NULL, locked_by = NULL,
                locked_until = NULL, completed_at = now(), version = version + 1,
                updated_at = now()
          WHERE id = $1
          RETURNING status, attempt_count, available_at, version`,
        [current.id],
      );
      const outbox = updated.rows[0];
      if (!outbox) throw new Error('Local notification completion returned no row.');
      await this.appendOutboxHistory(client, {
        attemptCount: outbox.attempt_count,
        fromStatus: 'processing',
        outboxId: current.id,
        reason: 'Local no-send adapter completed without external delivery',
        toStatus: 'completed',
        version: outbox.version,
      });
      await this.appendAudit(client, {
        action: 'notification.outbox-local-no-send-completed',
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: {
          channels: externalChannels.map((channel) => ({
            channel,
            outcome: enabledByChannel[channel] ? 'no_send' : 'suppressed',
          })),
        },
        subjectId: current.id,
        subjectType: 'notification-outbox',
      });
      return {
        attemptCount: outbox.attempt_count,
        availableAt: outbox.available_at,
        status: outbox.status,
        version: outbox.version,
      };
    });
  }

  async recordClaimFailure(input: {
    correlationId: string;
    errorCode: string;
    lockToken: string;
    outboxId: string;
    retryable?: boolean;
  }): Promise<NotificationOutboxResult> {
    if (!/^[A-Z0-9_]{1,80}$/.test(input.errorCode)) {
      throw new NotificationError(
        'NOTIFICATION_TRANSITION_CONFLICT',
        409,
        'Notification failures retain only a bounded safe error code.',
      );
    }
    return this.withTransaction(async (client) => {
      const current = await this.selectActiveClaim(client, input.outboxId, input.lockToken);
      const enabledByChannel = await this.externalPreferenceState(
        client,
        current.recipient_user_id,
        current.category,
      );
      for (const channel of externalChannels) {
        const enabled = enabledByChannel[channel];
        await client.query(
          `INSERT INTO notification_delivery_attempts (
             public_id, notification_outbox_message_id, attempt_number, channel,
             status, error_code, started_at, completed_at
           ) VALUES ($1,$2,$3,$4,$5,$6,now(),now())`,
          [
            `nda_${randomUUID()}`,
            current.id,
            current.attempt_count,
            channel,
            enabled ? 'failed' : 'suppressed',
            enabled ? input.errorCode : 'USER_OPT_OUT',
          ],
        );
      }
      const deadLetter = input.retryable === false || current.attempt_count >= current.max_attempts;
      const backoffSeconds = [60, 300, 1_800, 7_200, 21_600][
        Math.min(current.attempt_count - 1, 4)
      ];
      const updated = await client.query<{
        attempt_count: number;
        available_at: Date;
        status: NotificationOutboxStatus;
        version: number;
      }>(
        `UPDATE notification_outbox_messages
            SET status = $2::notification_outbox_status,
                lock_token = NULL, locked_by = NULL, locked_until = NULL,
                available_at = CASE WHEN $2::notification_outbox_status = 'pending'
                  THEN now() + ($3::int * interval '1 second') ELSE available_at END,
                dead_lettered_at = CASE
                  WHEN $2::notification_outbox_status = 'dead_letter' THEN now() ELSE NULL END,
                version = version + 1, updated_at = now()
          WHERE id = $1
          RETURNING status, attempt_count, available_at, version`,
        [current.id, deadLetter ? 'dead_letter' : 'pending', backoffSeconds],
      );
      const outbox = updated.rows[0];
      if (!outbox) throw new Error('Notification failure transition returned no row.');
      await this.appendOutboxHistory(client, {
        attemptCount: outbox.attempt_count,
        fromStatus: 'processing',
        outboxId: current.id,
        reason: deadLetter
          ? input.retryable === false
            ? 'Non-retryable delivery failure'
            : 'Retry budget exhausted'
          : 'Safe retry backoff scheduled',
        toStatus: outbox.status,
        version: outbox.version,
      });
      await this.appendAudit(client, {
        action: deadLetter
          ? 'notification.outbox-dead-lettered'
          : 'notification.outbox-retry-scheduled',
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: {
          attemptCount: outbox.attempt_count,
          errorCode: input.errorCode,
          retryable: input.retryable !== false,
        },
        subjectId: current.id,
        subjectType: 'notification-outbox',
      });
      return {
        attemptCount: outbox.attempt_count,
        availableAt: outbox.available_at,
        status: outbox.status,
        version: outbox.version,
      };
    });
  }

  async replayDeadLetter(input: {
    actorUserId: string;
    correlationId: string;
    outboxId: string;
    reason: string;
  }): Promise<NotificationOutboxResult> {
    if (input.reason.trim().length < 8) {
      throw new NotificationError(
        'NOTIFICATION_DEAD_LETTER_REQUIRED',
        409,
        'Dead-letter replay requires an operator reason.',
      );
    }
    return this.withTransaction(async (client) => {
      const administrator = await client.query(
        `SELECT 1 FROM platform_staff_memberships
          WHERE user_id = $1 AND role = 'admin' AND status = 'active'`,
        [input.actorUserId],
      );
      if (administrator.rowCount !== 1) {
        throw new NotificationError(
          'NOTIFICATION_ACCESS_DENIED',
          403,
          'Only an active platform administrator can replay dead-lettered notifications.',
        );
      }
      const current = await client.query<{
        attempt_count: number;
        id: string;
        max_attempts: number;
        status: NotificationOutboxStatus;
        version: number;
      }>(
        `SELECT id, status, attempt_count, max_attempts, version
           FROM notification_outbox_messages WHERE id = $1 FOR UPDATE`,
        [input.outboxId],
      );
      const outbox = current.rows[0];
      if (!outbox || outbox.status !== 'dead_letter') {
        throw new NotificationError(
          'NOTIFICATION_DEAD_LETTER_REQUIRED',
          409,
          'Only a dead-lettered notification can be replayed.',
        );
      }
      const updated = await client.query<{
        attempt_count: number;
        available_at: Date;
        status: NotificationOutboxStatus;
        version: number;
      }>(
        `UPDATE notification_outbox_messages
            SET status = 'pending', available_at = now(), dead_lettered_at = NULL,
                replay_count = replay_count + 1,
                max_attempts = greatest(max_attempts + 3, attempt_count + 3),
                version = version + 1, updated_at = now()
          WHERE id = $1
          RETURNING status, attempt_count, available_at, version`,
        [input.outboxId],
      );
      const replayed = updated.rows[0];
      if (!replayed) throw new Error('Notification replay returned no row.');
      await this.appendOutboxHistory(client, {
        actorId: input.actorUserId,
        actorType: 'user',
        attemptCount: replayed.attempt_count,
        fromStatus: 'dead_letter',
        outboxId: input.outboxId,
        reason: input.reason.trim(),
        toStatus: 'pending',
        version: replayed.version,
      });
      await this.appendAudit(client, {
        action: 'notification.outbox-replayed',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { reason: input.reason.trim() },
        subjectId: input.outboxId,
        subjectType: 'notification-outbox',
      });
      return {
        attemptCount: replayed.attempt_count,
        availableAt: replayed.available_at,
        status: replayed.status,
        version: replayed.version,
      };
    });
  }

  async listInAppNotifications(input: {
    actorUserId: string;
    userId: string;
  }): Promise<InAppNotificationRecord[]> {
    if (input.actorUserId !== input.userId) {
      throw new NotificationError(
        'NOTIFICATION_ACCESS_DENIED',
        403,
        'In-app notifications are visible only to their recipient.',
      );
    }
    return this.withTransaction(async (client) => {
      const result = await client.query<
        EventRow & {
          archived_at: Date | null;
          created_at: Date;
          in_app_id: string;
          in_app_public_id: string;
          read_at: Date | null;
        }
      >(
        `SELECT event.id, event.public_id, event.type, event.category, event.audience,
                event.recipient_user_id, event.business_id, event.aggregate_type,
                event.aggregate_id, event.template_key, event.deep_link_route,
                event.correlation_id, notice.id AS in_app_id,
                notice.public_id AS in_app_public_id, notice.read_at,
                notice.archived_at, notice.created_at
           FROM in_app_notifications notice
           JOIN notification_events event ON event.id = notice.notification_event_id
          WHERE notice.recipient_user_id = $1 AND notice.archived_at IS NULL
          ORDER BY notice.created_at DESC, notice.id DESC`,
        [input.userId],
      );
      return result.rows.map((row) => ({
        ...toEvent(row),
        archivedAt: row.archived_at,
        createdAt: row.created_at,
        inAppId: row.in_app_id,
        inAppPublicId: row.in_app_public_id,
        readAt: row.read_at,
      }));
    });
  }

  async markInAppRead(input: { actorUserId: string; inAppNotificationId: string }): Promise<void> {
    await this.withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE in_app_notifications
            SET read_at = coalesce(read_at, now()), updated_at = now()
          WHERE id = $1 AND recipient_user_id = $2`,
        [input.inAppNotificationId, input.actorUserId],
      );
      if (updated.rowCount !== 1) {
        throw new NotificationError(
          'NOTIFICATION_NOT_FOUND',
          404,
          'In-app notification was not found for this recipient.',
        );
      }
    });
  }

  private async selectActiveClaim(
    client: PoolClient,
    outboxId: string,
    lockToken: string,
  ): Promise<{
    attempt_count: number;
    category: NotificationCategory;
    id: string;
    max_attempts: number;
    public_id: string;
    recipient_user_id: string;
  }> {
    const current = await client.query<{
      attempt_count: number;
      category: NotificationCategory;
      id: string;
      max_attempts: number;
      public_id: string;
      recipient_user_id: string;
    }>(
      `SELECT outbox.id, outbox.public_id, outbox.attempt_count, outbox.max_attempts,
              event.recipient_user_id, event.category
         FROM notification_outbox_messages outbox
         JOIN notification_events event ON event.id = outbox.notification_event_id
        WHERE outbox.id = $1 AND outbox.status = 'processing'
          AND outbox.lock_token = $2 AND outbox.locked_until > now()
        FOR UPDATE OF outbox`,
      [outboxId, lockToken],
    );
    const claim = current.rows[0];
    if (!claim) {
      throw new NotificationError(
        'NOTIFICATION_CLAIM_INVALID',
        409,
        'Notification worker claim is missing, expired, or owned by another worker.',
      );
    }
    return claim;
  }

  private async externalPreferenceState(
    client: PoolClient,
    userId: string,
    category: NotificationCategory,
  ): Promise<Record<ExternalNotificationChannel, boolean>> {
    const preferences = await client.query<{
      channel: ExternalNotificationChannel;
      enabled: boolean;
    }>(
      `SELECT channel, enabled FROM notification_preferences
        WHERE user_id = $1 AND category = $2 AND channel IN ('push','email')`,
      [userId, category],
    );
    const state: Record<ExternalNotificationChannel, boolean> = { email: true, push: true };
    for (const preference of preferences.rows) state[preference.channel] = preference.enabled;
    return state;
  }

  private async appendOutboxHistory(
    client: PoolClient,
    input: {
      actorId?: string;
      actorType?: 'service' | 'user';
      attemptCount: number;
      fromStatus: NotificationOutboxStatus;
      outboxId: string;
      reason: string;
      toStatus: NotificationOutboxStatus;
      version: number;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO notification_outbox_status_history (
         notification_outbox_message_id, from_status, to_status, outbox_version,
         attempt_count, actor_id, actor_type, reason
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.outboxId,
        input.fromStatus,
        input.toStatus,
        input.version,
        input.attemptCount,
        input.actorId ?? null,
        input.actorType ?? 'service',
        input.reason,
      ],
    );
  }

  private async appendAudit(
    client: PoolClient,
    input: {
      action: string;
      actorId: string | null;
      actorType: 'service' | 'user';
      correlationId: string;
      details: Record<string, unknown>;
      subjectId: string;
      subjectType: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_events (
         actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        input.actorId,
        input.actorType,
        input.action,
        input.correlationId,
        input.subjectType,
        input.subjectId,
        JSON.stringify(input.details),
      ],
    );
  }

  private async withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${this.quotedSchema}`);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
