import { createHash, timingSafeEqual } from 'node:crypto';

import type {
  CheckInAccuracyClass,
  CheckInChallengeMethod,
  CheckInChallengeStatus,
  CheckInConflictCode,
  CheckInEventRecord,
  MissionAssignmentRecord,
  MissionAssignmentStatus,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

export class CheckInError extends Error {
  constructor(
    readonly code: CheckInConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'CheckInError';
  }
}

type MissionAssignmentRow = QueryResultRow & {
  application_id: string;
  business_location_id: string;
  campaign_id: string;
  creator_user_id: string;
  id: string;
  mission_slot_id: string;
  public_id: string;
  status: MissionAssignmentStatus;
  timezone: string;
  version: number;
  window_ends_at: Date;
  window_starts_at: Date;
};

type ChallengeRow = QueryResultRow &
  MissionAssignmentRow & {
    challenge_created_by: string;
    challenge_id: string;
    challenge_method: CheckInChallengeMethod;
    challenge_status: CheckInChallengeStatus;
    expires_at: Date;
    server_now: Date;
    token_hash: string;
  };

type CheckInEventRow = QueryResultRow & {
  accuracy_class: CheckInAccuracyClass;
  application_id: string;
  business_location_id: string;
  challenge_id: string;
  creator_user_id: string;
  id: string;
  mission_assignment_id: string;
  mission_slot_id: string;
  occurred_at: Date;
  public_id: string;
  verification_method: CheckInChallengeMethod;
};

function toMissionAssignmentRecord(row: MissionAssignmentRow): MissionAssignmentRecord {
  return {
    applicationId: row.application_id,
    businessLocationId: row.business_location_id,
    campaignId: row.campaign_id,
    creatorUserId: row.creator_user_id,
    id: row.id,
    missionSlotId: row.mission_slot_id,
    publicId: row.public_id,
    status: row.status,
    timezone: row.timezone,
    version: row.version,
    windowEndsAt: row.window_ends_at,
    windowStartsAt: row.window_starts_at,
  };
}

function toCheckInEventRecord(row: CheckInEventRow): CheckInEventRecord {
  return {
    accuracyClass: row.accuracy_class,
    applicationId: row.application_id,
    businessLocationId: row.business_location_id,
    challengeId: row.challenge_id,
    creatorUserId: row.creator_user_id,
    id: row.id,
    missionAssignmentId: row.mission_assignment_id,
    missionSlotId: row.mission_slot_id,
    occurredAt: row.occurred_at,
    publicId: row.public_id,
    verificationMethod: row.verification_method,
  };
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function hashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function postgresConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('constraint' in error)) return undefined;
  return typeof error.constraint === 'string' ? error.constraint : undefined;
}

function quoteSchema(schemaName: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Database schema name must be a safe lowercase PostgreSQL identifier.');
  }
  return `"${schemaName}"`;
}

