import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type {
  LocalPassConflictCode,
  LocalPassChallengePurpose,
  LocalPassFulfillmentKind,
  LocalPassIncidentReason,
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

export type LocalPassChallengeRecord = {
  expiresAt: Date;
  publicId: string;
  resendNotBefore: Date;
  sendNumber: number;
  status: 'pending' | 'verified';
};

export type LocalPassCustomerStatus = {
  claimPublicId: string;
  expiresAt: Date;
  fulfillmentState:
    | 'active'
    | 'refusal_under_review'
    | 'refusal_confirmed_pass_still_valid'
    | 'redeemed'
    | 'expired';
  offer: {
    currency: string;
    description: string;
    exclusions: string;
    purchaseRequirement: string | null;
    statedRetailValueMinor: number;
    title: string;
  };
  venue: { city: string; name: string; region: string };
};

export type LocalPassCampaignReport = {
  campaignId: string;
  claims: number;
  completedCampaignCostMinor: number;
  confirmedFulfillmentIncidents: number;
  costPerVerifiedRedemptionMinor: number | null;
  verifiedRedemptions: number;
  verifiedRedemptionConversionBasisPoints: number;
};

type LocalPassSecrets = {
  customerHmacKey: string;
  keyVersion: number;
  otpHmacKey: string;
  riskHmacKey: string;
};

export class LocalPassError extends Error {
  constructor(
    readonly code: LocalPassConflictCode,
    readonly httpStatus: 403 | 404 | 409 | 429,
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
  customer_dedup_token: string | null;
  expires_at: Date;
  id: string;
  local_pass_link_id: string;
  local_pass_offer_id: string;
  public_id: string;
  status: 'active' | 'redeemed' | 'expired';
  version: number;
};

type ChallengeRow = QueryResultRow & {
  campaign_id: string;
  consumed_at: Date | null;
  destination_dedup_token: string | null;
  expires_at: Date;
  id: string;
  local_pass_claim_id: string | null;
  local_pass_link_id: string | null;
  max_verify_attempts: number;
  otp_digest: string | null;
  public_id: string;
  purpose: LocalPassChallengePurpose;
  resend_not_before: Date;
  send_number: number;
  status: 'pending' | 'verified' | 'consumed' | 'superseded' | 'locked' | 'expired';
  verify_attempt_count: number;
  verified_at: Date | null;
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

function normalizeDestination(value: string): string {
  const normalized = value.replace(/[\s()-]/g, '');
  if (!/^\+[1-9][0-9]{9,14}$/.test(normalized)) {
    throw new LocalPassError(
      'LOCAL_PASS_CHALLENGE_INVALID',
      409,
      'Customer verification requires a valid normalized phone destination.',
    );
  }
  return normalized;
}

function assertOtp(value: string): void {
  if (!/^[0-9]{6}$/.test(value)) {
    throw new LocalPassError(
      'LOCAL_PASS_CHALLENGE_INVALID',
      409,
      'The verification code must contain six digits.',
    );
  }
}

function secureDigestEqual(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
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
    private readonly secrets: LocalPassSecrets,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
    for (const key of [secrets.customerHmacKey, secrets.otpHmacKey, secrets.riskHmacKey]) {
      if (key.length < 32)
        throw new Error('Local Pass HMAC keys must contain at least 32 characters.');
    }
    if (!Number.isInteger(secrets.keyVersion) || secrets.keyVersion < 1) {
      throw new Error('Local Pass key version must be a positive integer.');
    }
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

  async issueCustomerChallenge(input: {
    destinationCiphertext: string;
    normalizedDestination: string;
    otp: string;
    publicId: string;
    purpose: LocalPassChallengePurpose;
    rawLinkToken?: string;
    claimPublicId?: string;
    riskSignal: string;
  }): Promise<LocalPassChallengeRecord> {
    assertOtp(input.otp);
    if (!/^enc:v[0-9]+:[A-Za-z0-9_+/=-]{16,2048}$/.test(input.destinationCiphertext)) {
      throw new LocalPassError(
        'LOCAL_PASS_CHALLENGE_INVALID',
        409,
        'Only application-encrypted contact ciphertext may cross the storage boundary.',
      );
    }
    if (input.riskSignal.length < 8 || input.riskSignal.length > 512) {
      throw new LocalPassError('LOCAL_PASS_CHALLENGE_INVALID', 409, 'Risk signal is invalid.');
    }
    const destinationToken = this.customerToken(normalizeDestination(input.normalizedDestination));
    const riskToken = this.riskToken(input.riskSignal);
    const linkHash = input.rawLinkToken ? tokenHash(input.rawLinkToken) : undefined;

    return this.withTransaction(async (client) => {
      const target = await client.query<{
        campaign_id: string;
        claim_id: string | null;
        customer_dedup_token: string | null;
        link_id: string;
      }>(
        input.purpose === 'claim'
          ? `SELECT l.campaign_id, l.id AS link_id, NULL::uuid AS claim_id,
                    NULL::text AS customer_dedup_token
               FROM local_pass_links l JOIN campaigns c ON c.id = l.campaign_id
               JOIN local_pass_offers o ON o.id = l.local_pass_offer_id
              WHERE l.token_hash = $1 AND l.status = 'active' AND c.status = 'published'
                AND o.status IN ('active','claims_paused')`
          : `SELECT c.campaign_id, c.local_pass_link_id AS link_id, c.id AS claim_id,
                    c.customer_dedup_token
               FROM local_pass_claims c
              WHERE c.public_id = $1 AND c.status = 'active' AND c.expires_at > now()`,
        [input.purpose === 'claim' ? linkHash : input.claimPublicId],
      );
      const row = target.rows[0];
      if (!row) {
        throw new LocalPassError(
          'LOCAL_PASS_NOT_FOUND',
          404,
          'Local Pass verification target is unavailable.',
        );
      }
      if (input.purpose !== 'claim' && row.customer_dedup_token !== destinationToken) {
        throw new LocalPassError(
          'LOCAL_PASS_ACCESS_DENIED',
          403,
          'Customer control was not proven.',
        );
      }
      for (const lockKey of [destinationToken, riskToken, row.link_id].sort()) {
        await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [lockKey]);
      }
      const recent = await client.query<{
        destination_count: number;
        last_issued_at: Date | null;
        risk_count: number;
        target_count: number;
      }>(
        `SELECT
           count(*) FILTER (WHERE destination_dedup_token = $1)::int AS destination_count,
           count(*) FILTER (WHERE risk_dedup_token = $2)::int AS risk_count,
           count(*) FILTER (WHERE local_pass_link_id = $3)::int AS target_count,
           max(issued_at) FILTER (
             WHERE destination_dedup_token = $1 AND purpose = $4
               AND local_pass_link_id = $3 AND local_pass_claim_id IS NOT DISTINCT FROM $5
           ) AS last_issued_at
         FROM local_pass_customer_challenges
         WHERE issued_at > now() - interval '15 minutes'
           AND (destination_dedup_token = $1 OR risk_dedup_token = $2 OR local_pass_link_id = $3)`,
        [destinationToken, riskToken, row.link_id, input.purpose, row.claim_id],
      );
      const rate = recent.rows[0];
      const nowResult = await client.query<{ server_now: Date }>('SELECT now() AS server_now');
      const now = nowResult.rows[0]?.server_now;
      if (!now) throw new Error('Database clock unavailable.');
      if (
        (rate?.last_issued_at && now.getTime() - rate.last_issued_at.getTime() < 60_000) ||
        (rate?.destination_count ?? 0) >= 3 ||
        (rate?.risk_count ?? 0) >= 3 ||
        (rate?.target_count ?? 0) >= 3
      ) {
        throw new LocalPassError(
          'LOCAL_PASS_RATE_LIMITED',
          429,
          'Verification request limit reached. Try again later.',
        );
      }
      await client.query(
        `UPDATE local_pass_customer_challenges SET status = 'superseded'
          WHERE status IN ('pending','verified') AND purpose = $1
            AND local_pass_link_id = $2 AND local_pass_claim_id IS NOT DISTINCT FROM $3`,
        [input.purpose, row.link_id, row.claim_id],
      );
      const sendNumber =
        Math.max(rate?.destination_count ?? 0, rate?.risk_count ?? 0, rate?.target_count ?? 0) + 1;
      const digest = this.otpDigest(input.publicId, input.otp);
      const inserted = await client.query<ChallengeRow>(
        `INSERT INTO local_pass_customer_challenges (
           public_id, local_pass_link_id, local_pass_claim_id, campaign_id, purpose,
           destination_dedup_token, destination_token_key_version, destination_ciphertext,
           risk_dedup_token, risk_token_key_version, otp_digest, send_number,
           issued_at, resend_not_before, expires_at, contact_delete_after, linkage_delete_after
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$7,$10,$11,$12::timestamptz,
                   $12::timestamptz + interval '60 seconds',$12::timestamptz + interval '5 minutes',
                   $12::timestamptz + interval '5 minutes' + interval '30 days',
                   $12::timestamptz + interval '5 minutes' + interval '12 months')
         RETURNING *`,
        [
          input.publicId,
          row.link_id,
          row.claim_id,
          row.campaign_id,
          input.purpose,
          destinationToken,
          this.secrets.keyVersion,
          input.destinationCiphertext,
          riskToken,
          digest,
          sendNumber,
          now,
        ],
      );
      const challenge = inserted.rows[0];
      if (!challenge) throw new Error('Customer challenge insert returned no row.');
      return {
        expiresAt: challenge.expires_at,
        publicId: challenge.public_id,
        resendNotBefore: challenge.resend_not_before,
        sendNumber: challenge.send_number,
        status: 'pending',
      };
    });
  }

  async verifyCustomerChallenge(input: {
    otp: string;
    publicId: string;
  }): Promise<LocalPassChallengeRecord> {
    assertOtp(input.otp);
    const outcome = await this.withTransaction(async (client) => {
      const result = await client.query<ChallengeRow & { server_now: Date }>(
        `SELECT *, now() AS server_now FROM local_pass_customer_challenges
          WHERE public_id = $1 FOR UPDATE`,
        [input.publicId],
      );
      const challenge = result.rows[0];
      if (!challenge || !challenge.otp_digest) return { kind: 'invalid' as const };
      if (challenge.status === 'verified' || challenge.status === 'consumed') {
        return { kind: 'replayed' as const };
      }
      if (challenge.status !== 'pending') return { kind: 'invalid' as const };
      if (challenge.server_now >= challenge.expires_at) {
        await client.query(
          `UPDATE local_pass_customer_challenges SET status = 'expired' WHERE id = $1`,
          [challenge.id],
        );
        return { kind: 'expired' as const };
      }
      const actual = this.otpDigest(challenge.public_id, input.otp);
      if (!secureDigestEqual(actual, challenge.otp_digest)) {
        const attempts = challenge.verify_attempt_count + 1;
        await client.query(
          `UPDATE local_pass_customer_challenges
              SET verify_attempt_count = $2, status = CASE WHEN $2 >= max_verify_attempts THEN 'locked' ELSE status END
            WHERE id = $1`,
          [challenge.id, attempts],
        );
        return {
          kind:
            attempts >= challenge.max_verify_attempts ? ('locked' as const) : ('invalid' as const),
        };
      }
      const verified = await client.query<ChallengeRow>(
        `UPDATE local_pass_customer_challenges SET status = 'verified', verified_at = $2
          WHERE id = $1 RETURNING *`,
        [challenge.id, challenge.server_now],
      );
      return { challenge: verified.rows[0], kind: 'verified' as const };
    });
    if (outcome.kind === 'expired') {
      throw new LocalPassError(
        'LOCAL_PASS_CHALLENGE_EXPIRED',
        409,
        'Verification challenge expired.',
      );
    }
    if (outcome.kind === 'replayed') {
      throw new LocalPassError(
        'LOCAL_PASS_CHALLENGE_REPLAYED',
        409,
        'Verification challenge was already used.',
      );
    }
    if (outcome.kind === 'locked') {
      throw new LocalPassError('LOCAL_PASS_RATE_LIMITED', 429, 'Verification attempts are locked.');
    }
    if (outcome.kind !== 'verified' || !outcome.challenge) {
      throw new LocalPassError(
        'LOCAL_PASS_CHALLENGE_INVALID',
        409,
        'Verification code is invalid.',
      );
    }
    return {
      expiresAt: outcome.challenge.expires_at,
      publicId: outcome.challenge.public_id,
      resendNotBefore: outcome.challenge.resend_not_before,
      sendNumber: outcome.challenge.send_number,
      status: 'verified',
    };
  }

  async claimPass(input: {
    claimPublicId: string;
    claimTokenPublicId: string;
    challengePublicId: string;
    correlationId: string;
    eventPublicId: string;
    rawClaimToken: string;
    rawLinkToken: string;
  }): Promise<LocalPassClaimRecord> {
    const linkHash = tokenHash(input.rawLinkToken);
    const claimTokenHash = tokenHash(input.rawClaimToken);
    try {
      return await this.withTransaction(async (client) => {
        const link = await this.selectLink(client, linkHash, true);
        if (!link || link.status !== 'active') {
          throw new LocalPassError('LOCAL_PASS_NOT_FOUND', 404, 'Local Pass link is unavailable.');
        }
        const challengeResult = await client.query<ChallengeRow>(
          `SELECT * FROM local_pass_customer_challenges
            WHERE public_id = $1 AND expires_at > now() FOR UPDATE`,
          [input.challengePublicId],
        );
        const challenge = challengeResult.rows[0];
        if (
          !challenge ||
          challenge.status !== 'verified' ||
          challenge.purpose !== 'claim' ||
          challenge.local_pass_link_id !== link.id ||
          !challenge.destination_dedup_token
        ) {
          throw new LocalPassError(
            'LOCAL_PASS_CHALLENGE_INVALID',
            409,
            'A fresh verified claim challenge is required.',
          );
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
            challenge.destination_dedup_token,
            this.secrets.keyVersion,
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
        await client.query(
          `UPDATE local_pass_customer_challenges SET status = 'consumed', consumed_at = $2
            WHERE id = $1`,
          [challenge.id, now],
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

  async recoverActivePass(input: {
    challengePublicId: string;
    claimPublicId: string;
    claimTokenPublicId: string;
    correlationId: string;
    rawClaimToken: string;
  }): Promise<void> {
    const hash = tokenHash(input.rawClaimToken);
    return this.withTransaction(async (client) => {
      const claimResult = await client.query<ClaimRow & { server_now: Date }>(
        `SELECT *, now() AS server_now FROM local_pass_claims
          WHERE public_id = $1 FOR UPDATE`,
        [input.claimPublicId],
      );
      const claim = claimResult.rows[0];
      if (!claim || claim.status !== 'active') {
        throw new LocalPassError(
          'LOCAL_PASS_ACCESS_DENIED',
          403,
          'Active claim control was not proven.',
        );
      }
      const challengeResult = await client.query<ChallengeRow>(
        `SELECT * FROM local_pass_customer_challenges
          WHERE public_id = $1 AND status = 'verified' AND purpose = 'recovery'
            AND local_pass_claim_id = $2 AND expires_at > now() FOR UPDATE`,
        [input.challengePublicId, claim.id],
      );
      const challenge = challengeResult.rows[0];
      if (!challenge || challenge.destination_dedup_token !== claim.customer_dedup_token) {
        throw new LocalPassError(
          'LOCAL_PASS_CHALLENGE_INVALID',
          409,
          'A fresh verified recovery challenge is required.',
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
      await client.query(
        `UPDATE local_pass_customer_challenges SET status = 'consumed', consumed_at = $2 WHERE id = $1`,
        [challenge.id, claim.server_now],
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
    customerAcceptanceChallengePublicId?: string;
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
      const openIncident = await client.query(
        `SELECT 1 FROM local_pass_fulfillment_incidents
          WHERE local_pass_claim_id = $1 AND status = 'open'`,
        [claim.id],
      );
      if (openIncident.rowCount) {
        throw new LocalPassError(
          'LOCAL_PASS_REVIEW_REQUIRED',
          409,
          'The customer report must be reviewed before redemption.',
        );
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
      let acceptanceChallenge: ChallengeRow | undefined;
      if (input.fulfillmentKind === 'customer_accepted_substitute') {
        const acceptance = await client.query<ChallengeRow>(
          `SELECT * FROM local_pass_customer_challenges
            WHERE public_id = $1 AND local_pass_claim_id = $2
              AND purpose = 'substitute_acceptance' AND status = 'verified'
              AND expires_at > now() FOR UPDATE`,
          [input.customerAcceptanceChallengePublicId, claim.id],
        );
        acceptanceChallenge = acceptance.rows[0];
        if (!acceptanceChallenge) {
          throw new LocalPassError(
            'LOCAL_PASS_CHALLENGE_INVALID',
            409,
            'Customer acceptance must be verified for an unapproved substitute.',
          );
        }
      }
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
      if (acceptanceChallenge) {
        await client.query(
          `UPDATE local_pass_customer_challenges SET status = 'consumed', consumed_at = $2 WHERE id = $1`,
          [acceptanceChallenge.id, token.server_now],
        );
      }
      await client.query(
        `UPDATE local_pass_claims SET status = 'redeemed', redeemed_at = $2::timestamptz,
                customer_linkage_delete_after = $2::timestamptz + interval '12 months',
                version = version + 1, updated_at = $2::timestamptz WHERE id = $1`,
        [claim.id, token.server_now],
      );
      await client.query(
        `UPDATE local_pass_customer_challenges
            SET contact_delete_after = GREATEST(contact_delete_after, $2::timestamptz + interval '30 days'),
                linkage_delete_after = GREATEST(linkage_delete_after, $2::timestamptz + interval '12 months')
          WHERE local_pass_claim_id = $1 OR destination_dedup_token = $3`,
        [claim.id, token.server_now, claim.customer_dedup_token],
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
        `UPDATE local_pass_claims SET status = 'expired', expired_at = $2::timestamptz,
                customer_linkage_delete_after = $2::timestamptz + interval '12 months',
                version = $3, updated_at = $2::timestamptz WHERE id = $1 RETURNING *`,
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
        `UPDATE local_pass_customer_challenges
            SET contact_delete_after = GREATEST(contact_delete_after, $2::timestamptz + interval '30 days'),
                linkage_delete_after = GREATEST(linkage_delete_after, $2::timestamptz + interval '12 months')
          WHERE local_pass_claim_id = $1 OR destination_dedup_token = $3`,
        [claim.id, claim.server_now, claim.customer_dedup_token],
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

  async reportFulfillmentProblem(input: {
    challengePublicId: string;
    claimPublicId: string;
    correlationId: string;
    publicId: string;
    reason: LocalPassIncidentReason;
    statement: string;
  }): Promise<{ publicId: string; status: 'open' }> {
    const statement = input.statement.trim();
    if (statement.length < 10 || statement.length > 1000) {
      throw new LocalPassError(
        'LOCAL_PASS_OFFER_INVALID',
        409,
        'Customer report must contain between 10 and 1000 characters.',
      );
    }
    return this.withTransaction(async (client) => {
      const claimResult = await client.query<
        ClaimRow & { business_id: string; business_location_id: string; server_now: Date }
      >(
        `SELECT c.*, o.business_id, o.business_location_id, now() AS server_now
           FROM local_pass_claims c JOIN local_pass_offers o ON o.id = c.local_pass_offer_id
          WHERE c.public_id = $1 FOR UPDATE OF c`,
        [input.claimPublicId],
      );
      const claim = claimResult.rows[0];
      if (!claim || claim.status !== 'active' || claim.server_now >= claim.expires_at) {
        throw new LocalPassError('LOCAL_PASS_NOT_FOUND', 404, 'Active Local Pass is unavailable.');
      }
      const challengeResult = await client.query<ChallengeRow>(
        `SELECT * FROM local_pass_customer_challenges
          WHERE public_id = $1 AND local_pass_claim_id = $2
            AND purpose = 'refusal_report' AND status = 'verified' AND expires_at > now()
          FOR UPDATE`,
        [input.challengePublicId, claim.id],
      );
      const challenge = challengeResult.rows[0];
      if (!challenge || challenge.destination_dedup_token !== claim.customer_dedup_token) {
        throw new LocalPassError(
          'LOCAL_PASS_CHALLENGE_INVALID',
          409,
          'A fresh verified customer report challenge is required.',
        );
      }
      const incident = await client.query<{ id: string; public_id: string }>(
        `INSERT INTO local_pass_fulfillment_incidents (
           public_id, local_pass_claim_id, local_pass_offer_id, campaign_id, business_id,
           business_location_id, customer_challenge_id, reason, customer_statement, reported_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, public_id`,
        [
          input.publicId,
          claim.id,
          claim.local_pass_offer_id,
          claim.campaign_id,
          claim.business_id,
          claim.business_location_id,
          challenge.id,
          input.reason,
          statement,
          claim.server_now,
        ],
      );
      const row = incident.rows[0];
      if (!row) throw new Error('Fulfillment incident insert returned no row.');
      await client.query(
        `INSERT INTO local_pass_fulfillment_incident_history (
           local_pass_fulfillment_incident_id, to_status, incident_version,
           actor_type, reason, occurred_at
         ) VALUES ($1,'open',1,'service','Customer submitted verified fulfillment report',$2)`,
        [row.id, claim.server_now],
      );
      await client.query(
        `UPDATE local_pass_customer_challenges SET status = 'consumed', consumed_at = $2 WHERE id = $1`,
        [challenge.id, claim.server_now],
      );
      await this.appendAudit(client, {
        action: 'local-pass.fulfillment-problem-reported',
        actorId: null,
        correlationId: input.correlationId,
        details: { reason: input.reason },
        subjectId: row.id,
        subjectType: 'local-pass-fulfillment-incident',
      });
      return { publicId: row.public_id, status: 'open' };
    });
  }

  async reviewFulfillmentProblem(input: {
    actorUserId: string;
    correlationId: string;
    incidentPublicId: string;
    intentional: boolean;
    resolution: 'confirmed' | 'dismissed';
    reviewReason: string;
  }): Promise<{ businessPaused: boolean; status: 'confirmed' | 'dismissed' }> {
    const reason = input.reviewReason.trim();
    if (reason.length < 10 || reason.length > 1000) {
      throw new LocalPassError('LOCAL_PASS_OFFER_INVALID', 409, 'Review reason is invalid.');
    }
    return this.withTransaction(async (client) => {
      const authorized = await client.query(
        `SELECT 1 FROM platform_staff_memberships
          WHERE user_id = $1 AND status = 'active'
            AND role IN ('trust_safety_reviewer','admin')`,
        [input.actorUserId],
      );
      if (!authorized.rowCount) {
        throw new LocalPassError(
          'LOCAL_PASS_ACCESS_DENIED',
          403,
          'Trust and Safety access denied.',
        );
      }
      const incidentResult = await client.query<{
        business_id: string;
        id: string;
        status: string;
        version: number;
      }>(
        `SELECT id, business_id, status, version FROM local_pass_fulfillment_incidents
          WHERE public_id = $1 FOR UPDATE`,
        [input.incidentPublicId],
      );
      const incident = incidentResult.rows[0];
      if (!incident || incident.status !== 'open') {
        throw new LocalPassError('LOCAL_PASS_REVIEW_REQUIRED', 409, 'Open report is unavailable.');
      }
      const updated = await client.query<{ server_now: Date }>(
        `UPDATE local_pass_fulfillment_incidents
            SET status = $2, intentional = $3, reviewed_by_user_id = $4,
                review_reason = $5, reviewed_at = now(), version = version + 1
          WHERE id = $1 RETURNING reviewed_at AS server_now`,
        [incident.id, input.resolution, input.intentional, input.actorUserId, reason],
      );
      const now = updated.rows[0]?.server_now;
      if (!now) throw new Error('Fulfillment review update returned no row.');
      await client.query(
        `INSERT INTO local_pass_fulfillment_incident_history (
           local_pass_fulfillment_incident_id, from_status, to_status, incident_version,
           actor_user_id, actor_type, reason, occurred_at
         ) VALUES ($1,'open',$2,$3,$4,'user',$5,$6)`,
        [incident.id, input.resolution, incident.version + 1, input.actorUserId, reason, now],
      );
      let businessPaused = false;
      if (input.resolution === 'confirmed') {
        const count = await client.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM local_pass_fulfillment_incidents
            WHERE business_id = $1 AND status = 'confirmed'`,
          [incident.business_id],
        );
        if (input.intentional || (count.rows[0]?.count ?? 0) >= 2) {
          const paused = await client.query<{ id: string; version: number }>(
            `UPDATE local_pass_offers SET status = 'claims_paused', version = version + 1,
                    updated_at = $2
              WHERE business_id = $1 AND status = 'active'
              RETURNING id, version`,
            [incident.business_id, now],
          );
          for (const offer of paused.rows) {
            await client.query(
              `INSERT INTO local_pass_offer_status_history (
                 local_pass_offer_id, from_status, to_status, offer_version,
                 actor_id, actor_type, reason, occurred_at
               ) VALUES ($1,'active','claims_paused',$2,$3,'user',$4,$5)`,
              [offer.id, offer.version, input.actorUserId, 'Confirmed fulfillment failure', now],
            );
          }
          businessPaused = (paused.rowCount ?? 0) > 0;
        }
      }
      await this.appendAudit(client, {
        action: 'local-pass.fulfillment-problem-reviewed',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { businessPaused, intentional: input.intentional, resolution: input.resolution },
        subjectId: incident.id,
        subjectType: 'local-pass-fulfillment-incident',
      });
      return { businessPaused, status: input.resolution };
    });
  }

  async getCustomerStatus(input: {
    challengePublicId: string;
    claimPublicId: string;
  }): Promise<LocalPassCustomerStatus> {
    return this.withTransaction(async (client) => {
      const claimResult = await client.query<
        ClaimRow & {
          city: string;
          currency: string;
          exclusions: string;
          location_name: string;
          offer_description: string;
          purchase_requirement: string | null;
          region: string;
          stated_retail_value_minor: number;
          title: string;
        }
      >(
        `SELECT c.*, o.title, o.offer_description, o.purchase_requirement, o.exclusions,
                o.stated_retail_value_minor, o.currency, l.name AS location_name, l.city, l.region
           FROM local_pass_claims c JOIN local_pass_offers o ON o.id = c.local_pass_offer_id
           JOIN business_locations l ON l.id = o.business_location_id
          WHERE c.public_id = $1`,
        [input.claimPublicId],
      );
      const claim = claimResult.rows[0];
      if (!claim)
        throw new LocalPassError('LOCAL_PASS_NOT_FOUND', 404, 'Local Pass is unavailable.');
      const challengeResult = await client.query<ChallengeRow>(
        `SELECT * FROM local_pass_customer_challenges
          WHERE public_id = $1 AND local_pass_claim_id = $2 AND purpose = 'status_access'
            AND status = 'verified' AND expires_at > now() FOR UPDATE`,
        [input.challengePublicId, claim.id],
      );
      const challenge = challengeResult.rows[0];
      if (!challenge || challenge.destination_dedup_token !== claim.customer_dedup_token) {
        throw new LocalPassError(
          'LOCAL_PASS_ACCESS_DENIED',
          403,
          'Customer access was not proven.',
        );
      }
      const incident = await client.query<{ status: 'open' | 'confirmed' | 'dismissed' }>(
        `SELECT status FROM local_pass_fulfillment_incidents
          WHERE local_pass_claim_id = $1 ORDER BY reported_at DESC LIMIT 1`,
        [claim.id],
      );
      await client.query(
        `UPDATE local_pass_customer_challenges SET status = 'consumed', consumed_at = now() WHERE id = $1`,
        [challenge.id],
      );
      const incidentStatus = incident.rows[0]?.status;
      const fulfillmentState =
        claim.status === 'redeemed'
          ? 'redeemed'
          : claim.status === 'expired'
            ? 'expired'
            : incidentStatus === 'open'
              ? 'refusal_under_review'
              : incidentStatus === 'confirmed'
                ? 'refusal_confirmed_pass_still_valid'
                : 'active';
      return {
        claimPublicId: claim.public_id,
        expiresAt: claim.expires_at,
        fulfillmentState,
        offer: {
          currency: claim.currency,
          description: claim.offer_description,
          exclusions: claim.exclusions,
          purchaseRequirement: claim.purchase_requirement,
          statedRetailValueMinor: claim.stated_retail_value_minor,
          title: claim.title,
        },
        venue: { city: claim.city, name: claim.location_name, region: claim.region },
      };
    });
  }

  async getBusinessCampaignReport(input: {
    actorUserId: string;
    campaignId: string;
  }): Promise<LocalPassCampaignReport> {
    return this.readCampaignReport(
      `c.id = $1 AND EXISTS (
         SELECT 1 FROM business_memberships m WHERE m.business_id = c.business_id
          AND m.user_id = $2 AND m.status = 'active' AND m.role IN ('owner','manager')
       )`,
      [input.campaignId, input.actorUserId],
    );
  }

  async getCreatorCampaignReport(input: {
    actorUserId: string;
    campaignId: string;
  }): Promise<LocalPassCampaignReport> {
    return this.readCampaignReport(
      `c.id = $1 AND EXISTS (
         SELECT 1 FROM local_pass_links l WHERE l.campaign_id = c.id AND l.creator_user_id = $2
       )`,
      [input.campaignId, input.actorUserId],
      input.actorUserId,
    );
  }

  async purgeDueCustomerData(input: { correlationId: string }): Promise<{
    contactsDeleted: number;
    linkageDeleted: number;
  }> {
    return this.withTransaction(async (client) => {
      const contacts = await client.query(
        `UPDATE local_pass_customer_challenges
            SET destination_ciphertext = NULL, contact_deleted_at = now()
          WHERE contact_delete_after <= now() AND contact_deleted_at IS NULL
            AND destination_ciphertext IS NOT NULL`,
      );
      const challenges = await client.query(
        `UPDATE local_pass_customer_challenges
            SET destination_dedup_token = NULL, destination_token_key_version = NULL,
                risk_dedup_token = NULL, risk_token_key_version = NULL, otp_digest = NULL,
                linkage_deleted_at = now()
          WHERE linkage_delete_after <= now() AND linkage_deleted_at IS NULL`,
      );
      const claims = await client.query(
        `UPDATE local_pass_claims
            SET customer_dedup_token = NULL, token_key_version = NULL,
                customer_linkage_deleted_at = now()
          WHERE customer_linkage_delete_after <= now() AND customer_linkage_deleted_at IS NULL`,
      );
      await this.appendAudit(client, {
        action: 'local-pass.customer-data-purged',
        actorId: null,
        correlationId: input.correlationId,
        details: {
          contactsDeleted: contacts.rowCount ?? 0,
          linkageDeleted: (challenges.rowCount ?? 0) + (claims.rowCount ?? 0),
        },
        subjectId: input.correlationId,
        subjectType: 'local-pass-retention-batch',
      });
      return {
        contactsDeleted: contacts.rowCount ?? 0,
        linkageDeleted: (challenges.rowCount ?? 0) + (claims.rowCount ?? 0),
      };
    });
  }

  private customerToken(normalizedDestination: string): string {
    return createHmac('sha256', this.secrets.customerHmacKey)
      .update(`local-pass-customer:v${this.secrets.keyVersion}:${normalizedDestination}`)
      .digest('hex');
  }

  private otpDigest(challengePublicId: string, otp: string): string {
    return createHmac('sha256', this.secrets.otpHmacKey)
      .update(`local-pass-otp:${challengePublicId}:${otp}`)
      .digest('hex');
  }

  private riskToken(riskSignal: string): string {
    return createHmac('sha256', this.secrets.riskHmacKey)
      .update(`local-pass-risk:v${this.secrets.keyVersion}:${riskSignal}`)
      .digest('hex');
  }

  private async readCampaignReport(
    authorizationPredicate: string,
    parameters: string[],
    creatorUserId?: string,
  ): Promise<LocalPassCampaignReport> {
    return this.withTransaction(async (client) => {
      const creatorParameter = creatorUserId ? parameters.length + 1 : undefined;
      const creatorClaimFilter = creatorParameter
        ? `AND lp.creator_user_id = $${creatorParameter}`
        : '';
      const creatorIncidentFilter = creatorParameter
        ? `AND EXISTS (
             SELECT 1 FROM local_pass_claims ic
              WHERE ic.id = i.local_pass_claim_id AND ic.creator_user_id = $${creatorParameter}
           )`
        : '';
      const creatorCostFilter = creatorParameter
        ? `AND EXISTS (
             SELECT 1 FROM mission_assignments a
              WHERE a.mission_slot_id = s.id AND a.creator_user_id = $${creatorParameter}
           )`
        : '';
      const values = creatorUserId ? [...parameters, creatorUserId] : parameters;
      const result = await client.query<{
        campaign_id: string;
        claims: number;
        completed_cost_minor: number;
        incidents: number;
        redemptions: number;
      }>(
        `SELECT c.id AS campaign_id,
           (SELECT count(*)::int FROM local_pass_claims lp
             WHERE lp.campaign_id = c.id ${creatorClaimFilter}) AS claims,
           (SELECT count(*)::int FROM local_pass_redemptions r
             JOIN local_pass_claims lp ON lp.id = r.local_pass_claim_id
            WHERE lp.campaign_id = c.id ${creatorClaimFilter}) AS redemptions,
           (SELECT count(*)::int FROM local_pass_fulfillment_incidents i
             WHERE i.campaign_id = c.id AND i.status = 'confirmed' ${creatorIncidentFilter}) AS incidents,
           (SELECT coalesce(sum(a.total_minor),0)::int FROM slot_funding_allocations a
             JOIN mission_slots s ON s.id = a.mission_slot_id
            WHERE s.campaign_id = c.id AND s.status = 'completed' ${creatorCostFilter}) AS completed_cost_minor
         FROM campaigns c WHERE ${authorizationPredicate}`,
        values,
      );
      const row = result.rows[0];
      if (!row) {
        throw new LocalPassError('LOCAL_PASS_ACCESS_DENIED', 403, 'Campaign report access denied.');
      }
      return {
        campaignId: row.campaign_id,
        claims: row.claims,
        completedCampaignCostMinor: row.completed_cost_minor,
        confirmedFulfillmentIncidents: row.incidents,
        costPerVerifiedRedemptionMinor:
          row.redemptions > 0 ? Math.round(row.completed_cost_minor / row.redemptions) : null,
        verifiedRedemptions: row.redemptions,
        verifiedRedemptionConversionBasisPoints:
          row.claims > 0 ? Math.round((row.redemptions * 10_000) / row.claims) : 0,
      };
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
