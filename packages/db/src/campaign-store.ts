import { createHash } from 'node:crypto';

import type {
  CampaignConflictCode,
  CampaignRecord,
  CampaignStatus,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

const allowedTransitions: Readonly<Record<CampaignStatus, readonly CampaignStatus[]>> = {
  approved: ['funded', 'canceled'],
  canceled: [],
  draft: ['submitted', 'canceled'],
  funded: ['published'],
  published: [],
  submitted: ['approved', 'canceled'],
};

export type CreateDraftCampaignInput = Omit<CampaignRecord, 'id' | 'status' | 'version'> & {
  actorId: string;
  correlationId: string;
  idempotencyKey: string;
};

export type TransitionCampaignInput = {
  actorId: string;
  campaignId: string;
  correlationId: string;
  expectedVersion: number;
  idempotencyKey: string;
  reason?: string;
  toStatus: CampaignStatus;
};

export class CampaignConflictError extends Error {
  constructor(
    readonly code: CampaignConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'CampaignConflictError';
  }
}

type CampaignRow = QueryResultRow & {
  business_id: string;
  creator_reward_pool_minor: number;
  currency: string;
  id: string;
  platform_fee_minor: number;
  public_id: string;
  slot_count: number;
  status: CampaignStatus;
  title: string;
  total_due_minor: number;
  version: number;
};

function toCampaignRecord(row: CampaignRow): CampaignRecord {
  return {
    businessId: row.business_id,
    creatorRewardPoolMinor: row.creator_reward_pool_minor,
    currency: row.currency,
    id: row.id,
    platformFeeMinor: row.platform_fee_minor,
    publicId: row.public_id,
    slotCount: row.slot_count,
    status: row.status,
    title: row.title,
    totalDueMinor: row.total_due_minor,
    version: row.version,
  };
}

function requestHash(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function quoteSchema(schemaName: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Database schema name must be a safe lowercase PostgreSQL identifier.');
  }

  return `"${schemaName}"`;
}

export class CampaignStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async createDraftCampaign(input: CreateDraftCampaignInput): Promise<CampaignRecord> {
    const operation = 'campaign.create-draft';
    const hash = requestHash({
      actorId: input.actorId,
      businessId: input.businessId,
      creatorRewardPoolMinor: input.creatorRewardPoolMinor,
      currency: input.currency,
      platformFeeMinor: input.platformFeeMinor,
      publicId: input.publicId,
      slotCount: input.slotCount,
      title: input.title,
      totalDueMinor: input.totalDueMinor,
    });

    return this.withTransaction(async (client) => {
      await this.assertCanManageBusiness(client, input.businessId, input.actorId);
      const replay = await this.claimIdempotency(client, operation, input.idempotencyKey, hash);
      if (replay) return replay;

      const result = await client.query<CampaignRow>(
        `INSERT INTO campaigns (
           public_id, business_id, title, creator_reward_pool_minor, platform_fee_minor,
           total_due_minor, currency, slot_count
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, public_id, business_id, title, status, creator_reward_pool_minor,
                   platform_fee_minor, total_due_minor, currency, slot_count, version`,
        [
          input.publicId,
          input.businessId,
          input.title,
          input.creatorRewardPoolMinor,
          input.platformFeeMinor,
          input.totalDueMinor,
          input.currency,
          input.slotCount,
        ],
      );

      const row = result.rows[0];
      if (!row) throw new Error('Campaign insert returned no row.');
      const campaign = toCampaignRecord(row);

      await client.query(
        `INSERT INTO campaign_status_history (
           campaign_id, from_status, to_status, campaign_version, actor_id, reason
         ) VALUES ($1, NULL, 'draft', 1, $2, 'Campaign draft created')`,
        [campaign.id, input.actorId],
      );
      await this.appendAudit(client, {
        action: 'campaign.created',
        actorId: input.actorId,
        campaign,
        correlationId: input.correlationId,
        fromStatus: null,
      });
      await this.completeIdempotency(client, operation, input.idempotencyKey, campaign);
      return campaign;
    });
  }

  async transitionCampaign(input: TransitionCampaignInput): Promise<CampaignRecord> {
    const operation = 'campaign.transition';
    const hash = requestHash({
      actorId: input.actorId,
      campaignId: input.campaignId,
      expectedVersion: input.expectedVersion,
      reason: input.reason ?? null,
      toStatus: input.toStatus,
    });

    return this.withTransaction(async (client) => {
      const currentResult = await client.query<CampaignRow>(
        `SELECT id, public_id, business_id, title, status, creator_reward_pool_minor,
                platform_fee_minor, total_due_minor, currency, slot_count, version
           FROM campaigns c
          WHERE c.id = $1
            AND EXISTS (
              SELECT 1
                FROM business_memberships m
               WHERE m.business_id = c.business_id
                 AND m.user_id = $2
                 AND m.status = 'active'
                 AND m.role IN ('owner', 'manager')
            )
          FOR UPDATE OF c`,
        [input.campaignId, input.actorId],
      );
      const currentRow = currentResult.rows[0];
      if (!currentRow) {
        throw new CampaignConflictError(
          'CAMPAIGN_ACCESS_DENIED',
          403,
          'Campaign is unavailable in the active business workspace.',
        );
      }

      const current = toCampaignRecord(currentRow);
      const replay = await this.claimIdempotency(client, operation, input.idempotencyKey, hash);
      if (replay) return replay;

      if (current.version !== input.expectedVersion) {
        throw new CampaignConflictError(
          'CAMPAIGN_VERSION_CONFLICT',
          409,
          `Expected campaign version ${input.expectedVersion}, but found ${current.version}.`,
        );
      }
      if (!allowedTransitions[current.status].includes(input.toStatus)) {
        throw new CampaignConflictError(
          'CAMPAIGN_TRANSITION_CONFLICT',
          409,
          `Campaign cannot transition from ${current.status} to ${input.toStatus}.`,
        );
      }
      if (current.status === 'draft' && input.toStatus === 'submitted') {
        await this.assertCampaignContractComplete(client, current);
      }

      const updatedResult = await client.query<CampaignRow>(
        `UPDATE campaigns
            SET status = $2, version = version + 1, updated_at = now()
          WHERE id = $1 AND version = $3
          RETURNING id, public_id, business_id, title, status, creator_reward_pool_minor,
                    platform_fee_minor, total_due_minor, currency, slot_count, version`,
        [input.campaignId, input.toStatus, input.expectedVersion],
      );
      const updatedRow = updatedResult.rows[0];
      if (!updatedRow) {
        throw new CampaignConflictError(
          'CAMPAIGN_VERSION_CONFLICT',
          409,
          'Campaign changed before the transition could be committed.',
        );
      }
      const updated = toCampaignRecord(updatedRow);

      await client.query(
        `INSERT INTO campaign_status_history (
           campaign_id, from_status, to_status, campaign_version, actor_id, reason
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          updated.id,
          current.status,
          updated.status,
          updated.version,
          input.actorId,
          input.reason ?? null,
        ],
      );
      await this.appendAudit(client, {
        action: `campaign.${updated.status}`,
        actorId: input.actorId,
        campaign: updated,
        correlationId: input.correlationId,
        fromStatus: current.status,
      });
      await this.completeIdempotency(client, operation, input.idempotencyKey, updated);
      return updated;
    });
  }

  async getCampaign(campaignId: string, actorUserId: string): Promise<CampaignRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<CampaignRow>(
        `SELECT id, public_id, business_id, title, status, creator_reward_pool_minor,
                platform_fee_minor, total_due_minor, currency, slot_count, version
           FROM campaigns c
          WHERE c.id = $1
            AND EXISTS (
              SELECT 1
                FROM business_memberships m
               WHERE m.business_id = c.business_id
                 AND m.user_id = $2
                 AND m.status = 'active'
                 AND m.role IN ('owner', 'manager')
            )`,
        [campaignId, actorUserId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new CampaignConflictError(
          'CAMPAIGN_ACCESS_DENIED',
          403,
          'Campaign is unavailable in the active business workspace.',
        );
      }
      return toCampaignRecord(row);
    });
  }

  private async assertCanManageBusiness(
    client: PoolClient,
    businessId: string,
    actorUserId: string,
  ): Promise<void> {
    const membership = await client.query(
      `SELECT 1
         FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
          AND status = 'active'
          AND role IN ('owner', 'manager')`,
      [businessId, actorUserId],
    );
    if (membership.rowCount !== 1) {
      throw new CampaignConflictError(
        'CAMPAIGN_ACCESS_DENIED',
        403,
        'The active user cannot manage this business workspace.',
      );
    }
  }

  private async assertCampaignContractComplete(
    client: PoolClient,
    campaign: CampaignRecord,
  ): Promise<void> {
    const result = await client.query<{
      brief_count: number;
      community_count: number;
      reward_total: number;
      slot_count: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM campaign_brief_versions WHERE campaign_id = $1) AS brief_count,
         count(*)::int AS slot_count,
         count(*) FILTER (WHERE type = 'community')::int AS community_count,
         coalesce(sum(reward_minor), 0)::int AS reward_total
       FROM mission_slots
       WHERE campaign_id = $1`,
      [campaign.id],
    );
    const contract = result.rows[0];
    const minimumCommunitySlots = Math.ceil(campaign.slotCount * 0.8);
    if (
      !contract ||
      contract.brief_count < 1 ||
      contract.slot_count !== campaign.slotCount ||
      contract.community_count < minimumCommunitySlots ||
      contract.reward_total !== campaign.creatorRewardPoolMinor
    ) {
      throw new CampaignConflictError(
        'CAMPAIGN_CONTRACT_INCOMPLETE',
        409,
        'Campaign needs a versioned brief and a reconciled slot allocation with at least 80% Community Slots before submission.',
      );
    }
  }

  private async appendAudit(
    client: PoolClient,
    input: {
      action: string;
      actorId: string;
      campaign: CampaignRecord;
      correlationId: string;
      fromStatus: CampaignStatus | null;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_events (
         actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
       ) VALUES ($1, 'user', $2, $3, 'campaign', $4, $5::jsonb)`,
      [
        input.actorId,
        input.action,
        input.correlationId,
        input.campaign.id,
        JSON.stringify({
          fromStatus: input.fromStatus,
          toStatus: input.campaign.status,
          version: input.campaign.version,
        }),
      ],
    );
  }

  private async claimIdempotency(
    client: PoolClient,
    operation: string,
    idempotencyKey: string,
    hash: string,
  ): Promise<CampaignRecord | null> {
    const claim = await client.query(
      `INSERT INTO idempotency_records (operation, idempotency_key, request_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (operation, idempotency_key) DO NOTHING
       RETURNING id`,
      [operation, idempotencyKey, hash],
    );
    if (claim.rowCount === 1) return null;

    const existing = await client.query<{
      request_hash: string;
      response_body: CampaignRecord | null;
    }>(
      `SELECT request_hash, response_body
         FROM idempotency_records
        WHERE operation = $1 AND idempotency_key = $2`,
      [operation, idempotencyKey],
    );
    const record = existing.rows[0];
    if (!record || record.request_hash !== hash) {
      throw new CampaignConflictError(
        'IDEMPOTENCY_KEY_REUSE',
        409,
        'Idempotency key was already used for a different request.',
      );
    }
    if (!record.response_body) {
      throw new Error('Idempotent request exists without a committed response.');
    }

    return record.response_body;
  }

  private async completeIdempotency(
    client: PoolClient,
    operation: string,
    idempotencyKey: string,
    response: CampaignRecord,
  ): Promise<void> {
    await client.query(
      `UPDATE idempotency_records
          SET response_status = 200, response_body = $3::jsonb, completed_at = now()
        WHERE operation = $1 AND idempotency_key = $2`,
      [operation, idempotencyKey, JSON.stringify(response)],
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