export class CheckInStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async scheduleAcceptedApplication(input: {
    actorUserId: string;
    applicationId: string;
    businessLocationId: string;
    correlationId: string;
    publicId: string;
    timezone: string;
    windowEndsAt: Date;
    windowStartsAt: Date;
  }): Promise<MissionAssignmentRecord> {
    try {
      return await this.withTransaction(async (client) => {
        const accepted = await client.query<{
          application_id: string;
          business_location_id: string;
          campaign_id: string;
          creator_user_id: string;
          mission_slot_id: string;
        }>(
          `SELECT a.id AS application_id, a.campaign_id, a.creator_user_id,
                  r.mission_slot_id, l.id AS business_location_id
             FROM mission_applications a
             JOIN campaigns c ON c.id = a.campaign_id
             JOIN slot_reservations r ON r.application_id = a.id AND r.status = 'converted'
             JOIN mission_slots s ON s.id = r.mission_slot_id AND s.status = 'accepted'
             JOIN business_locations l ON l.id = $3 AND l.business_id = c.business_id
                                      AND l.is_active = true
            WHERE a.id = $1 AND a.status = 'accepted'
              AND EXISTS (
                SELECT 1 FROM business_memberships m
                 WHERE m.business_id = c.business_id AND m.user_id = $2
                   AND m.status = 'active' AND m.role IN ('owner', 'manager')
              )
            FOR UPDATE OF a, r, s, l`,
          [input.applicationId, input.actorUserId, input.businessLocationId],
        );
        const source = accepted.rows[0];
        if (!source) {
          throw new CheckInError(
            'CHECK_IN_ACCESS_DENIED',
            403,
            'Accepted application or venue is unavailable in the active business workspace.',
          );
        }
        if (input.windowEndsAt <= input.windowStartsAt || input.timezone.trim().length === 0) {
          throw new CheckInError(
            'MISSION_SCHEDULE_CONFLICT',
            409,
            'Mission window and timezone must define a valid schedule.',
          );
        }

        const result = await client.query<MissionAssignmentRow>(
          `INSERT INTO mission_assignments (
             public_id, application_id, campaign_id, mission_slot_id, creator_user_id,
             business_location_id, window_starts_at, window_ends_at, timezone, created_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, public_id, application_id, campaign_id, mission_slot_id,
                     creator_user_id, business_location_id, window_starts_at, window_ends_at,
                     timezone, status, version`,
          [
            input.publicId,
            source.application_id,
            source.campaign_id,
            source.mission_slot_id,
            source.creator_user_id,
            source.business_location_id,
            input.windowStartsAt,
            input.windowEndsAt,
            input.timezone,
            input.actorUserId,
          ],
        );
        const row = result.rows[0];
        if (!row) throw new Error('Mission assignment insert returned no row.');
        const assignment = toMissionAssignmentRecord(row);
        await client.query(
          `INSERT INTO mission_assignment_status_history (
             mission_assignment_id, from_status, to_status, assignment_version, actor_id, reason
           ) VALUES ($1, NULL, 'scheduled', 1, $2, 'Accepted mission scheduled')`,
          [assignment.id, input.actorUserId],
        );
        await this.appendAudit(client, {
          action: 'mission-assignment.scheduled',
          actorId: input.actorUserId,
          correlationId: input.correlationId,
          details: { locationId: assignment.businessLocationId, timezone: assignment.timezone },
          subjectId: assignment.id,
          subjectType: 'mission-assignment',
        });
        return assignment;
      });
    } catch (error) {
      if (
        ['mission_assignments_application_uq', 'mission_assignments_slot_uq'].includes(
          postgresConstraint(error) ?? '',
        )
      ) {
        throw new CheckInError(
          'MISSION_SCHEDULE_CONFLICT',
          409,
          'This accepted application or mission slot is already scheduled.',
        );
      }
      throw error;
    }
  }

  async assignVenueStaff(input: {
    actorUserId: string;
    businessLocationId: string;
    correlationId: string;
    publicId: string;
    staffUserId: string;
    windowEndsAt: Date;
    windowStartsAt: Date;
  }): Promise<string> {
    return this.withTransaction(async (client) => {
      if (input.windowEndsAt <= input.windowStartsAt) {
        throw new CheckInError(
          'MISSION_SCHEDULE_CONFLICT',
          409,
          'Venue Staff assignment requires a valid time window.',
        );
      }
      const membership = await client.query<{ id: string }>(
        `SELECT staff.id
           FROM business_locations l
           JOIN business_memberships manager
             ON manager.business_id = l.business_id AND manager.user_id = $2
            AND manager.status = 'active' AND manager.role IN ('owner', 'manager')
           JOIN business_memberships staff
             ON staff.business_id = l.business_id AND staff.user_id = $3
            AND staff.status = 'active' AND staff.role = 'venue_staff'
          WHERE l.id = $1 AND l.is_active = true
          FOR UPDATE OF l, staff`,
        [input.businessLocationId, input.actorUserId, input.staffUserId],
      );
      const row = membership.rows[0];
      if (!row) {
        throw new CheckInError(
          'VENUE_STAFF_ACCESS_DENIED',
          403,
          'Venue Staff assignment requires manager authority and active staff membership in the same business.',
        );
      }
      const result = await client.query<{ id: string }>(
        `INSERT INTO venue_staff_assignments (
           public_id, business_membership_id, business_location_id,
           window_starts_at, window_ends_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          input.publicId,
          row.id,
          input.businessLocationId,
          input.windowStartsAt,
          input.windowEndsAt,
          input.actorUserId,
        ],
      );
      const assignment = result.rows[0];
      if (!assignment) throw new Error('Venue Staff assignment insert returned no row.');
      await this.appendAudit(client, {
        action: 'venue-staff.assignment-created',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { locationId: input.businessLocationId, staffUserId: input.staffUserId },
        subjectId: assignment.id,
        subjectType: 'venue-staff-assignment',
      });
      return assignment.id;
    });
  }

  async issueChallenge(input: {
    actorUserId: string;
    correlationId: string;
    expiresAt: Date;
    fallbackReason?: string;
    method: CheckInChallengeMethod;
    missionAssignmentId: string;
    publicId: string;
    token: string;
  }): Promise<{ id: string; publicId: string }> {
    return this.withTransaction(async (client) => {
      if (input.token.length < 32) {
        throw new CheckInError(
          'CHECK_IN_CHALLENGE_INVALID',
          409,
          'Check-in challenges require a high-entropy token.',
        );
      }
      const assignmentResult = await client.query<MissionAssignmentRow & { server_now: Date }>(
        `SELECT ma.id, ma.public_id, ma.application_id, ma.campaign_id, ma.mission_slot_id,
                ma.creator_user_id, ma.business_location_id, ma.window_starts_at,
                ma.window_ends_at, ma.timezone, ma.status, ma.version, now() AS server_now
           FROM mission_assignments ma
           JOIN campaigns c ON c.id = ma.campaign_id
          WHERE ma.id = $1
            AND (
              EXISTS (
                SELECT 1 FROM business_memberships manager
                 WHERE manager.business_id = c.business_id AND manager.user_id = $2
                   AND manager.status = 'active' AND manager.role IN ('owner', 'manager')
              ) OR EXISTS (
                SELECT 1
                  FROM venue_staff_assignments vsa
                  JOIN business_memberships staff
                    ON staff.id = vsa.business_membership_id
                 WHERE vsa.business_location_id = ma.business_location_id
                   AND staff.business_id = c.business_id AND staff.user_id = $2
                   AND staff.status = 'active' AND staff.role = 'venue_staff'
                   AND vsa.status = 'active'
                   AND now() BETWEEN vsa.window_starts_at AND vsa.window_ends_at
              )
            )
          FOR UPDATE OF ma`,
        [input.missionAssignmentId, input.actorUserId],
      );
      const assignment = assignmentResult.rows[0];
      if (!assignment) {
        throw new CheckInError(
          'VENUE_STAFF_ACCESS_DENIED',
          403,
          'Actor is not authorized for this venue and mission window.',
        );
      }
      if (assignment.status !== 'scheduled') {
        throw new CheckInError(
          'CHECK_IN_ALREADY_RECORDED',
          409,
          'Mission assignment is no longer waiting for check-in.',
        );
      }
      const serverNow = assignment.server_now;
      const maximumExpiry = new Date(serverNow.getTime() + 5 * 60 * 1_000);
      if (
        serverNow < assignment.window_starts_at ||
        serverNow > assignment.window_ends_at ||
        input.expiresAt <= serverNow ||
        input.expiresAt > maximumExpiry ||
        input.expiresAt > assignment.window_ends_at
      ) {
        throw new CheckInError(
          'CHECK_IN_OUTSIDE_WINDOW',
          409,
          'Challenge must be issued during the server-controlled mission window and expire within five minutes.',
        );
      }
      if (
        (input.method === 'qr' && input.fallbackReason !== undefined) ||
        (input.method === 'staff_code' && !input.fallbackReason?.trim())
      ) {
        throw new CheckInError(
          'CHECK_IN_CHALLENGE_INVALID',
          409,
          'Staff-code fallback requires a reason; QR challenges cannot carry one.',
        );
      }

      await client.query(
        `UPDATE check_in_challenges
            SET status = 'revoked'
          WHERE mission_assignment_id = $1 AND status = 'active'`,
        [assignment.id],
      );
      const result = await client.query<{ id: string; public_id: string }>(
        `INSERT INTO check_in_challenges (
           public_id, mission_assignment_id, token_hash, method,
           fallback_reason, expires_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, public_id`,
        [
          input.publicId,
          assignment.id,
          tokenHash(input.token),
          input.method,
          input.fallbackReason ?? null,
          input.expiresAt,
          input.actorUserId,
        ],
      );
      const challenge = result.rows[0];
      if (!challenge) throw new Error('Check-in challenge insert returned no row.');
      await this.appendAudit(client, {
        action: `check-in-challenge.${input.method}-issued`,
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { assignmentId: assignment.id, expiresAt: input.expiresAt.toISOString() },
        subjectId: challenge.id,
        subjectType: 'check-in-challenge',
      });
      return { id: challenge.id, publicId: challenge.public_id };
    });
  }

  async consumeChallenge(input: {
    accuracyClass: CheckInAccuracyClass;
    businessLocationId: string;
    challengePublicId: string;
    correlationId: string;
    creatorUserId: string;
    eventPublicId: string;
    token: string;
  }): Promise<CheckInEventRecord> {
    try {
      return await this.withTransaction(async (client) => {
        const result = await client.query<ChallengeRow>(
          `SELECT ch.id AS challenge_id, ch.token_hash,
                  ch.method AS challenge_method, ch.status AS challenge_status,
                  ch.expires_at, ch.created_by AS challenge_created_by, now() AS server_now,
                  ma.id, ma.public_id, ma.application_id, ma.campaign_id, ma.mission_slot_id,
                  ma.creator_user_id, ma.business_location_id, ma.window_starts_at,
                  ma.window_ends_at, ma.timezone, ma.status, ma.version
             FROM check_in_challenges ch
             JOIN mission_assignments ma ON ma.id = ch.mission_assignment_id
            WHERE ch.public_id = $1
            FOR UPDATE OF ch, ma`,
          [input.challengePublicId],
        );
        const challenge = result.rows[0];
        if (!challenge || !hashesMatch(challenge.token_hash, tokenHash(input.token))) {
          throw new CheckInError(
            'CHECK_IN_CHALLENGE_INVALID',
            404,
            'Check-in challenge is invalid.',
          );
        }
        if (challenge.challenge_status === 'consumed' || challenge.challenge_status === 'revoked') {
          throw new CheckInError(
            'CHECK_IN_CHALLENGE_REPLAYED',
            409,
            'Check-in challenge has already been consumed or replaced.',
          );
        }
        if (
          challenge.challenge_status === 'expired' ||
          challenge.server_now >= challenge.expires_at
        ) {
          throw new CheckInError(
            'CHECK_IN_CHALLENGE_EXPIRED',
            409,
            'Check-in challenge has expired according to server time.',
          );
        }
        if (challenge.creator_user_id !== input.creatorUserId) {
          throw new CheckInError(
            'CHECK_IN_ACCESS_DENIED',
            403,
            'Challenge is not assigned to this creator.',
          );
        }
        if (challenge.business_location_id !== input.businessLocationId) {
          throw new CheckInError(
            'CHECK_IN_WRONG_VENUE',
            409,
            'Challenge is not valid at this business location.',
          );
        }
        if (challenge.status === 'checked_in') {
          throw new CheckInError(
            'CHECK_IN_ALREADY_RECORDED',
            409,
            'Mission assignment already has a verified check-in.',
          );
        }
        if (
          challenge.status !== 'scheduled' ||
          challenge.server_now < challenge.window_starts_at ||
          challenge.server_now > challenge.window_ends_at
        ) {
          throw new CheckInError(
            'CHECK_IN_OUTSIDE_WINDOW',
            409,
            'Check-in is outside the server-controlled mission window.',
          );
        }

        const eventResult = await client.query<CheckInEventRow>(
          `INSERT INTO check_in_events (
             public_id, mission_assignment_id, challenge_id, application_id, mission_slot_id,
             creator_user_id, business_location_id, verification_method, accuracy_class,
             derived_statement, verified_by_user_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id, public_id, mission_assignment_id, challenge_id, application_id,
                     mission_slot_id, creator_user_id, business_location_id,
                     verification_method, accuracy_class, occurred_at`,
          [
            input.eventPublicId,
            challenge.id,
            challenge.challenge_id,
            challenge.application_id,
            challenge.mission_slot_id,
            challenge.creator_user_id,
            challenge.business_location_id,
            challenge.challenge_method,
            input.accuracyClass,
            'Correct creator, venue, server window, and one-time challenge verified.',
            challenge.challenge_created_by,
          ],
        );
        const eventRow = eventResult.rows[0];
        if (!eventRow) throw new Error('Check-in event insert returned no row.');
        await client.query(
          `UPDATE check_in_challenges SET status = 'consumed', consumed_at = now()
            WHERE id = $1 AND status = 'active'`,
          [challenge.challenge_id],
        );
        await client.query(
          `UPDATE mission_assignments
              SET status = 'checked_in', version = version + 1, updated_at = now()
            WHERE id = $1 AND status = 'scheduled' AND version = $2`,
          [challenge.id, challenge.version],
        );
        await client.query(
          `INSERT INTO mission_assignment_status_history (
             mission_assignment_id, from_status, to_status, assignment_version, actor_id, reason
           ) VALUES ($1, 'scheduled', 'checked_in', $2, $3, 'One-time venue challenge verified')`,
          [challenge.id, challenge.version + 1, input.creatorUserId],
        );
        await this.appendAudit(client, {
          action: 'check-in.verified',
          actorId: input.creatorUserId,
          correlationId: input.correlationId,
          details: {
            accuracyClass: input.accuracyClass,
            locationId: challenge.business_location_id,
            method: challenge.challenge_method,
          },
          subjectId: eventRow.id,
          subjectType: 'check-in-event',
        });
        return toCheckInEventRecord(eventRow);
      });
    } catch (error) {
      const constraint = postgresConstraint(error);
      if (
        constraint === 'check_in_events_assignment_uq' ||
        constraint === 'mission_assignment_status_history_version_uq'
      ) {
        throw new CheckInError(
          'CHECK_IN_ALREADY_RECORDED',
          409,
          'Mission assignment already has a verified check-in.',
        );
      }
      if (constraint === 'check_in_events_challenge_uq') {
        throw new CheckInError(
          'CHECK_IN_CHALLENGE_REPLAYED',
          409,
          'Check-in challenge has already been consumed.',
        );
      }
      throw error;
    }
  }

  private async appendAudit(
    client: PoolClient,
    input: {
      action: string;
      actorId: string;
      correlationId: string;
      details: Record<string, unknown>;
      subjectId: string;
      subjectType: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_events (
         actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
       ) VALUES ($1, 'user', $2, $3, $4, $5, $6::jsonb)`,
      [
        input.actorId,
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
