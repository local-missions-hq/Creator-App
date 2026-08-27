import { createHash } from 'node:crypto';

import type {
  FinancialActionIntentType,
  LedgerAccountCode,
  LedgerConflictCode,
  LedgerTransactionType,
  PaymentProvider,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type CampaignFundingRecord = {
  campaignId: string;
  creatorRewardPoolMinor: number;
  currency: string;
  id: string;
  platformFeeMinor: number;
  providerReferenceId: string;
  publicId: string;
  totalDueMinor: number;
  transferGroup: string;
};

export type LedgerTransactionRecord = {
  campaignId: string | null;
  currency: string;
  id: string;
  missionAssignmentId: string | null;
  publicId: string;
  totalMinor: number;
  type: LedgerTransactionType;
};

export class LedgerError extends Error {
  constructor(
    readonly code: LedgerConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'LedgerError';
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
  status: string;
  total_due_minor: number;
  version: number;
};

type SlotRow = QueryResultRow & {
  id: string;
  ordinal: number;
  public_id: string;
  reward_minor: number;
};

type FundingRow = QueryResultRow & {
  campaign_id: string;
  creator_reward_pool_minor: number;
  currency: string;
  id: string;
  platform_fee_minor: number;
  provider_account_reference: string;
  provider_event_id: string;
  provider_object_id: string;
  provider_reference_id: string;
  public_id: string;
  request_hash: string;
  total_due_minor: number;
  transfer_group: string;
};

type TransactionRow = QueryResultRow & {
  campaign_id: string | null;
  currency: string;
  id: string;
  mission_assignment_id: string | null;
  public_id: string;
  request_hash: string;
  total_minor: number;
  type: LedgerTransactionType;
};

type IntentRow = QueryResultRow & {
  action: FinancialActionIntentType;
  application_status: string;
  business_id: string;
  campaign_id: string;
  creator_user_id: string;
  currency: string | null;
  funding_snapshot_id: string | null;
  id: string;
  mission_assignment_id: string;
  platform_fee_minor: number | null;
  public_id: string;
  reward_minor: number | null;
  slot_funding_allocation_id: string | null;
  slot_status: string;
  assignment_status: string;
  status: 'pending_ledger' | 'posted';
  total_minor: number | null;
};

type AccountRow = QueryResultRow & {
  currency: string;
  id: string;
  public_id: string;
};

type FeeAllocation = SlotRow & { platformFeeMinor: number };

function quoteSchema(schemaName: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Database schema name must be a safe lowercase PostgreSQL identifier.');
  }
  return `"${schemaName}"`;
}

function requestHash(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function toFundingRecord(row: FundingRow): CampaignFundingRecord {
  return {
    campaignId: row.campaign_id,
    creatorRewardPoolMinor: row.creator_reward_pool_minor,
    currency: row.currency,
    id: row.id,
    platformFeeMinor: row.platform_fee_minor,
    providerReferenceId: row.provider_reference_id,
    publicId: row.public_id,
    totalDueMinor: row.total_due_minor,
    transferGroup: row.transfer_group,
  };
}

function toTransactionRecord(row: TransactionRow): LedgerTransactionRecord {
  return {
    campaignId: row.campaign_id,
    currency: row.currency,
    id: row.id,
    missionAssignmentId: row.mission_assignment_id,
    publicId: row.public_id,
    totalMinor: row.total_minor,
    type: row.type,
  };
}

export function allocateFifteenPercentFee(
  slots: readonly SlotRow[],
  expectedPlatformFeeMinor: number,
): FeeAllocation[] {
  const expectedFromPool = Math.floor(
    (slots.reduce((sum, slot) => sum + slot.reward_minor, 0) * 15 + 50) / 100,
  );
  if (expectedPlatformFeeMinor !== expectedFromPool) {
    throw new LedgerError(
      'LEDGER_ALLOCATION_INVALID',
      409,
      'The campaign platform fee must equal the disclosed 15% fee in integer minor units.',
    );
  }

  const ranked = slots
    .map((slot) => ({
      ...slot,
      floorFee: Math.floor((slot.reward_minor * 15) / 100),
      remainder: (slot.reward_minor * 15) % 100,
    }))
    .sort((left, right) => right.remainder - left.remainder || left.ordinal - right.ordinal);
  const floorTotal = ranked.reduce((sum, slot) => sum + slot.floorFee, 0);
  const centsToAssign = expectedPlatformFeeMinor - floorTotal;
  if (centsToAssign < 0 || centsToAssign > ranked.length) {
    throw new LedgerError(
      'LEDGER_ALLOCATION_INVALID',
      409,
      'The campaign fee cannot be reconciled deterministically across its slots.',
    );
  }
  const roundedUpIds = new Set(ranked.slice(0, centsToAssign).map((slot) => slot.id));
  return slots.map((slot) => ({
    ...slot,
    platformFeeMinor:
      Math.floor((slot.reward_minor * 15) / 100) + (roundedUpIds.has(slot.id) ? 1 : 0),
  }));
}

export class LedgerStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async recordCampaignFunding(input: {
    campaignId: string;
    correlationId: string;
    fundedAt: Date;
    fundingPublicId: string;
    ledgerTransactionPublicId: string;
    provider: PaymentProvider;
    providerAccountReference: string;
    providerEventId: string;
    providerObjectId: string;
    providerReferencePublicId: string;
    transferGroup: string;
  }): Promise<CampaignFundingRecord> {
    const hash = requestHash({
      campaignId: input.campaignId,
      fundedAt: input.fundedAt.toISOString(),
      fundingPublicId: input.fundingPublicId,
      ledgerTransactionPublicId: input.ledgerTransactionPublicId,
      provider: input.provider,
      providerAccountReference: input.providerAccountReference,
      providerEventId: input.providerEventId,
      providerObjectId: input.providerObjectId,
      providerReferencePublicId: input.providerReferencePublicId,
      transferGroup: input.transferGroup,
    });

    try {
      return await this.withTransaction(async (client) => {
        const campaignResult = await client.query<CampaignRow>(
          `SELECT id, public_id, business_id, status, creator_reward_pool_minor,
                  platform_fee_minor, total_due_minor, currency, slot_count, version
             FROM campaigns WHERE id = $1 FOR UPDATE`,
          [input.campaignId],
        );
        const campaign = campaignResult.rows[0];
        if (!campaign) {
          throw new LedgerError('LEDGER_TRANSITION_CONFLICT', 404, 'Campaign does not exist.');
        }

        const existing = await this.selectFundingByCampaign(client, campaign.id);
        if (existing) {
          if (existing.request_hash === hash) {
            return toFundingRecord(existing);
          }
          throw new LedgerError(
            'LEDGER_ALREADY_FUNDED',
            409,
            'The campaign already has a different immutable funding snapshot.',
          );
        }
        if (campaign.status !== 'approved') {
          throw new LedgerError(
            'LEDGER_TRANSITION_CONFLICT',
            409,
            'Only an approved campaign can accept authoritative funding.',
          );
        }

        const slotResult = await client.query<SlotRow>(
          `SELECT id, public_id, ordinal, reward_minor
             FROM mission_slots WHERE campaign_id = $1 ORDER BY ordinal FOR SHARE`,
          [campaign.id],
        );
        const slots = slotResult.rows;
        if (
          slots.length !== campaign.slot_count ||
          slots.reduce((sum, slot) => sum + slot.reward_minor, 0) !==
            campaign.creator_reward_pool_minor
        ) {
          throw new LedgerError(
            'LEDGER_ALLOCATION_INVALID',
            409,
            'Campaign slots do not reconcile to the approved reward pool.',
          );
        }
        const allocations = allocateFifteenPercentFee(slots, campaign.platform_fee_minor);

        const providerResult = await client.query<{ id: string }>(
          `INSERT INTO payment_provider_references (
             public_id, provider, provider_account_reference, object_type, provider_object_id
           ) VALUES ($1, $2, $3, 'payment_intent', $4)
           RETURNING id`,
          [
            input.providerReferencePublicId,
            input.provider,
            input.providerAccountReference,
            input.providerObjectId,
          ],
        );
        const providerReferenceId = providerResult.rows[0]?.id;
        if (!providerReferenceId) throw new Error('Provider reference insert returned no row.');

        const fundingResult = await client.query<FundingRow>(
          `INSERT INTO campaign_funding_snapshots (
             public_id, campaign_id, payment_provider_reference_id, provider_event_id,
             transfer_group, creator_reward_pool_minor, platform_fee_minor,
             total_due_minor, currency, funded_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, public_id, campaign_id, payment_provider_reference_id AS provider_reference_id,
                     provider_event_id, transfer_group, creator_reward_pool_minor,
                     platform_fee_minor, total_due_minor, currency,
                     $11::text AS provider_account_reference, $12::text AS provider_object_id,
                     $13::text AS request_hash`,
          [
            input.fundingPublicId,
            campaign.id,
            providerReferenceId,
            input.providerEventId,
            input.transferGroup,
            campaign.creator_reward_pool_minor,
            campaign.platform_fee_minor,
            campaign.total_due_minor,
            campaign.currency,
            input.fundedAt,
            input.providerAccountReference,
            input.providerObjectId,
            hash,
          ],
        );
        const funding = fundingResult.rows[0];
        if (!funding) throw new Error('Funding snapshot insert returned no row.');

        for (const allocation of allocations) {
          await client.query(
            `INSERT INTO slot_funding_allocations (
               public_id, campaign_funding_snapshot_id, mission_slot_id,
               creator_reward_minor, platform_fee_minor, total_minor, currency
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              `alloc_${input.fundingPublicId}_${allocation.ordinal}`,
              funding.id,
              allocation.id,
              allocation.reward_minor,
              allocation.platformFeeMinor,
              allocation.reward_minor + allocation.platformFeeMinor,
              campaign.currency,
            ],
          );
        }

        const providerClearing = await this.ensureAccount(client, {
          code: 'provider_clearing',
          currency: campaign.currency,
          publicId: `acct_provider_clearing_${campaign.currency}`,
        });
        const campaignFunds = await this.ensureAccount(client, {
          campaignId: campaign.id,
          code: 'campaign_funds',
          currency: campaign.currency,
          publicId: `acct_campaign_funds_${campaign.public_id}_${campaign.currency}`,
        });
        const transaction = await this.insertTransaction(client, {
          campaignId: campaign.id,
          correlationId: input.correlationId,
          currency: campaign.currency,
          paymentProviderReferenceId: providerReferenceId,
          publicId: input.ledgerTransactionPublicId,
          requestHash: hash,
          sourcePublicId: input.providerEventId,
          sourceType: 'provider_funding',
          totalMinor: campaign.total_due_minor,
          type: 'campaign_funding',
        });
        await this.insertEntry(client, {
          accountId: providerClearing.id,
          amountMinor: campaign.total_due_minor,
          currency: campaign.currency,
          direction: 'debit',
          position: 1,
          publicId: `entry_${input.ledgerTransactionPublicId}_1`,
          transactionId: transaction.id,
        });
        await this.insertEntry(client, {
          accountId: campaignFunds.id,
          amountMinor: campaign.total_due_minor,
          currency: campaign.currency,
          direction: 'credit',
          position: 2,
          publicId: `entry_${input.ledgerTransactionPublicId}_2`,
          transactionId: transaction.id,
        });

        const campaignUpdate = await client.query<{ version: number }>(
          `UPDATE campaigns
              SET status = 'funded', version = version + 1, updated_at = now()
            WHERE id = $1 AND status = 'approved' AND version = $2
            RETURNING version`,
          [campaign.id, campaign.version],
        );
        const newVersion = campaignUpdate.rows[0]?.version;
        if (!newVersion) {
          throw new LedgerError(
            'LEDGER_TRANSITION_CONFLICT',
            409,
            'Campaign changed before funding could commit.',
          );
        }
        await client.query(
          `INSERT INTO campaign_status_history (
             campaign_id, from_status, to_status, campaign_version, actor_id, reason
           ) VALUES ($1, 'approved', 'funded', $2, NULL, 'Authoritative provider funding recorded')`,
          [campaign.id, newVersion],
        );
        await this.appendAudit(client, {
          action: 'campaign.funding-recorded',
          actorId: null,
          actorType: 'provider',
          correlationId: input.correlationId,
          details: {
            allocationCount: allocations.length,
            providerReferenceId,
            totalDueMinor: campaign.total_due_minor,
          },
          subjectId: funding.id,
          subjectType: 'campaign-funding',
        });
        return toFundingRecord(funding);
      });
    } catch (error) {
      if (error instanceof LedgerError) throw error;
      if (typeof error === 'object' && error !== null && 'constraint' in error) {
        const constraint = String(error.constraint);
        if (
          constraint.includes('provider') ||
          constraint.includes('transfer_group') ||
          constraint.includes('source_uq')
        ) {
          throw new LedgerError(
            'LEDGER_PROVIDER_CONFLICT',
            409,
            'The provider object, event, transfer group, or funding source is already bound.',
          );
        }
      }
      throw error;
    }
  }

  async consumeFinancialActionIntent(input: {
    correlationId: string;
    intentId: string;
  }): Promise<LedgerTransactionRecord> {
    return this.withTransaction(async (client) => {
      const intentResult = await client.query<IntentRow>(
        `SELECT intent.id, intent.public_id, intent.action, intent.status,
                assignment.id AS mission_assignment_id, assignment.status AS assignment_status,
                assignment.creator_user_id, assignment.campaign_id,
                application.status AS application_status, slot.status AS slot_status,
                campaign.business_id, allocation.id AS slot_funding_allocation_id,
                allocation.creator_reward_minor AS reward_minor,
                allocation.platform_fee_minor, allocation.total_minor, allocation.currency,
                snapshot.id AS funding_snapshot_id
           FROM financial_action_intents intent
           JOIN mission_assignments assignment ON assignment.id = intent.mission_assignment_id
           JOIN mission_applications application ON application.id = assignment.application_id
           JOIN mission_slots slot ON slot.id = assignment.mission_slot_id
           JOIN campaigns campaign ON campaign.id = assignment.campaign_id
           LEFT JOIN slot_funding_allocations allocation
             ON allocation.mission_slot_id = assignment.mission_slot_id
           LEFT JOIN campaign_funding_snapshots snapshot
             ON snapshot.id = allocation.campaign_funding_snapshot_id
          WHERE intent.id = $1
          FOR UPDATE OF intent, assignment`,
        [input.intentId],
      );
      const intent = intentResult.rows[0];
      if (!intent) {
        throw new LedgerError('LEDGER_INTENT_NOT_FOUND', 404, 'Financial action intent is absent.');
      }
      if (intent.status === 'posted') {
        const posted = await this.selectTransactionBySource(
          client,
          'financial_action_intent',
          intent.public_id,
        );
        if (!posted) {
          throw new LedgerError(
            'LEDGER_TRANSITION_CONFLICT',
            409,
            'Posted intent is missing its immutable journal.',
          );
        }
        return toTransactionRecord(posted);
      }
      if (
        !intent.funding_snapshot_id ||
        !intent.slot_funding_allocation_id ||
        intent.reward_minor === null ||
        intent.platform_fee_minor === null ||
        intent.total_minor === null ||
        intent.currency === null
      ) {
        throw new LedgerError(
          'LEDGER_INTENT_NOT_READY',
          409,
          'The slot has no immutable funded allocation to consume.',
        );
      }

      const isCompletion = intent.action === 'creator_payable_full';
      const expectedFinalStatus = isCompletion ? 'completed' : 'no_payout';
      if (
        intent.assignment_status !== expectedFinalStatus ||
        intent.application_status !== expectedFinalStatus ||
        intent.slot_status !== expectedFinalStatus
      ) {
        throw new LedgerError(
          'LEDGER_INTENT_NOT_READY',
          409,
          'The mission final state does not match the requested financial action.',
        );
      }

      const campaignFunds = await this.selectAccount(client, {
        campaignId: intent.campaign_id,
        code: 'campaign_funds',
        currency: intent.currency,
      });
      if (!campaignFunds) {
        throw new LedgerError(
          'LEDGER_INTENT_NOT_READY',
          409,
          'The funded campaign ledger account is absent.',
        );
      }
      const hash = requestHash({ action: intent.action, intentId: intent.id });
      const transaction = await this.insertTransaction(client, {
        campaignId: intent.campaign_id,
        correlationId: input.correlationId,
        currency: intent.currency,
        missionAssignmentId: intent.mission_assignment_id,
        publicId: `ledger_${intent.public_id}`,
        requestHash: hash,
        sourcePublicId: intent.public_id,
        sourceType: 'financial_action_intent',
        totalMinor: intent.total_minor,
        type: isCompletion ? 'slot_completion' : 'slot_refund',
      });
      await this.insertEntry(client, {
        accountId: campaignFunds.id,
        allocationId: intent.slot_funding_allocation_id,
        amountMinor: intent.total_minor,
        assignmentId: intent.mission_assignment_id,
        currency: intent.currency,
        direction: 'debit',
        position: 1,
        publicId: `entry_${transaction.public_id}_1`,
        transactionId: transaction.id,
      });

      if (isCompletion) {
        const creatorPayable = await this.ensureAccount(client, {
          code: 'creator_payable',
          creatorUserId: intent.creator_user_id,
          currency: intent.currency,
          publicId: `acct_creator_payable_${intent.creator_user_id}_${intent.currency}`,
        });
        const feeRevenue = await this.ensureAccount(client, {
          code: 'platform_fee_revenue',
          currency: intent.currency,
          publicId: `acct_platform_fee_revenue_${intent.currency}`,
        });
        await this.insertEntry(client, {
          accountId: creatorPayable.id,
          allocationId: intent.slot_funding_allocation_id,
          amountMinor: intent.reward_minor,
          assignmentId: intent.mission_assignment_id,
          currency: intent.currency,
          direction: 'credit',
          position: 2,
          publicId: `entry_${transaction.public_id}_2`,
          transactionId: transaction.id,
        });
        await this.insertEntry(client, {
          accountId: feeRevenue.id,
          allocationId: intent.slot_funding_allocation_id,
          amountMinor: intent.platform_fee_minor,
          assignmentId: intent.mission_assignment_id,
          currency: intent.currency,
          direction: 'credit',
          position: 3,
          publicId: `entry_${transaction.public_id}_3`,
          transactionId: transaction.id,
        });
      } else {
        const refundPayable = await this.ensureAccount(client, {
          businessId: intent.business_id,
          code: 'business_refund_payable',
          currency: intent.currency,
          publicId: `acct_business_refund_${intent.business_id}_${intent.currency}`,
        });
        await this.insertEntry(client, {
          accountId: refundPayable.id,
          allocationId: intent.slot_funding_allocation_id,
          amountMinor: intent.total_minor,
          assignmentId: intent.mission_assignment_id,
          currency: intent.currency,
          direction: 'credit',
          position: 2,
          publicId: `entry_${transaction.public_id}_2`,
          transactionId: transaction.id,
        });
      }

      const posted = await client.query(
        `UPDATE financial_action_intents
            SET status = 'posted', posted_at = now(), updated_at = now(), version = version + 1
          WHERE id = $1 AND status = 'pending_ledger'`,
        [intent.id],
      );
      if (posted.rowCount !== 1) {
        throw new LedgerError(
          'LEDGER_TRANSITION_CONFLICT',
          409,
          'Financial action intent changed before posting could commit.',
        );
      }
      await this.appendAudit(client, {
        action: isCompletion ? 'ledger.creator-payable-posted' : 'ledger.refund-payable-posted',
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: {
          action: intent.action,
          currency: intent.currency,
          totalMinor: intent.total_minor,
        },
        subjectId: transaction.id,
        subjectType: 'ledger-transaction',
      });
      return toTransactionRecord(transaction);
    });
  }

  async postFinanceAdjustment(input: {
    actorUserId: string;
    amountMinor: number;
    correlationId: string;
    creditAccountPublicId: string;
    currency: string;
    debitAccountPublicId: string;
    publicId: string;
    reason: string;
  }): Promise<LedgerTransactionRecord> {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0 || !input.reason.trim()) {
      throw new LedgerError(
        'LEDGER_ADJUSTMENT_INVALID',
        409,
        'A finance adjustment needs a positive integer amount and recorded reason.',
      );
    }
    const hash = requestHash({
      actorUserId: input.actorUserId,
      amountMinor: input.amountMinor,
      creditAccountPublicId: input.creditAccountPublicId,
      currency: input.currency,
      debitAccountPublicId: input.debitAccountPublicId,
      reason: input.reason,
    });
    return this.withTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [input.publicId]);
      const membership = await client.query(
        `SELECT 1 FROM platform_staff_memberships
          WHERE user_id = $1 AND role = 'finance_operator' AND status = 'active'`,
        [input.actorUserId],
      );
      if (membership.rowCount !== 1) {
        throw new LedgerError(
          'LEDGER_ACCESS_DENIED',
          403,
          'Only an active Finance Operator may post a compensating adjustment.',
        );
      }

      const existing = await this.selectTransactionBySource(
        client,
        'finance_adjustment',
        input.publicId,
      );
      if (existing) {
        if (existing.request_hash === hash) return toTransactionRecord(existing);
        throw new LedgerError(
          'LEDGER_IDEMPOTENCY_CONFLICT',
          409,
          'Adjustment public ID was already used with different inputs.',
        );
      }
      const accounts = await client.query<AccountRow>(
        `SELECT id, public_id, currency FROM ledger_accounts
          WHERE public_id = ANY($1::text[]) ORDER BY public_id FOR SHARE`,
        [[input.debitAccountPublicId, input.creditAccountPublicId]],
      );
      const debit = accounts.rows.find((row) => row.public_id === input.debitAccountPublicId);
      const credit = accounts.rows.find((row) => row.public_id === input.creditAccountPublicId);
      if (!debit || !credit || debit.id === credit.id) {
        throw new LedgerError(
          'LEDGER_ADJUSTMENT_INVALID',
          409,
          'Adjustment accounts must be distinct existing ledger accounts.',
        );
      }
      if (debit.currency !== input.currency || credit.currency !== input.currency) {
        throw new LedgerError(
          'LEDGER_CURRENCY_MISMATCH',
          409,
          'Both adjustment accounts must match the declared currency.',
        );
      }
      const transaction = await this.insertTransaction(client, {
        correlationId: input.correlationId,
        createdByUserId: input.actorUserId,
        currency: input.currency,
        publicId: input.publicId,
        reason: input.reason,
        requestHash: hash,
        sourcePublicId: input.publicId,
        sourceType: 'finance_adjustment',
        totalMinor: input.amountMinor,
        type: 'finance_adjustment',
      });
      await this.insertEntry(client, {
        accountId: debit.id,
        amountMinor: input.amountMinor,
        currency: input.currency,
        direction: 'debit',
        position: 1,
        publicId: `entry_${input.publicId}_1`,
        transactionId: transaction.id,
      });
      await this.insertEntry(client, {
        accountId: credit.id,
        amountMinor: input.amountMinor,
        currency: input.currency,
        direction: 'credit',
        position: 2,
        publicId: `entry_${input.publicId}_2`,
        transactionId: transaction.id,
      });
      await this.appendAudit(client, {
        action: 'ledger.finance-adjustment-posted',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { amountMinor: input.amountMinor, currency: input.currency, reason: input.reason },
        subjectId: transaction.id,
        subjectType: 'ledger-transaction',
      });
      return toTransactionRecord(transaction);
    });
  }

  private async selectFundingByCampaign(
    client: PoolClient,
    campaignId: string,
  ): Promise<FundingRow | undefined> {
    const result = await client.query<FundingRow>(
      `SELECT snapshot.id, snapshot.public_id, snapshot.campaign_id,
              snapshot.payment_provider_reference_id AS provider_reference_id,
              snapshot.provider_event_id, snapshot.transfer_group,
              snapshot.creator_reward_pool_minor, snapshot.platform_fee_minor,
              snapshot.total_due_minor, snapshot.currency,
              provider.provider_account_reference, provider.provider_object_id,
              transaction.request_hash
         FROM campaign_funding_snapshots snapshot
         JOIN payment_provider_references provider
           ON provider.id = snapshot.payment_provider_reference_id
         JOIN ledger_transactions transaction
           ON transaction.source_type = 'provider_funding'
          AND transaction.source_public_id = snapshot.provider_event_id
        WHERE snapshot.campaign_id = $1`,
      [campaignId],
    );
    return result.rows[0];
  }

  private async selectTransactionBySource(
    client: PoolClient,
    sourceType: 'financial_action_intent' | 'finance_adjustment',
    sourcePublicId: string,
  ): Promise<TransactionRow | undefined> {
    const result = await client.query<TransactionRow>(
      `SELECT id, public_id, type, campaign_id, mission_assignment_id,
              total_minor, currency, request_hash
         FROM ledger_transactions
        WHERE source_type = $1 AND source_public_id = $2`,
      [sourceType, sourcePublicId],
    );
    return result.rows[0];
  }

  private async ensureAccount(
    client: PoolClient,
    input: {
      businessId?: string;
      campaignId?: string;
      code: LedgerAccountCode;
      creatorUserId?: string;
      currency: string;
      publicId: string;
    },
  ): Promise<AccountRow> {
    const inserted = await client.query<AccountRow>(
      `INSERT INTO ledger_accounts (
         public_id, code, campaign_id, creator_user_id, business_id, currency
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (public_id) DO NOTHING
       RETURNING id, public_id, currency`,
      [
        input.publicId,
        input.code,
        input.campaignId ?? null,
        input.creatorUserId ?? null,
        input.businessId ?? null,
        input.currency,
      ],
    );
    if (inserted.rows[0]) return inserted.rows[0];
    const existing = await client.query<AccountRow & { code: LedgerAccountCode }>(
      `SELECT id, public_id, currency, code FROM ledger_accounts WHERE public_id = $1`,
      [input.publicId],
    );
    const account = existing.rows[0];
    if (!account || account.code !== input.code || account.currency !== input.currency) {
      throw new LedgerError(
        'LEDGER_ALLOCATION_INVALID',
        409,
        'Ledger account public ID conflicts with a different immutable scope.',
      );
    }
    return account;
  }

  private async selectAccount(
    client: PoolClient,
    input: { campaignId: string; code: 'campaign_funds'; currency: string },
  ): Promise<AccountRow | undefined> {
    const result = await client.query<AccountRow>(
      `SELECT id, public_id, currency FROM ledger_accounts
        WHERE code = $1 AND campaign_id = $2 AND currency = $3`,
      [input.code, input.campaignId, input.currency],
    );
    return result.rows[0];
  }

  private async insertTransaction(
    client: PoolClient,
    input: {
      campaignId?: string;
      correlationId: string;
      createdByUserId?: string;
      currency: string;
      missionAssignmentId?: string;
      paymentProviderReferenceId?: string;
      publicId: string;
      reason?: string;
      requestHash: string;
      sourcePublicId: string;
      sourceType: 'provider_funding' | 'financial_action_intent' | 'finance_adjustment';
      totalMinor: number;
      type: LedgerTransactionType;
    },
  ): Promise<TransactionRow> {
    const result = await client.query<TransactionRow>(
      `INSERT INTO ledger_transactions (
         public_id, type, source_type, source_public_id, request_hash,
         payment_provider_reference_id, campaign_id, mission_assignment_id,
         total_minor, currency, correlation_id, created_by_user_id, reason
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, public_id, type, campaign_id, mission_assignment_id,
                 total_minor, currency, request_hash`,
      [
        input.publicId,
        input.type,
        input.sourceType,
        input.sourcePublicId,
        input.requestHash,
        input.paymentProviderReferenceId ?? null,
        input.campaignId ?? null,
        input.missionAssignmentId ?? null,
        input.totalMinor,
        input.currency,
        input.correlationId,
        input.createdByUserId ?? null,
        input.reason ?? null,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Ledger transaction insert returned no row.');
    return row;
  }

  private async insertEntry(
    client: PoolClient,
    input: {
      accountId: string;
      allocationId?: string;
      amountMinor: number;
      assignmentId?: string;
      currency: string;
      direction: 'debit' | 'credit';
      position: number;
      publicId: string;
      transactionId: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO ledger_entries (
         public_id, ledger_transaction_id, position, ledger_account_id,
         direction, amount_minor, currency, slot_funding_allocation_id,
         mission_assignment_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        input.publicId,
        input.transactionId,
        input.position,
        input.accountId,
        input.direction,
        input.amountMinor,
        input.currency,
        input.allocationId ?? null,
        input.assignmentId ?? null,
      ],
    );
  }

  private async appendAudit(
    client: PoolClient,
    input: {
      action: string;
      actorId: string | null;
      actorType: 'user' | 'service' | 'provider';
      correlationId: string;
      details: Record<string, unknown>;
      subjectId: string;
      subjectType: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_events (
         actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
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

  private async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO ${this.quotedSchema}, public`);
      const result = await work(client);
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
