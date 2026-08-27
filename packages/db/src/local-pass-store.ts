import { createHash } from 'node:crypto';

import type {
  LocalPassConflictCode,
  LocalPassFulfillmentKind,
  LocalPassOfferStatus,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type LocalPassOfferRecord = {
  businessId: string;
  businessLocationId: string;
  campaignId: string;
  committedQuantity: number;
  id: string;
  publicId: string;
  redeemedQuantity: number;
  status: LocalPassOfferStatus;
  totalQuantity: number;
  version: number;
};

export type LocalPassLinkRecord = {
  campaignId: string;
  creatorUserId: string;
  id: string;
  localPassOfferId: string;
  publicId: string;
};

export type LocalPassClaimRecord = {
  campaignId: string;
  claimedAt: Date;
  creatorUserId: string;
  expiresAt: Date;
  id: string;
  localPassOfferId: string;
  publicId: string;
  status: 'active' | 'redeemed' | 'expired';
  version: number;
};

export type LocalPassRedemptionRecord = {
  businessLocationId: string;
  fulfillmentKind: LocalPassFulfillmentKind;
  id: string;
  localPassClaimId: string;
  publicId: string;
};

export class LocalPassError extends Error {
  constructor(
    readonly code: LocalPassConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'LocalPassError';
  }
}

type OfferRow = QueryResultRow & {
  available_ends_at: Date;
  available_starts_at: Date;
  business_id: string;
  business_location_id: string;
  campaign_id: string;
  campaign_status?: string;
  committed_quantity: number;
  currency: string;
  id: string;
  preapproved_substitute_description: string | null;
  preapproved_substitute_value_minor: number | null;
  public_id: string;
  redeemed_quantity: number;
  stated_retail_value_minor: number;
  status: LocalPassOfferStatus;
  total_quantity: number;
  version: number;
};

type LinkRow = QueryResultRow & {
  campaign_id: string;
  campaign_status: string;
  creator_user_id: string;
  id: string;
  local_pass_offer_id: string;
  mission_assignment_id: string;
  offer_status: LocalPassOfferStatus;
  public_id: string;
  status: 'active' | 'revoked';
};

type ClaimRow = QueryResultRow & {
  campaign_id: string;
  claimed_at: Date;
  creator_user_id: string;
  customer_dedup_token?: string;
  expires_at: Date;
  id: string;
  local_pass_link_id: string;
  local_pass_offer_id: string;
  public_id: string;
  status: 'active' | 'redeemed' | 'expired';
  version: number;
};

type TokenRow = QueryResultRow & {
  expires_at: Date;
  id: string;
  local_pass_claim_id: string;
  rotation: number;
  status: 'active' | 'consumed' | 'expired' | 'revoked';
};

function quoteSchema(schemaName: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Database schema name must be a safe lowercase PostgreSQL identifier.');
  }
  return `"${schemaName}"`;
}

function tokenHash(token: string): string {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    throw new LocalPassError(
      'LOCAL_PASS_TOKEN_INVALID',
      409,
      'Local Pass tokens must be high-entropy URL-safe values.',
    );
  }
  return createHash('sha256').update(token).digest('hex');
}

function assertCustomerToken(value: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new LocalPassError(
      'LOCAL_PASS_TOKEN_INVALID',
      409,
      'Customer deduplication must use the versioned HMAC-style synthetic token.',
    );
  }
}

function postgresConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('constraint' in error)) return undefined;
  return typeof error.constraint === 'string' ? error.constraint : undefined;
}

function toOffer(row: OfferRow): LocalPassOfferRecord {
  return {
    businessId: row.business_id,
    businessLocationId: row.business_location_id,
    campaignId: row.campaign_id,
    committedQuantity: row.committed_quantity,
    id: row.id,
    publicId: row.public_id,
    redeemedQuantity: row.redeemed_quantity,
    status: row.status,
    totalQuantity: row.total_quantity,
    version: row.version,
  };
}

