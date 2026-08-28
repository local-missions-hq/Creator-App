import { randomUUID } from 'node:crypto';

import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type RecentAuthPurpose =
  | 'identity_link'
  | 'identity_unlink'
  | 'account_deletion'
  | 'payout_destination_change'
  | 'contact_change';

export class AccountLifecycleError extends Error {
  constructor(
    readonly code:
      | 'ACCOUNT_ACCESS_DENIED'
      | 'ACCOUNT_HOLD_ACTIVE'
      | 'ACCOUNT_REQUEST_CONFLICT'
      | 'IDENTITY_BINDING_CONFLICT'
      | 'LAST_IDENTITY_METHOD'
      | 'RECENT_AUTH_REQUIRED'
      | 'SESSION_INVALID',
    readonly httpStatus: 403 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'AccountLifecycleError';
  }
}

type SessionRow = QueryResultRow & {
  external_identity_id: string;
  id: string;
  public_id: string;
  status: 'active' | 'expired' | 'revoked';
  user_id: string;
  version: number;
};

type IdentityRow = QueryResultRow & {
  id: string;
  provider: 'apple' | 'google' | 'microsoft' | 'passwordless_email';
  status: 'active' | 'revoked';
  user_id: string;
  version: number;
};

function postgresConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('constraint' in error)) return undefined;
  return typeof error.constraint === 'string' ? error.constraint : undefined;
}

export class AccountLifecycleStore {
  constructor(private readonly pool: Pool) {}