function toClaim(row: ClaimRow): LocalPassClaimRecord {
  return {
    campaignId: row.campaign_id,
    claimedAt: row.claimed_at,
    creatorUserId: row.creator_user_id,
    expiresAt: row.expires_at,
    id: row.id,
    localPassOfferId: row.local_pass_offer_id,
    publicId: row.public_id,
    status: row.status,
    version: row.version,
  };
}

export class LocalPassStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async configureOffer(input: {
    actorUserId: string;
    availableEndsAt: Date;
    availableStartsAt: Date;
    businessLocationId: string;
    campaignId: string;
    correlationId: string;
    currency: string;
    exclusions: string;
    offerDescription: string;
    preapprovedSubstituteDescription?: string;
    preapprovedSubstituteValueMinor?: number;
    publicId: string;
    purchaseRequirement?: string;
    statedRetailValueMinor: number;
    title: string;
    totalQuantity: number;
  }): Promise<LocalPassOfferRecord> {
    return this.withTransaction(async (client) => {
      if (
        input.availableEndsAt <= input.availableStartsAt ||
        input.availableEndsAt.getTime() - input.availableStartsAt.getTime() < 7 * 86_400_000 ||
        input.totalQuantity < 1 ||
        input.totalQuantity > 500 ||
        input.statedRetailValueMinor < 0 ||
        !/^[A-Z]{3}$/.test(input.currency) ||
        !input.title.trim() ||
        !input.offerDescription.trim() ||
        !input.exclusions.trim()
      ) {
        throw new LocalPassError(
          'LOCAL_PASS_OFFER_INVALID',
          409,
          'Local Pass offer terms are invalid.',
        );
      }
      const scope = await client.query<{ business_id: string }>(
        `SELECT c.business_id
           FROM campaigns c
           JOIN business_locations l ON l.id = $2 AND l.business_id = c.business_id AND l.is_active = true
           JOIN business_memberships m ON m.business_id = c.business_id AND m.user_id = $3
            AND m.status = 'active' AND m.role IN ('owner', 'manager')
          WHERE c.id = $1 AND c.status = 'draft'
          FOR UPDATE OF c, l`,
        [input.campaignId, input.businessLocationId, input.actorUserId],
      );
      const businessId = scope.rows[0]?.business_id;
      if (!businessId) {
        throw new LocalPassError(
          'LOCAL_PASS_ACCESS_DENIED',
          403,
          'Only an active business manager can configure a draft campaign offer at its venue.',
        );
      }
      if (
        input.preapprovedSubstituteDescription !== undefined ||
        input.preapprovedSubstituteValueMinor !== undefined
      ) {
        if (
          !input.preapprovedSubstituteDescription?.trim() ||
          input.preapprovedSubstituteValueMinor === undefined ||
          input.preapprovedSubstituteValueMinor < input.statedRetailValueMinor
        ) {
          throw new LocalPassError(
            'LOCAL_PASS_OFFER_INVALID',
            409,
            'A preapproved substitute must be described and worth at least the original offer.',
          );
        }
      }
      const result = await client.query<OfferRow>(
        `INSERT INTO local_pass_offers (
           public_id, campaign_id, business_id, business_location_id, title, offer_description,
           purchase_requirement, exclusions, stated_retail_value_minor, currency, total_quantity,
           available_starts_at, available_ends_at, preapproved_substitute_description,
           preapproved_substitute_value_minor, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          input.publicId,
          input.campaignId,
          businessId,
          input.businessLocationId,
          input.title.trim(),
          input.offerDescription.trim(),
          input.purchaseRequirement?.trim() || null,
          input.exclusions.trim(),
          input.statedRetailValueMinor,
          input.currency,
          input.totalQuantity,
          input.availableStartsAt,
          input.availableEndsAt,
          input.preapprovedSubstituteDescription?.trim() || null,
          input.preapprovedSubstituteValueMinor ?? null,
          input.actorUserId,
        ],
      );
      const offer = result.rows[0];
      if (!offer) throw new Error('Local Pass offer insert returned no row.');
      await client.query(
        `INSERT INTO local_pass_offer_status_history
           (local_pass_offer_id, to_status, offer_version, actor_id, actor_type, reason)
         VALUES ($1, 'configured', 1, $2, 'user', 'Initial immutable offer configuration')`,
        [offer.id, input.actorUserId],
      );
      await this.appendAudit(client, {
        action: 'local-pass.offer-configured',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { campaignId: input.campaignId },
        subjectId: offer.id,
        subjectType: 'local-pass-offer',
      });
      return toOffer(offer);
    });
  }

  async activateOffer(input: {
    actorUserId: string;
    correlationId: string;
    localPassOfferId: string;
  }): Promise<LocalPassOfferRecord> {
    return this.changeOfferStatus(input, 'configured', 'active', 'local-pass.offer-activated');
  }

  async pauseFutureClaims(input: {
    actorUserId: string;
    correlationId: string;
    localPassOfferId: string;
  }): Promise<LocalPassOfferRecord> {
    return this.changeOfferStatus(input, 'active', 'claims_paused', 'local-pass.claims-paused');
  }

  async issueCreatorLink(input: {
    correlationId: string;
    localPassOfferId: string;
    missionAssignmentId: string;
    publicId: string;
    rawLinkToken: string;
  }): Promise<LocalPassLinkRecord> {
    const hash = tokenHash(input.rawLinkToken);
    return this.withTransaction(async (client) => {
      const result = await client.query<LinkRow>(
        `INSERT INTO local_pass_links (
           public_id, local_pass_offer_id, campaign_id, mission_assignment_id,
           creator_user_id, token_hash
         )
         SELECT $1, o.id, o.campaign_id, a.id, a.creator_user_id, $4
           FROM local_pass_offers o
           JOIN campaigns c ON c.id = o.campaign_id AND c.status = 'published'
           JOIN mission_assignments a ON a.id = $3 AND a.campaign_id = o.campaign_id
            AND a.status = 'completed'
          WHERE o.id = $2 AND o.status IN ('active', 'claims_paused')
         RETURNING id, public_id, local_pass_offer_id, campaign_id, mission_assignment_id,
                   creator_user_id, status, ''::text AS campaign_status, status::text AS offer_status`,
        [input.publicId, input.localPassOfferId, input.missionAssignmentId, hash],
      );
      const row = result.rows[0];
      if (!row) {
        throw new LocalPassError(
          'LOCAL_PASS_NOT_READY',
          409,
          'Creator links require a published campaign and completed creator assignment.',
        );
      }
      await this.appendAudit(client, {
        action: 'local-pass.creator-link-issued',
        actorId: null,
        correlationId: input.correlationId,
        details: { assignmentId: input.missionAssignmentId },
        subjectId: row.id,
        subjectType: 'local-pass-link',
      });
      return {
        campaignId: row.campaign_id,
        creatorUserId: row.creator_user_id,
        id: row.id,
        localPassOfferId: row.local_pass_offer_id,
        publicId: row.public_id,
      };
    });
  }

  async recordLinkOpen(input: {
    correlationId: string;
    eventPublicId: string;
    rawLinkToken: string;
  }): Promise<void> {
    const hash = tokenHash(input.rawLinkToken);
    return this.withTransaction(async (client) => {
      const link = await this.selectLink(client, hash, false);
      if (
        !link ||
        link.status !== 'active' ||
        link.campaign_status !== 'published' ||
        link.offer_status === 'closed'
      ) {
        throw new LocalPassError('LOCAL_PASS_NOT_FOUND', 404, 'Local Pass link is unavailable.');
      }
      await client.query(
        `INSERT INTO local_pass_attribution_events
           (public_id, kind, campaign_id, local_pass_link_id, creator_user_id)
         VALUES ($1, 'link_open', $2, $3, $4)`,
        [input.eventPublicId, link.campaign_id, link.id, link.creator_user_id],
      );
    });
  }

  async claimPass(input: {
    claimPublicId: string;
    claimTokenPublicId: string;
    correlationId: string;
    customerDedupToken: string;
    eventPublicId: string;
    rawClaimToken: string;
    rawLinkToken: string;
    tokenKeyVersion: number;
  }): Promise<LocalPassClaimRecord> {
    assertCustomerToken(input.customerDedupToken);
    if (!Number.isInteger(input.tokenKeyVersion) || input.tokenKeyVersion < 1) {
      throw new LocalPassError(
        'LOCAL_PASS_TOKEN_INVALID',
        409,
        'Customer deduplication token key version must be a positive integer.',
      );
    }
    const linkHash = tokenHash(input.rawLinkToken);
    const claimTokenHash = tokenHash(input.rawClaimToken);
    try {
      return await this.withTransaction(async (client) => {
        const link = await this.selectLink(client, linkHash, true);
        if (!link || link.status !== 'active') {
          throw new LocalPassError('LOCAL_PASS_NOT_FOUND', 404, 'Local Pass link is unavailable.');
        }
        const offerResult = await client.query<OfferRow & { server_now: Date }>(
          `SELECT o.*, c.status AS campaign_status, now() AS server_now
             FROM local_pass_offers o JOIN campaigns c ON c.id = o.campaign_id
            WHERE o.id = $1 FOR UPDATE OF o`,
          [link.local_pass_offer_id],
        );
        const offer = offerResult.rows[0];
        if (!offer || offer.campaign_status !== 'published') {
          throw new LocalPassError('LOCAL_PASS_NOT_READY', 409, 'Local Pass is not published.');
        }
        if (offer.status === 'claims_paused') {
          throw new LocalPassError(
            'LOCAL_PASS_CLAIMS_PAUSED',
            409,
            'New Local Pass claims are paused.',
          );
        }
        const now = offer.server_now;
        if (
          offer.status !== 'active' ||
          now < offer.available_starts_at ||
          offer.available_ends_at.getTime() < now.getTime() + 7 * 86_400_000
        ) {
          throw new LocalPassError(
            'LOCAL_PASS_OUTSIDE_WINDOW',
            409,
            'A full seven-day claim window is unavailable.',
          );
        }
        if (offer.committed_quantity >= offer.total_quantity) {
          throw new LocalPassError(
            'LOCAL_PASS_INVENTORY_FULL',
            409,
            'Local Pass inventory is fully committed.',
          );
        }
        const claimResult = await client.query<ClaimRow>(
          `INSERT INTO local_pass_claims (
             public_id, local_pass_offer_id, local_pass_link_id, campaign_id, creator_user_id,
             customer_dedup_token, token_key_version, claimed_at, expires_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$8::timestamptz + interval '7 days')
           RETURNING *`,
          [
            input.claimPublicId,
            offer.id,
            link.id,
            link.campaign_id,
            link.creator_user_id,
            input.customerDedupToken,
            input.tokenKeyVersion,
            now,
          ],
        );
        const claim = claimResult.rows[0];
        if (!claim) throw new Error('Local Pass claim insert returned no row.');
        await client.query(
          `UPDATE local_pass_offers SET committed_quantity = committed_quantity + 1,
                  version = version + 1, updated_at = now() WHERE id = $1`,
          [offer.id],
        );
        await client.query(
          `INSERT INTO local_pass_claim_tokens
             (public_id, local_pass_claim_id, rotation, token_hash, issued_at, expires_at)
           VALUES ($1, $2, 1, $3, $4::timestamptz, $4::timestamptz + interval '5 minutes')`,
          [input.claimTokenPublicId, claim.id, claimTokenHash, now],
        );
        await client.query(
          `INSERT INTO local_pass_claim_status_history
             (local_pass_claim_id, to_status, claim_version, actor_type, reason)
           VALUES ($1, 'active', 1, 'service', 'First valid campaign claim locked attribution')`,
          [claim.id],
        );
        await client.query(
          `INSERT INTO local_pass_attribution_events
             (public_id, kind, campaign_id, local_pass_link_id, local_pass_claim_id, creator_user_id)
           VALUES ($1, 'pass_claimed', $2, $3, $4, $5)`,
          [input.eventPublicId, claim.campaign_id, link.id, claim.id, claim.creator_user_id],
        );
        await this.appendAudit(client, {
          action: 'local-pass.claimed',
          actorId: null,
          correlationId: input.correlationId,
          details: { evidence: 'pass_claimed' },
          subjectId: claim.id,
          subjectType: 'local-pass-claim',
        });
        return toClaim(claim);
      });
    } catch (error) {
      if (postgresConstraint(error) === 'local_pass_claims_campaign_customer_uq') {
        throw new LocalPassError(
          'LOCAL_PASS_ATTRIBUTION_LOCKED',
          409,
          'The first valid customer claim already locked this campaign attribution.',
        );
      }
      throw error;
    }
  }

  async rotateClaimToken(input: {
    claimId: string;
    claimTokenPublicId: string;
    correlationId: string;
    customerDedupToken: string;
    rawClaimToken: string;
  }): Promise<void> {
    assertCustomerToken(input.customerDedupToken);
    const hash = tokenHash(input.rawClaimToken);
    return this.withTransaction(async (client) => {
      const claimResult = await client.query<ClaimRow & { server_now: Date }>(
        `SELECT *, now() AS server_now FROM local_pass_claims
          WHERE id = $1 AND customer_dedup_token = $2 FOR UPDATE`,
        [input.claimId, input.customerDedupToken],
      );
      const claim = claimResult.rows[0];
      if (!claim || claim.status !== 'active') {
        throw new LocalPassError(
          'LOCAL_PASS_ACCESS_DENIED',
          403,
          'Active claim control was not proven.',
        );
      }
      if (claim.server_now >= claim.expires_at) {
        throw new LocalPassError(
          'LOCAL_PASS_TOKEN_EXPIRED',
          409,
          'The Local Pass claim has expired.',
        );
      }
      const active = await client.query<{ rotation: number }>(
        `UPDATE local_pass_claim_tokens SET status = 'revoked'
          WHERE local_pass_claim_id = $1 AND status = 'active' RETURNING rotation`,
        [claim.id],
      );
      const rotation = (active.rows[0]?.rotation ?? 0) + 1;
      await client.query(
        `INSERT INTO local_pass_claim_tokens
           (public_id, local_pass_claim_id, rotation, token_hash, issued_at, expires_at)
         VALUES ($1,$2,$3,$4,$5::timestamptz,LEAST($5::timestamptz + interval '5 minutes', $6::timestamptz))`,
        [input.claimTokenPublicId, claim.id, rotation, hash, claim.server_now, claim.expires_at],
      );
      await this.appendAudit(client, {
        action: 'local-pass.claim-token-rotated',
        actorId: null,
        correlationId: input.correlationId,
        details: { rotation },
        subjectId: claim.id,
        subjectType: 'local-pass-claim',
      });
    });
  }

  async redeemPass(input: {
    actorUserId: string;
    businessLocationId: string;
    correlationId: string;
    eventPublicId: string;
    fulfillmentKind: LocalPassFulfillmentKind;
    offerConfirmed: boolean;
    publicId: string;
    rawClaimToken: string;
    substituteDescription?: string;
    substituteValueMinor?: number;
  }): Promise<LocalPassRedemptionRecord> {
    if (!input.offerConfirmed) {
      throw new LocalPassError(
        'LOCAL_PASS_OFFER_INVALID',
        409,
        'Staff must confirm the offer was honored.',
      );
    }
    const hash = tokenHash(input.rawClaimToken);
    return this.withTransaction(async (client) => {
      const tokenResult = await client.query<TokenRow & { server_now: Date }>(
        `SELECT *, now() AS server_now FROM local_pass_claim_tokens WHERE token_hash = $1 FOR UPDATE`,
        [hash],
      );
      const token = tokenResult.rows[0];
      if (!token)
        throw new LocalPassError('LOCAL_PASS_TOKEN_INVALID', 404, 'Claim token is invalid.');
      if (token.status === 'consumed') {
        throw new LocalPassError(
          'LOCAL_PASS_TOKEN_REPLAYED',
          409,
          'Claim token was already redeemed.',
        );
      }
      if (token.status !== 'active') {
        throw new LocalPassError(
          'LOCAL_PASS_TOKEN_INVALID',
          409,
          'Claim token is no longer active.',
        );
      }
      if (token.server_now >= token.expires_at) {
        throw new LocalPassError('LOCAL_PASS_TOKEN_EXPIRED', 409, 'Claim token has expired.');
      }
      const claimResult = await client.query<ClaimRow>(
        `SELECT * FROM local_pass_claims WHERE id = $1 FOR UPDATE`,
        [token.local_pass_claim_id],
      );
      const claim = claimResult.rows[0];
      if (!claim) throw new LocalPassError('LOCAL_PASS_NOT_FOUND', 404, 'Claim does not exist.');
      if (claim.status === 'redeemed') {
        throw new LocalPassError(
          'LOCAL_PASS_ALREADY_REDEEMED',
          409,
          'Local Pass was already redeemed.',
        );
      }
      if (claim.status !== 'active' || token.server_now >= claim.expires_at) {
        throw new LocalPassError('LOCAL_PASS_TOKEN_EXPIRED', 409, 'Local Pass claim has expired.');
      }
      const offerResult = await client.query<OfferRow>(
        `SELECT * FROM local_pass_offers WHERE id = $1 FOR UPDATE`,
        [claim.local_pass_offer_id],
      );
      const offer = offerResult.rows[0];
      if (!offer) throw new LocalPassError('LOCAL_PASS_NOT_FOUND', 404, 'Offer does not exist.');
      if (input.businessLocationId !== offer.business_location_id) {
        throw new LocalPassError(
          'LOCAL_PASS_WRONG_VENUE',
          403,
          'This pass belongs to a different venue.',
        );
      }
      await this.assertScanner(
        client,
        input.actorUserId,
        offer.business_id,
        offer.business_location_id,
      );
      this.assertFulfillment(input, offer);
      const redemptionResult = await client.query<{
        business_location_id: string;
        fulfillment_kind: LocalPassFulfillmentKind;
        id: string;
        local_pass_claim_id: string;
        public_id: string;
      }>(
        `INSERT INTO local_pass_redemptions (
           public_id, local_pass_claim_id, local_pass_claim_token_id, local_pass_offer_id,
           business_location_id, redeemed_by_user_id, fulfillment_kind,
           substitute_description, substitute_value_minor, offer_confirmed, occurred_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
         RETURNING id, public_id, local_pass_claim_id, business_location_id, fulfillment_kind`,
        [
          input.publicId,
          claim.id,
          token.id,
          offer.id,
          input.businessLocationId,
          input.actorUserId,
          input.fulfillmentKind,
          input.substituteDescription?.trim() || null,
          input.substituteValueMinor ?? null,
          token.server_now,
        ],
      );
      const redemption = redemptionResult.rows[0];
      if (!redemption) throw new Error('Local Pass redemption insert returned no row.');
      await client.query(
        `UPDATE local_pass_claim_tokens SET status = 'consumed', consumed_at = $2 WHERE id = $1`,
        [token.id, token.server_now],
      );
      await client.query(
        `UPDATE local_pass_claims SET status = 'redeemed', redeemed_at = $2,
                version = version + 1, updated_at = $2 WHERE id = $1`,
        [claim.id, token.server_now],
      );
      await client.query(
        `UPDATE local_pass_offers SET redeemed_quantity = redeemed_quantity + 1,
                version = version + 1, updated_at = $2 WHERE id = $1`,
        [offer.id, token.server_now],
      );
      await client.query(
        `INSERT INTO local_pass_claim_status_history
           (local_pass_claim_id, from_status, to_status, claim_version, actor_id, actor_type, reason, occurred_at)
         VALUES ($1, 'active', 'redeemed', $2, $3, 'user', 'Venue staff confirmed offer fulfillment', $4)`,
        [claim.id, claim.version + 1, input.actorUserId, token.server_now],
      );
      await client.query(
        `INSERT INTO local_pass_attribution_events (
           public_id, kind, campaign_id, local_pass_link_id, local_pass_claim_id,
           local_pass_redemption_id, creator_user_id, occurred_at
         ) VALUES ($1,'verified_pass_redemption',$2,$3,$4,$5,$6,$7)`,
        [
          input.eventPublicId,
          claim.campaign_id,
          claim.local_pass_link_id,
          claim.id,
          redemption.id,
          claim.creator_user_id,
          token.server_now,
        ],
      );
      await this.appendAudit(client, {
        action: 'local-pass.redeemed',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { evidence: 'verified_pass_redemption' },
        subjectId: redemption.id,
        subjectType: 'local-pass-redemption',
      });
      return {
        businessLocationId: redemption.business_location_id,
        fulfillmentKind: redemption.fulfillment_kind,
        id: redemption.id,
        localPassClaimId: redemption.local_pass_claim_id,
        publicId: redemption.public_id,
      };
    });
  }

  async expireClaim(input: {
    claimId: string;
    correlationId: string;
  }): Promise<LocalPassClaimRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<ClaimRow & { server_now: Date }>(
        `SELECT *, now() AS server_now FROM local_pass_claims WHERE id = $1 FOR UPDATE`,
        [input.claimId],
      );
      const claim = result.rows[0];
      if (!claim) throw new LocalPassError('LOCAL_PASS_NOT_FOUND', 404, 'Claim does not exist.');
      if (claim.status !== 'active' || claim.server_now < claim.expires_at) {
        throw new LocalPassError(
          'LOCAL_PASS_OUTSIDE_WINDOW',
          409,
          'Only an expired active claim can be released.',
        );
      }
      const nextVersion = claim.version + 1;
      const updated = await client.query<ClaimRow>(
        `UPDATE local_pass_claims SET status = 'expired', expired_at = $2,
                version = $3, updated_at = $2 WHERE id = $1 RETURNING *`,
        [claim.id, claim.server_now, nextVersion],
      );
      await client.query(
        `UPDATE local_pass_offers SET committed_quantity = committed_quantity - 1,
                version = version + 1, updated_at = $2 WHERE id = $1`,
        [claim.local_pass_offer_id, claim.server_now],
      );
      await client.query(
        `UPDATE local_pass_claim_tokens SET status = 'expired'
          WHERE local_pass_claim_id = $1 AND status = 'active'`,
        [claim.id],
      );
      await client.query(
        `INSERT INTO local_pass_claim_status_history
           (local_pass_claim_id, from_status, to_status, claim_version, actor_type, reason, occurred_at)
         VALUES ($1,'active','expired',$2,'service','Seven-day pass expired unredeemed',$3)`,
        [claim.id, nextVersion, claim.server_now],
      );
      await this.appendAudit(client, {
        action: 'local-pass.claim-expired',
        actorId: null,
        correlationId: input.correlationId,
        details: { inventoryReleased: 1 },
        subjectId: claim.id,
        subjectType: 'local-pass-claim',
      });
      const row = updated.rows[0];
      if (!row) throw new Error('Expired claim update returned no row.');
      return toClaim(row);
    });
  }

  private async changeOfferStatus(
    input: { actorUserId: string; correlationId: string; localPassOfferId: string },
    fromStatus: LocalPassOfferStatus,
    toStatus: LocalPassOfferStatus,
    action: string,
  ): Promise<LocalPassOfferRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<OfferRow>(
        `SELECT o.*, c.status AS campaign_status
           FROM local_pass_offers o JOIN campaigns c ON c.id = o.campaign_id
          WHERE o.id = $1 AND EXISTS (
            SELECT 1 FROM business_memberships m WHERE m.business_id = o.business_id
             AND m.user_id = $2 AND m.status = 'active' AND m.role IN ('owner','manager')
          ) FOR UPDATE OF o`,
        [input.localPassOfferId, input.actorUserId],
      );
      const offer = result.rows[0];
      if (!offer) throw new LocalPassError('LOCAL_PASS_ACCESS_DENIED', 403, 'Offer access denied.');
      if (offer.campaign_status !== 'published' || offer.status !== fromStatus) {
        throw new LocalPassError(
          'LOCAL_PASS_NOT_READY',
          409,
          'Offer cannot make that transition now.',
        );
      }
      const nextVersion = offer.version + 1;
      const updated = await client.query<OfferRow>(
        `UPDATE local_pass_offers SET status = $2, version = $3, updated_at = now()
          WHERE id = $1 RETURNING *`,
        [offer.id, toStatus, nextVersion],
      );
      await client.query(
        `INSERT INTO local_pass_offer_status_history
           (local_pass_offer_id, from_status, to_status, offer_version, actor_id, actor_type)
         VALUES ($1,$2,$3,$4,$5,'user')`,
        [offer.id, fromStatus, toStatus, nextVersion, input.actorUserId],
      );
      await this.appendAudit(client, {
        action,
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: {},
        subjectId: offer.id,
        subjectType: 'local-pass-offer',
      });
      const row = updated.rows[0];
      if (!row) throw new Error('Offer status update returned no row.');
      return toOffer(row);
    });
  }

  private async selectLink(
    client: PoolClient,
    hash: string,
    lock: boolean,
  ): Promise<LinkRow | undefined> {
    const result = await client.query<LinkRow>(
      `SELECT l.id, l.public_id, l.local_pass_offer_id, l.campaign_id,
              l.mission_assignment_id, l.creator_user_id, l.status,
              c.status AS campaign_status, o.status AS offer_status
         FROM local_pass_links l
         JOIN campaigns c ON c.id = l.campaign_id
         JOIN local_pass_offers o ON o.id = l.local_pass_offer_id
        WHERE l.token_hash = $1${lock ? ' FOR UPDATE OF l' : ''}`,
      [hash],
    );
    return result.rows[0];
  }

  private async assertScanner(
    client: PoolClient,
    actorUserId: string,
    businessId: string,
    locationId: string,
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM business_memberships m
        WHERE m.business_id = $1 AND m.user_id = $2 AND m.status = 'active'
          AND (
            m.role IN ('owner','manager') OR
            (m.role = 'venue_staff' AND EXISTS (
              SELECT 1 FROM venue_staff_assignments vsa
               WHERE vsa.business_membership_id = m.id AND vsa.business_location_id = $3
                 AND vsa.status = 'active' AND now() BETWEEN vsa.window_starts_at AND vsa.window_ends_at
            ))
          )`,
      [businessId, actorUserId, locationId],
    );
    if (result.rowCount !== 1) {
      throw new LocalPassError(
        'LOCAL_PASS_ACCESS_DENIED',
        403,
        'Actor is not authorized to redeem at this venue.',
      );
    }
  }

  private assertFulfillment(
    input: {
      fulfillmentKind: LocalPassFulfillmentKind;
      substituteDescription?: string;
      substituteValueMinor?: number;
    },
    offer: OfferRow,
  ): void {
    if (input.fulfillmentKind === 'original_offer') {
      if (input.substituteDescription !== undefined || input.substituteValueMinor !== undefined) {
        throw new LocalPassError(
          'LOCAL_PASS_OFFER_INVALID',
          409,
          'Original offer cannot include substitute terms.',
        );
      }
      return;
    }
    if (
      !input.substituteDescription?.trim() ||
      input.substituteValueMinor === undefined ||
      input.substituteValueMinor < offer.stated_retail_value_minor
    ) {
      throw new LocalPassError(
        'LOCAL_PASS_OFFER_INVALID',
        409,
        'Substitute must be accepted and equal or greater value.',
      );
    }
    if (
      input.fulfillmentKind === 'preapproved_substitute' &&
      (input.substituteDescription.trim() !== offer.preapproved_substitute_description ||
        input.substituteValueMinor !== offer.preapproved_substitute_value_minor)
    ) {
      throw new LocalPassError(
        'LOCAL_PASS_OFFER_INVALID',
        409,
        'Substitute does not match the preapproved offer.',
      );
    }
  }

  private async appendAudit(
    client: PoolClient,
    input: {
      action: string;
      actorId: string | null;
      correlationId: string;
      details: Record<string, unknown>;
      subjectId: string;
      subjectType: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_events
         (actor_id, actor_type, action, correlation_id, subject_type, subject_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        input.actorId,
        input.actorId ? 'user' : 'service',
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