  async createSession(input: {
    expiresAt: Date;
    externalIdentityId: string;
    publicId: string;
    userId: string;
  }): Promise<{ id: string; publicId: string; version: number }> {
    return this.withTransaction(async (client) => {
      const result = await client.query<SessionRow>(
        `INSERT INTO account_sessions (
           public_id, user_id, external_identity_id, expires_at
         ) VALUES ($1,$2,$3,$4)
         RETURNING id, public_id, user_id, external_identity_id, status, version`,
        [input.publicId, input.userId, input.externalIdentityId, input.expiresAt],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Account session insert returned no row.');
      await this.appendAudit(client, {
        action: 'account.session-created',
        actorId: input.userId,
        correlationId: randomUUID(),
        details: { sessionPublicId: row.public_id },
        subjectId: row.id,
        subjectType: 'account-session',
      });
      return { id: row.id, publicId: row.public_id, version: row.version };
    });
  }

  async grantRecentAuth(input: {
    expiresAt: Date;
    publicId: string;
    purpose: RecentAuthPurpose;
    sessionId: string;
    userId: string;
  }): Promise<string> {
    return this.withTransaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO recent_auth_grants (
           public_id, user_id, account_session_id, purpose, expires_at
         ) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [input.publicId, input.userId, input.sessionId, input.purpose, input.expiresAt],
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error('Recent-auth grant insert returned no row.');
      return id;
    });
  }

  async linkIdentity(input: {
    correlationId: string;
    grantId: string;
    issuer: string;
    provider: IdentityRow['provider'];
    subject: string;
    userId: string;
  }): Promise<{ id: string; provider: IdentityRow['provider']; version: number }> {
    try {
      return await this.withTransaction(async (client) => {
        const session = await this.consumeRecentAuth(client, {
          grantId: input.grantId,
          purpose: 'identity_link',
          userId: input.userId,
        });
        await this.assertNoHold(client, input.userId, 'identity_provider_change');
        await this.setActorContext(client, input.userId, session.id);
        const result = await client.query<IdentityRow>(
          `INSERT INTO external_identities (
             user_id, provider, issuer, subject, verified_at
           ) VALUES ($1,$2,$3,$4,now())
           RETURNING id, user_id, provider, status, version`,
          [input.userId, input.provider, input.issuer, input.subject],
        );
        const identity = result.rows[0];
        if (!identity) throw new Error('Identity binding insert returned no row.');
        await this.appendAudit(client, {
          action: 'identity.linked-securely',
          actorId: input.userId,
          correlationId: input.correlationId,
          details: { provider: identity.provider, sessionId: session.id },
          subjectId: identity.id,
          subjectType: 'external-identity',
        });
        await this.enqueueSecurityEvent(
          client,
          input.userId,
          input.correlationId,
          'identity-linked',
        );
        return { id: identity.id, provider: identity.provider, version: identity.version };
      });
    } catch (error) {
      const constraint = postgresConstraint(error);
      if (
        constraint === 'external_identities_issuer_subject_uq' ||
        constraint === 'external_identities_user_provider_uq'
      ) {
        await this.recordFailedIdentityAttempt(
          input.userId,
          input.correlationId,
          'identity-link-failed',
        );
        throw new AccountLifecycleError(
          'IDENTITY_BINDING_CONFLICT',
          409,
          'The verified provider identity cannot be linked to this account.',
        );
      }
      throw error;
    }
  }

  async unlinkIdentity(input: {
    correlationId: string;
    externalIdentityId: string;
    grantId: string;
    userId: string;
  }): Promise<void> {
    return this.withTransaction(async (client) => {
      const session = await this.consumeRecentAuth(client, {
        grantId: input.grantId,
        purpose: 'identity_unlink',
        userId: input.userId,
      });
      await this.assertNoHold(client, input.userId, 'identity_provider_change');
      const identities = await client.query<IdentityRow>(
        `SELECT id, user_id, provider, status, version
           FROM external_identities
          WHERE user_id = $1 AND status = 'active'
          ORDER BY id FOR UPDATE`,
        [input.userId],
      );
      const target = identities.rows.find((row) => row.id === input.externalIdentityId);
      if (!target) {
        throw new AccountLifecycleError(
          'ACCOUNT_ACCESS_DENIED',
          403,
          'The identity binding is unavailable to this account.',
        );
      }
      if (identities.rows.length < 2) {
        throw new AccountLifecycleError(
          'LAST_IDENTITY_METHOD',
          409,
          'Add and verify another sign-in method before removing this one.',
        );
      }
      await this.setActorContext(client, input.userId, session.id);
      const revoked = await client.query(
        `UPDATE external_identities
            SET status = 'revoked', revoked_at = now(), version = version + 1, updated_at = now()
          WHERE id = $1 AND status = 'active' AND version = $2`,
        [target.id, target.version],
      );
      if (revoked.rowCount !== 1) {
        throw new AccountLifecycleError(
          'IDENTITY_BINDING_CONFLICT',
          409,
          'The identity binding changed before removal completed.',
        );
      }
      await client.query(
        `UPDATE account_sessions
            SET status = 'revoked', revoked_at = now(),
                revocation_reason = 'IDENTITY_UNLINKED', version = version + 1, updated_at = now()
          WHERE external_identity_id = $1 AND status = 'active'`,
        [target.id],
      );
      await this.appendAudit(client, {
        action: 'identity.unlinked-securely',
        actorId: input.userId,
        correlationId: input.correlationId,
        details: { provider: target.provider, sessionId: session.id },
        subjectId: target.id,
        subjectType: 'external-identity',
      });
      await this.enqueueSecurityEvent(
        client,
        input.userId,
        input.correlationId,
        'identity-unlinked',
      );
    });
  }

  async placeRecoveryHold(input: {
    correlationId: string;
    placedByUserId: string;
    publicId: string;
    userId: string;
  }): Promise<string> {
    return this.withTransaction(async (client) => {
      await this.assertRecoveryStaff(client, input.placedByUserId);
      const result = await client.query<{ id: string }>(
        `INSERT INTO account_sensitive_holds (
           public_id, user_id, reason_code, placed_by_user_id
         ) VALUES ($1,$2,'TOTAL_LOCKOUT_RECOVERY',$3) RETURNING id`,
        [input.publicId, input.userId, input.placedByUserId],
      );
      const holdId = result.rows[0]?.id;
      if (!holdId) throw new Error('Recovery hold insert returned no row.');
      await client.query(
        `INSERT INTO account_sensitive_hold_actions (account_sensitive_hold_id, action)
         SELECT $1, action FROM unnest(
           ARRAY['funding','payout_destination_change','identity_provider_change','account_deletion']::sensitive_action[]
         ) AS action`,
        [holdId],
      );
      await this.appendAudit(client, {
        action: 'account.recovery-hold-placed',
        actorId: input.placedByUserId,
        correlationId: input.correlationId,
        details: { actionCount: 4 },
        subjectId: input.userId,
        subjectType: 'user',
      });
      return holdId;
    });
  }

  async releaseRecoveryHold(input: {
    correlationId: string;
    expectedVersion: number;
    holdId: string;
    reason: string;
    releasedByUserId: string;
  }): Promise<void> {
    return this.withTransaction(async (client) => {
      await this.assertRecoveryStaff(client, input.releasedByUserId);
      const result = await client.query<{ placed_by_user_id: string; user_id: string }>(
        `SELECT placed_by_user_id, user_id FROM account_sensitive_holds
          WHERE id = $1 AND status = 'active' AND version = $2 FOR UPDATE`,
        [input.holdId, input.expectedVersion],
      );
      const hold = result.rows[0];
      if (!hold || hold.placed_by_user_id === input.releasedByUserId) {
        throw new AccountLifecycleError(
          'ACCOUNT_ACCESS_DENIED',
          403,
          'Recovery hold release requires a different authorized staff member.',
        );
      }
      const updated = await client.query(
        `UPDATE account_sensitive_holds
            SET status = 'released', released_by_user_id = $2, released_at = now(),
                release_reason = $3, version = version + 1
          WHERE id = $1 AND status = 'active' AND version = $4`,
        [input.holdId, input.releasedByUserId, input.reason, input.expectedVersion],
      );
      if (updated.rowCount !== 1) {
        throw new AccountLifecycleError(
          'ACCOUNT_ACCESS_DENIED',
          403,
          'Recovery hold changed before release completed.',
        );
      }
      await this.appendAudit(client, {
        action: 'account.recovery-hold-released',
        actorId: input.releasedByUserId,
        correlationId: input.correlationId,
        details: { reason: input.reason },
        subjectId: hold.user_id,
        subjectType: 'user',
      });
    });
  }

  async requestAccountAction(input: {
    correlationId: string;
    grantId?: string;
    publicId: string;
    sessionId: string;
    type: 'deletion' | 'export';
    userId: string;
  }): Promise<string> {
    try {
      return await this.withTransaction(async (client) => {
        await this.assertSession(client, input.sessionId, input.userId);
        if (input.type === 'deletion') {
          if (!input.grantId) {
            throw new AccountLifecycleError(
              'RECENT_AUTH_REQUIRED',
              409,
              'Account deletion requires recent authentication.',
            );
          }
          await this.consumeRecentAuth(client, {
            grantId: input.grantId,
            purpose: 'account_deletion',
            userId: input.userId,
          });
          await this.assertNoHold(client, input.userId, 'account_deletion');
        }
        const result = await client.query<{ id: string }>(
          `INSERT INTO account_requests (public_id, user_id, type)
           VALUES ($1,$2,$3) RETURNING id`,
          [input.publicId, input.userId, input.type],
        );
        const requestId = result.rows[0]?.id;
        if (!requestId) throw new Error('Account request insert returned no row.');
        await client.query(
          `INSERT INTO account_request_history (
             account_request_id, to_status, request_version, actor_user_id, reason
           ) VALUES ($1,'requested',1,$2,'Account owner requested action')`,
          [requestId, input.userId],
        );
        await this.appendAudit(client, {
          action: `account.${input.type}-requested`,
          actorId: input.userId,
          correlationId: input.correlationId,
          details: { requestType: input.type },
          subjectId: requestId,
          subjectType: 'account-request',
        });
        await this.enqueueSecurityEvent(
          client,
          input.userId,
          input.correlationId,
          `account-${input.type}-requested`,
        );
        if (input.type === 'deletion') {
          await client.query(
            `UPDATE users SET status = 'deletion_requested', version = version + 1, updated_at = now()
              WHERE id = $1 AND status = 'active'`,
            [input.userId],
          );
        }
        return requestId;
      });
    } catch (error) {
      if (postgresConstraint(error) === 'account_requests_open_user_type_uq') {
        throw new AccountLifecycleError(
          'ACCOUNT_REQUEST_CONFLICT',
          409,
          'An account request of this type is already open.',
        );
      }
      throw error;
    }
  }

  private async consumeRecentAuth(
    client: PoolClient,
    input: { grantId: string; purpose: RecentAuthPurpose; userId: string },
  ): Promise<SessionRow> {
    const grant = await client.query<{ account_session_id: string }>(
      `UPDATE recent_auth_grants AS recent
          SET consumed_at = now()
        WHERE recent.id = $1 AND recent.user_id = $2 AND recent.purpose = $3
          AND recent.consumed_at IS NULL AND recent.expires_at > now()
          AND EXISTS (
            SELECT 1 FROM account_sessions session
             WHERE session.id = recent.account_session_id AND session.user_id = recent.user_id
               AND session.status = 'active' AND session.expires_at > now()
          )
      RETURNING account_session_id`,
      [input.grantId, input.userId, input.purpose],
    );
    const sessionId = grant.rows[0]?.account_session_id;
    if (!sessionId) {
      throw new AccountLifecycleError(
        'RECENT_AUTH_REQUIRED',
        409,
        'A fresh, single-use recent-authentication proof is required.',
      );
    }
    return this.assertSession(client, sessionId, input.userId);
  }

  private async assertSession(
    client: PoolClient,
    sessionId: string,
    userId: string,
  ): Promise<SessionRow> {
    const result = await client.query<SessionRow>(
      `SELECT id, public_id, user_id, external_identity_id, status, version
         FROM account_sessions
        WHERE id = $1 AND user_id = $2 AND status = 'active' AND expires_at > now()`,
      [sessionId, userId],
    );
    const session = result.rows[0];
    if (!session) {
      throw new AccountLifecycleError(
        'SESSION_INVALID',
        403,
        'The account session is unavailable.',
      );
    }
    return session;
  }

  private async assertNoHold(
    client: PoolClient,
    userId: string,
    action: 'account_deletion' | 'identity_provider_change',
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM account_sensitive_holds hold
       JOIN account_sensitive_hold_actions blocked ON blocked.account_sensitive_hold_id = hold.id
       WHERE hold.user_id = $1 AND hold.status = 'active' AND blocked.action = $2`,
      [userId, action],
    );
    if (result.rowCount) {
      throw new AccountLifecycleError(
        'ACCOUNT_HOLD_ACTIVE',
        409,
        'A controlled recovery hold temporarily blocks this sensitive action.',
      );
    }
  }

  private async assertRecoveryStaff(client: PoolClient, userId: string): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM platform_staff_memberships
        WHERE user_id = $1 AND status = 'active' AND role IN ('trust_safety_reviewer','admin')`,
      [userId],
    );
    if (result.rowCount !== 1) {
      throw new AccountLifecycleError(
        'ACCOUNT_ACCESS_DENIED',
        403,
        'Controlled recovery requires authorized platform staff.',
      );
    }
  }

  private async setActorContext(
    client: PoolClient,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    await client.query(`SELECT set_config('local_missions.actor_user_id', $1, true)`, [userId]);
    await client.query(`SELECT set_config('local_missions.account_session_id', $1, true)`, [
      sessionId,
    ]);
  }

  private async recordFailedIdentityAttempt(
    userId: string,
    correlationId: string,
    deduplicationKey: string,
  ): Promise<void> {
    await this.withTransaction(async (client) => {
      await this.appendAudit(client, {
        action: 'identity.link-failed',
        actorId: userId,
        correlationId,
        details: { reason: 'binding-conflict' },
        subjectId: userId,
        subjectType: 'user',
      });
      await this.enqueueSecurityEvent(client, userId, correlationId, deduplicationKey);
    });
  }

  private async enqueueSecurityEvent(
    client: PoolClient,
    userId: string,
    correlationId: string,
    deduplicationKey: string,
  ): Promise<void> {
    const publicId = `nte_${randomUUID()}`;
    const scopedDeduplicationKey = `${deduplicationKey}:${correlationId}`;
    const event = await client.query<{ id: string }>(
      `INSERT INTO notification_events (
         public_id, type, category, audience, recipient_user_id, aggregate_type,
         aggregate_id, template_key, deep_link_route, deduplication_key, correlation_id
       ) VALUES (
         $1,'security_alert','security','account_owner',$2,'user',$2,
         'notification.security_alert.v1',$3,$4,$5
       ) RETURNING id`,
      [publicId, userId, `/notifications/${publicId}`, scopedDeduplicationKey, correlationId],
    );
    const eventId = event.rows[0]?.id;
    if (!eventId) throw new Error('Security notification event insert returned no row.');
    // Database triggers create one pending outbox row, initial outbox history,
    // and one recipient-scoped in-app notice in this same transaction.
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
       ) VALUES ($1,'user',$2,$3,$4,$5,$6::jsonb)`,
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
      const value = await operation(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
