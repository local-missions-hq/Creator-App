import { randomUUID } from 'node:crypto';

import type {
  ReachAnalyticsConsentStatus,
  ReachAnalyticsSourceType,
  ReachAuthenticityStatus,
  ReachCapabilityStatus,
  ReachConflictCode,
  ReachEvidenceDeletionStatus,
  ReachLevel,
  ReachVerificationStatus,
  SocialPlatform,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

type LocalWorkerEnvironment = 'local' | 'test';

export type ReachCapabilityRecord = {
  approvedProviderKey: string | null;
  approvedSourceType: ReachAnalyticsSourceType | null;
  methodologyVersion: string | null;
  platform: SocialPlatform;
  status: ReachCapabilityStatus;
  version: number;
};

export type ReachConsentRecord = {
  creatorUserId: string;
  id: string;
  platform: SocialPlatform;
  status: ReachAnalyticsConsentStatus;
  version: number;
};

export type ReachVerificationRecord = {
  creatorUserId: string;
  evidenceDeletedAt: Date | null;
  evidenceDeletionDueAt: Date | null;
  expiresAt: Date | null;
  id: string;
  platform: SocialPlatform;
  publicId: string;
  status: ReachVerificationStatus;
  verifiedAt: Date | null;
  version: number;
};

export type ReachQualificationSummary = {
  expiresAt: Date;
  isGrace: boolean;
  platform: SocialPlatform;
  status: 'current' | 'outage_grace';
  tier: ReachLevel;
  verifiedAt: Date;
};

export type ReachDeletionClaim = {
  attemptCount: number;
  evidenceReference: string | null;
  jobId: string;
  lockToken: string;
  providerConnectionReference: string | null;
  verificationId: string;
};

type CapabilityRow = QueryResultRow & {
  approved_provider_key: string | null;
  approved_source_type: ReachAnalyticsSourceType | null;
  id: string;
  methodology_version: string | null;
  platform: SocialPlatform;
  status: ReachCapabilityStatus;
  version: number;
};

type ConsentRow = QueryResultRow & {
  creator_user_id: string;
  id: string;
  platform: SocialPlatform;
  status: ReachAnalyticsConsentStatus;
  version: number;
};

type VerificationRow = QueryResultRow & {
  appeal_deadline: Date | null;
  appeal_reviewer_user_id: string | null;
  authenticity_status: ReachAuthenticityStatus;
  completed_at: Date | null;
  creator_user_id: string;
  evidence_deleted_at: Date | null;
  evidence_deletion_due_at: Date | null;
  evidence_reference: string | null;
  estimated_local_audience_count: number | null;
  expires_at: Date | null;
  id: string;
  methodology_version: string;
  platform: SocialPlatform;
  provider_connection_reference: string | null;
  provider_key: string;
  public_id: string;
  reach_analytics_consent_id: string;
  reviewer_user_id: string | null;
  source_type: ReachAnalyticsSourceType;
  status: ReachVerificationStatus;
  verified_at: Date | null;
  version: number;
};

export class ReachQualificationError extends Error {
  constructor(
    readonly code: ReachConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'ReachQualificationError';
  }
}

function quoteSchema(schemaName: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Database schema name must be a safe lowercase PostgreSQL identifier.');
  }
  return `"${schemaName}"`;
}

function toCapability(row: CapabilityRow): ReachCapabilityRecord {
  return {
    approvedProviderKey: row.approved_provider_key,
    approvedSourceType: row.approved_source_type,
    methodologyVersion: row.methodology_version,
    platform: row.platform,
    status: row.status,
    version: row.version,
  };
}

function toConsent(row: ConsentRow): ReachConsentRecord {
  return {
    creatorUserId: row.creator_user_id,
    id: row.id,
    platform: row.platform,
    status: row.status,
    version: row.version,
  };
}

function toVerification(row: VerificationRow): ReachVerificationRecord {
  return {
    creatorUserId: row.creator_user_id,
    evidenceDeletedAt: row.evidence_deleted_at,
    evidenceDeletionDueAt: row.evidence_deletion_due_at,
    expiresAt: row.expires_at,
    id: row.id,
    platform: row.platform,
    publicId: row.public_id,
    status: row.status,
    verifiedAt: row.verified_at,
    version: row.version,
  };
}

function tierForCount(count: number): ReachLevel | null {
  if (count >= 20_000) return 'level_3';
  if (count >= 5_000) return 'level_2';
  if (count >= 1_000) return 'level_1';
  return null;
}

export class ReachQualificationStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
    private readonly localEnvironment: LocalWorkerEnvironment | null = 'local',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async activatePlatform(input: {
    actorUserId: string;
    approvedProviderKey: string;
    approvedSourceType: ReachAnalyticsSourceType;
    correlationId: string;
    methodologyVersion: string;
    platform: SocialPlatform;
    reviews: {
      feasibility: boolean;
      operations: boolean;
      privacy: boolean;
      providerPolicy: boolean;
      reliability: boolean;
      retention: boolean;
      security: boolean;
    };
  }): Promise<ReachCapabilityRecord> {
    if (!Object.values(input.reviews).every(Boolean)) {
      throw new ReachQualificationError(
        'REACH_CAPABILITY_DISABLED',
        409,
        'Every platform, privacy, security, retention, reliability, and operations review must pass.',
      );
    }
    return this.withTransaction(async (client) => {
      await this.assertAdministrator(client, input.actorUserId);
      const result = await client.query<CapabilityRow>(
        `UPDATE reach_platform_capabilities
            SET status = 'enabled', approved_source_type = $2, approved_provider_key = $3,
                methodology_version = $4, feasibility_approved = true,
                security_approved = true, privacy_approved = true,
                provider_policy_approved = true, reliability_approved = true,
                retention_approved = true, operations_approved = true,
                reviewed_by_user_id = $5, reviewed_at = now(), disabled_at = NULL,
                version = version + 1, updated_at = now()
          WHERE platform = $1 AND status = 'disabled'
          RETURNING *`,
        [
          input.platform,
          input.approvedSourceType,
          input.approvedProviderKey,
          input.methodologyVersion,
          input.actorUserId,
        ],
      );
      const row = result.rows[0];
      if (!row) {
        throw new ReachQualificationError(
          'REACH_TRANSITION_CONFLICT',
          409,
          'Only a disabled Reach platform can be activated.',
        );
      }
      await this.appendAudit(client, {
        action: 'reach.platform-activated',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: {
          approvedProviderKey: input.approvedProviderKey,
          approvedSourceType: input.approvedSourceType,
          methodologyVersion: input.methodologyVersion,
          platform: input.platform,
        },
        subjectId: row.id,
        subjectType: 'reach-platform-capability',
      });
      return toCapability(row);
    });
  }

  async setConsent(input: {
    actorUserId: string;
    consentVersion: string;
    correlationId: string;
    platform: SocialPlatform;
    publicId: string;
  }): Promise<ReachConsentRecord> {
    return this.withTransaction(async (client) => {
      const profile = await client.query(`SELECT 1 FROM creator_profiles WHERE user_id = $1`, [
        input.actorUserId,
      ]);
      if (profile.rowCount !== 1) {
        throw new ReachQualificationError(
          'REACH_ACCESS_DENIED',
          403,
          'Only a Creator can authorize Reach analytics.',
        );
      }
      const current = await client.query<ConsentRow>(
        `SELECT * FROM reach_analytics_consents
          WHERE creator_user_id = $1 AND platform = $2 FOR UPDATE`,
        [input.actorUserId, input.platform],
      );
      let row: ConsentRow | undefined;
      if (current.rows[0]?.status === 'active') return toConsent(current.rows[0]);
      if (current.rows[0]) {
        const updated = await client.query<ConsentRow>(
          `UPDATE reach_analytics_consents
              SET status = 'active', consent_version = $2, granted_at = now(), revoked_at = NULL,
                  version = version + 1, updated_at = now()
            WHERE id = $1 RETURNING *`,
          [current.rows[0].id, input.consentVersion],
        );
        row = updated.rows[0];
      } else {
        const inserted = await client.query<ConsentRow>(
          `INSERT INTO reach_analytics_consents (
             public_id, creator_user_id, platform, consent_version
           ) VALUES ($1,$2,$3,$4) RETURNING *`,
          [input.publicId, input.actorUserId, input.platform, input.consentVersion],
        );
        row = inserted.rows[0];
      }
      if (!row) throw new Error('Reach consent write returned no row.');
      await client.query(
        `INSERT INTO reach_analytics_consent_history (
           reach_analytics_consent_id, from_status, to_status, consent_version,
           actor_user_id, reason
         ) VALUES ($1,$2,'active',$3,$4,'Creator explicitly authorized read-only Reach analytics')`,
        [row.id, current.rows[0]?.status ?? null, row.version, input.actorUserId],
      );
      await this.appendAudit(client, {
        action: 'reach.consent-granted',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { platform: input.platform },
        subjectId: row.id,
        subjectType: 'reach-analytics-consent',
      });
      return toConsent(row);
    });
  }

  async revokeConsent(input: {
    actorUserId: string;
    correlationId: string;
    platform: SocialPlatform;
  }): Promise<ReachConsentRecord> {
    return this.withTransaction(async (client) => {
      const current = await client.query<ConsentRow>(
        `SELECT * FROM reach_analytics_consents
          WHERE creator_user_id = $1 AND platform = $2 FOR UPDATE`,
        [input.actorUserId, input.platform],
      );
      const consent = current.rows[0];
      if (!consent || consent.status !== 'active') {
        throw new ReachQualificationError(
          'REACH_CONSENT_REQUIRED',
          409,
          'Active creator consent is absent.',
        );
      }
      const updated = await client.query<ConsentRow>(
        `UPDATE reach_analytics_consents
            SET status = 'revoked', revoked_at = now(), version = version + 1, updated_at = now()
          WHERE id = $1 RETURNING *`,
        [consent.id],
      );
      const row = updated.rows[0];
      if (!row) throw new Error('Reach consent revocation returned no row.');
      await client.query(
        `UPDATE reach_qualifications
            SET status = 'revoked', revoked_at = now(), version = version + 1, updated_at = now()
          WHERE creator_user_id = $1 AND platform = $2 AND status = 'active'`,
        [input.actorUserId, input.platform],
      );
      const pending = await client.query<VerificationRow>(
        `UPDATE reach_verifications
            SET status = 'final_rejected', review_reason = 'consent_revoked',
                reviewer_user_id = $1, reviewed_at = now(), completed_at = now(),
                appeal_deadline = NULL, evidence_deletion_due_at = now() + interval '30 days',
                version = version + 1, updated_at = now()
          WHERE creator_user_id = $1 AND platform = $2
            AND status IN ('pending_review','appeal_pending')
          RETURNING *`,
        [input.actorUserId, input.platform],
      );
      for (const verification of pending.rows) {
        await this.appendVerificationHistory(client, verification, 'CONSENT_REVOKED');
        await this.upsertDeletionJob(
          client,
          verification.id,
          verification.evidence_deletion_due_at,
        );
      }
      await client.query(
        `INSERT INTO reach_analytics_consent_history (
           reach_analytics_consent_id, from_status, to_status, consent_version,
           actor_user_id, reason
         ) VALUES ($1,'active','revoked',$2,$3,'Creator revoked optional Reach analytics consent')`,
        [row.id, row.version, input.actorUserId],
      );
      await this.appendAudit(client, {
        action: 'reach.consent-revoked',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { communityEligibilityChanged: false, platform: input.platform },
        subjectId: row.id,
        subjectType: 'reach-analytics-consent',
      });
      return toConsent(row);
    });
  }

  async submitVerification(input: {
    actorUserId: string;
    authenticityStatus: ReachAuthenticityStatus;
    correlationId: string;
    estimatedLocalAudienceCount: number;
    evidenceReference: string;
    platform: SocialPlatform;
    providerConnectionReference: string;
    providerKey: string;
    publicId: string;
    sourceType: ReachAnalyticsSourceType;
  }): Promise<ReachVerificationRecord> {
    if (
      !Number.isInteger(input.estimatedLocalAudienceCount) ||
      input.estimatedLocalAudienceCount < 0 ||
      !input.evidenceReference.startsWith('private/reach/') ||
      !input.providerConnectionReference.startsWith('private/reach/')
    ) {
      throw new ReachQualificationError(
        'REACH_EVIDENCE_INVALID',
        409,
        'Reach evidence must come from a private approved-provider connection.',
      );
    }
    return this.withTransaction(async (client) => {
      const gate = await client.query<
        CapabilityRow & { consent_id: string; consent_status: ReachAnalyticsConsentStatus }
      >(
        `SELECT capability.*, consent.id AS consent_id, consent.status AS consent_status
           FROM reach_platform_capabilities capability
           LEFT JOIN reach_analytics_consents consent
             ON consent.creator_user_id = $2 AND consent.platform = capability.platform
          WHERE capability.platform = $1`,
        [input.platform, input.actorUserId],
      );
      const capability = gate.rows[0];
      if (!capability || capability.status !== 'enabled') {
        throw new ReachQualificationError(
          'REACH_CAPABILITY_DISABLED',
          409,
          'Reach qualification is unavailable for this platform.',
        );
      }
      if (capability.consent_status !== 'active') {
        throw new ReachQualificationError(
          'REACH_CONSENT_REQUIRED',
          409,
          'Creator consent is required for this platform.',
        );
      }
      if (
        capability.approved_provider_key !== input.providerKey ||
        capability.approved_source_type !== input.sourceType
      ) {
        throw new ReachQualificationError(
          'REACH_PROVIDER_NOT_APPROVED',
          409,
          'Screenshots, manual counts, exports, and unapproved providers are not Reach proof.',
        );
      }
      const inserted = await client.query<VerificationRow>(
        `INSERT INTO reach_verifications (
           public_id, creator_user_id, platform, reach_analytics_consent_id,
           source_type, provider_key, provider_connection_reference, evidence_reference,
           estimated_local_audience_count, authenticity_status, methodology_version
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          input.publicId,
          input.actorUserId,
          input.platform,
          capability.consent_id,
          input.sourceType,
          input.providerKey,
          input.providerConnectionReference,
          input.evidenceReference,
          input.estimatedLocalAudienceCount,
          input.authenticityStatus,
          capability.methodology_version,
        ],
      );
      const row = inserted.rows[0];
      if (!row) throw new Error('Reach verification insert returned no row.');
      await this.appendVerificationHistory(client, row, 'APPROVED_PROVIDER_DATA_RECEIVED');
      await this.appendAudit(client, {
        action: 'reach.verification-submitted',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { platform: input.platform, sourceType: input.sourceType },
        subjectId: row.id,
        subjectType: 'reach-verification',
      });
      return toVerification(row);
    });
  }

  async reviewVerification(input: {
    actorUserId: string;
    correlationId: string;
    verificationId: string;
  }): Promise<ReachVerificationRecord> {
    return this.withTransaction(async (client) => {
      await this.assertReviewer(client, input.actorUserId);
      const current = await this.selectVerification(client, input.verificationId, true);
      if (current.status !== 'pending_review') {
        throw new ReachQualificationError(
          'REACH_REVIEW_INVALID',
          409,
          'Only pending approved-provider data can be reviewed.',
        );
      }
      await this.assertCurrentConsent(client, current.creator_user_id, current.platform);
      const tier = tierForCount(current.estimated_local_audience_count ?? -1);
      const approved = tier !== null && current.authenticity_status === 'passed';
      const reason =
        current.authenticity_status !== 'passed'
          ? 'authenticity_not_passed'
          : tier === null
            ? 'below_level_1'
            : 'approved';
      const updated = await client.query<VerificationRow>(
        `UPDATE reach_verifications
            SET status = $2, reviewer_user_id = $3, review_reason = $4,
                reviewed_at = now(), completed_at = now(),
                verified_at = CASE WHEN $5 THEN now() ELSE NULL END,
                expires_at = CASE WHEN $5 THEN now() + interval '90 days' ELSE NULL END,
                appeal_deadline = CASE WHEN $5 THEN NULL ELSE now() + interval '14 days' END,
                evidence_deletion_due_at = now() + interval '30 days',
                version = version + 1, updated_at = now()
          WHERE id = $1 RETURNING *`,
        [current.id, approved ? 'verified' : 'rejected', input.actorUserId, reason, approved],
      );
      const row = updated.rows[0];
      if (!row || !row.evidence_deletion_due_at) {
        throw new Error('Reach review returned no evidence deletion deadline.');
      }
      if (approved && tier) await this.createQualification(client, row, tier);
      await this.upsertDeletionJob(client, row.id, row.evidence_deletion_due_at);
      await this.appendVerificationHistory(
        client,
        row,
        approved ? `VERIFIED_${tier?.toUpperCase()}` : reason.toUpperCase(),
        current.status,
        input.actorUserId,
      );
      await this.appendAudit(client, {
        action: approved ? 'reach.verification-approved' : 'reach.verification-rejected',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { platform: row.platform, reason, tier },
        subjectId: row.id,
        subjectType: 'reach-verification',
      });
      return toVerification(row);
    });
  }

  async appealVerification(input: {
    actorUserId: string;
    correlationId: string;
    verificationId: string;
  }): Promise<ReachVerificationRecord> {
    return this.withTransaction(async (client) => {
      const current = await this.selectVerification(client, input.verificationId, true);
      if (
        current.creator_user_id !== input.actorUserId ||
        current.status !== 'rejected' ||
        !current.appeal_deadline
      ) {
        throw new ReachQualificationError(
          'REACH_APPEAL_INVALID',
          409,
          'Only the Creator can appeal a timely rejected Reach decision.',
        );
      }
      const eligible = await client.query(
        `SELECT 1 FROM reach_verifications WHERE id = $1 AND appeal_deadline >= now()`,
        [current.id],
      );
      if (eligible.rowCount !== 1) {
        throw new ReachQualificationError(
          'REACH_APPEAL_INVALID',
          409,
          'The Reach appeal window has closed.',
        );
      }
      const updated = await client.query<VerificationRow>(
        `UPDATE reach_verifications
            SET status = 'appeal_pending', appealed_at = now(),
                version = version + 1, updated_at = now()
          WHERE id = $1 RETURNING *`,
        [current.id],
      );
      const row = updated.rows[0];
      if (!row) throw new Error('Reach appeal update returned no row.');
      await this.appendVerificationHistory(
        client,
        row,
        'CREATOR_APPEAL_OPENED',
        current.status,
        input.actorUserId,
      );
      await this.appendAudit(client, {
        action: 'reach.appeal-opened',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { platform: row.platform },
        subjectId: row.id,
        subjectType: 'reach-verification',
      });
      return toVerification(row);
    });
  }

  async decideAppeal(input: {
    actorUserId: string;
    authenticityStatus: ReachAuthenticityStatus;
    correlationId: string;
    correctedEstimatedLocalAudienceCount: number;
    verificationId: string;
  }): Promise<ReachVerificationRecord> {
    if (
      !Number.isInteger(input.correctedEstimatedLocalAudienceCount) ||
      input.correctedEstimatedLocalAudienceCount < 0
    ) {
      throw new ReachQualificationError(
        'REACH_EVIDENCE_INVALID',
        409,
        'Corrected provider evidence must contain a nonnegative integer estimate.',
      );
    }
    return this.withTransaction(async (client) => {
      await this.assertReviewer(client, input.actorUserId);
      const current = await this.selectVerification(client, input.verificationId, true);
      if (current.status !== 'appeal_pending' || current.reviewer_user_id === input.actorUserId) {
        throw new ReachQualificationError(
          'REACH_APPEAL_INVALID',
          409,
          'A pending appeal requires a different authorized reviewer.',
        );
      }
      await this.assertCurrentConsent(client, current.creator_user_id, current.platform);
      const tier = tierForCount(input.correctedEstimatedLocalAudienceCount);
      const approved = tier !== null && input.authenticityStatus === 'passed';
      const updated = await client.query<VerificationRow>(
        `UPDATE reach_verifications
            SET status = $2, estimated_local_audience_count = $3,
                authenticity_status = $4, appeal_reviewer_user_id = $5,
                appeal_decided_at = now(), completed_at = now(),
                verified_at = CASE WHEN $6 THEN now() ELSE NULL END,
                expires_at = CASE WHEN $6 THEN now() + interval '90 days' ELSE NULL END,
                evidence_deletion_due_at = GREATEST(evidence_deletion_due_at, now() + interval '30 days'),
                version = version + 1, updated_at = now()
          WHERE id = $1 RETURNING *`,
        [
          current.id,
          approved ? 'verified' : 'final_rejected',
          input.correctedEstimatedLocalAudienceCount,
          input.authenticityStatus,
          input.actorUserId,
          approved,
        ],
      );
      const row = updated.rows[0];
      if (!row || !row.evidence_deletion_due_at) {
        throw new Error('Reach appeal decision returned no deletion deadline.');
      }
      if (approved && tier) await this.createQualification(client, row, tier);
      await this.upsertDeletionJob(client, row.id, row.evidence_deletion_due_at);
      await this.appendVerificationHistory(
        client,
        row,
        approved ? `APPEAL_VERIFIED_${tier?.toUpperCase()}` : 'APPEAL_FINAL_REJECTED',
        current.status,
        input.actorUserId,
      );
      await this.appendAudit(client, {
        action: approved ? 'reach.appeal-approved' : 'reach.appeal-rejected',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { independentReviewer: true, platform: row.platform, tier },
        subjectId: row.id,
        subjectType: 'reach-verification',
      });
      return toVerification(row);
    });
  }

  async getCreatorQualification(input: {
    actorUserId: string;
    platform: SocialPlatform;
  }): Promise<ReachQualificationSummary | null> {
    return this.withTransaction(async (client) =>
      this.selectCurrentQualification(client, input.actorUserId, input.platform),
    );
  }

  async getBusinessQualificationForReservation(input: {
    actorUserId: string;
    reservationId: string;
  }): Promise<ReachQualificationSummary> {
    return this.withTransaction(async (client) => {
      const result = await client.query<{
        expires_at: Date;
        is_grace: boolean;
        platform: SocialPlatform;
        tier: ReachLevel;
        verified_at: Date;
      }>(
        `SELECT qualification.platform, qualification.tier,
                qualification.verified_at, qualification.expires_at,
                (qualification.expires_at <= now()) AS is_grace
           FROM slot_reservations reservation
           JOIN mission_slots slot ON slot.id = reservation.mission_slot_id AND slot.type = 'reach'
           JOIN campaigns campaign ON campaign.id = slot.campaign_id
           JOIN business_memberships member ON member.business_id = campaign.business_id
            AND member.user_id = $2 AND member.status = 'active' AND member.role IN ('owner','manager')
           JOIN reach_qualifications qualification ON qualification.id = reservation.reach_qualification_id
          WHERE reservation.id = $1`,
        [input.reservationId, input.actorUserId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new ReachQualificationError(
          'REACH_ACCESS_DENIED',
          403,
          'Business Reach qualification view is unavailable.',
        );
      }
      return {
        expiresAt: row.expires_at,
        isGrace: row.is_grace,
        platform: row.platform,
        status: row.is_grace ? 'outage_grace' : 'current',
        tier: row.tier,
        verifiedAt: row.verified_at,
      };
    });
  }

  async startProviderOutage(input: {
    actorUserId: string;
    correlationId: string;
    platform: SocialPlatform;
    publicId: string;
    reasonCode: string;
  }): Promise<void> {
    return this.withTransaction(async (client) => {
      await this.assertAdministrator(client, input.actorUserId);
      const capability = await client.query<CapabilityRow>(
        `SELECT * FROM reach_platform_capabilities WHERE platform = $1 FOR UPDATE`,
        [input.platform],
      );
      if (capability.rows[0]?.status !== 'enabled') {
        throw new ReachQualificationError(
          'REACH_TRANSITION_CONFLICT',
          409,
          'Only an enabled Reach platform can enter outage mode.',
        );
      }
      const outage = await client.query<{ id: string }>(
        `INSERT INTO reach_provider_outages (
           public_id, platform, reason_code, created_by_user_id
         ) VALUES ($1,$2,$3,$4) RETURNING id`,
        [input.publicId, input.platform, input.reasonCode, input.actorUserId],
      );
      await client.query(
        `UPDATE reach_platform_capabilities
            SET status = 'outage', version = version + 1, updated_at = now()
          WHERE platform = $1`,
        [input.platform],
      );
      await client.query(
        `UPDATE reach_qualifications
            SET grace_granted_at = now(), grace_until = expires_at + interval '14 days',
                grace_provider_outage_id = $2,
                version = version + 1, updated_at = now()
          WHERE platform = $1 AND status = 'active' AND expires_at > now()
            AND grace_granted_at IS NULL`,
        [input.platform, outage.rows[0]?.id],
      );
      await this.appendAudit(client, {
        action: 'reach.provider-outage-started',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { graceDays: 14, nonRenewable: true, platform: input.platform },
        subjectId: outage.rows[0]?.id ?? capability.rows[0]?.id ?? input.actorUserId,
        subjectType: 'reach-provider-outage',
      });
    });
  }

  async resolveProviderOutage(input: {
    actorUserId: string;
    correlationId: string;
    platform: SocialPlatform;
  }): Promise<void> {
    return this.withTransaction(async (client) => {
      await this.assertAdministrator(client, input.actorUserId);
      const outage = await client.query<{ id: string }>(
        `UPDATE reach_provider_outages
            SET status = 'resolved', resolved_at = now(), resolved_by_user_id = $2
          WHERE platform = $1 AND status = 'active' RETURNING id`,
        [input.platform, input.actorUserId],
      );
      if (!outage.rows[0]) {
        throw new ReachQualificationError(
          'REACH_TRANSITION_CONFLICT',
          409,
          'No active Reach provider outage exists.',
        );
      }
      await client.query(
        `UPDATE reach_platform_capabilities
            SET status = 'enabled', version = version + 1, updated_at = now()
          WHERE platform = $1 AND status = 'outage'`,
        [input.platform],
      );
      await this.appendAudit(client, {
        action: 'reach.provider-outage-resolved',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { platform: input.platform },
        subjectId: outage.rows[0].id,
        subjectType: 'reach-provider-outage',
      });
    });
  }

  async expireDueQualifications(input: { correlationId: string }): Promise<number> {
    return this.withTransaction(async (client) => {
      const expired = await client.query<{ id: string }>(
        `UPDATE reach_qualifications qualification
            SET status = 'expired', expired_at = now(), version = version + 1, updated_at = now()
          WHERE qualification.status = 'active' AND qualification.expires_at <= now()
            AND NOT EXISTS (
              SELECT 1 FROM reach_platform_capabilities capability
              JOIN reach_provider_outages outage
                ON outage.id = qualification.grace_provider_outage_id
               AND outage.platform = capability.platform AND outage.status = 'active'
             WHERE capability.platform = qualification.platform AND capability.status = 'outage'
               AND qualification.grace_until > now()
            )
          RETURNING id`,
      );
      if (expired.rowCount) {
        await this.appendAudit(client, {
          action: 'reach.qualifications-expired',
          actorId: null,
          correlationId: input.correlationId,
          details: { count: expired.rowCount },
          subjectId: expired.rows[0]?.id ?? randomUUID(),
          subjectType: 'reach-qualification',
        });
      }
      return expired.rowCount ?? 0;
    });
  }

  async claimNextEvidenceDeletion(input: {
    leaseSeconds?: number;
    workerId: string;
  }): Promise<ReachDeletionClaim | null> {
    if (!this.localEnvironment) {
      throw new ReachQualificationError(
        'REACH_ACCESS_DENIED',
        403,
        'Local evidence-deletion worker is unavailable in deployed environments.',
      );
    }
    const leaseSeconds = input.leaseSeconds ?? 60;
    return this.withTransaction(async (client) => {
      const result = await client.query<{
        attempt_count: number;
        evidence_reference: string | null;
        id: string;
        lock_token: string;
        provider_connection_reference: string | null;
        reach_verification_id: string;
      }>(
        `WITH candidate AS (
           SELECT id FROM reach_evidence_deletion_jobs
            WHERE ((status = 'pending' AND available_at <= now()) OR
                   (status = 'processing' AND locked_until <= now()))
              AND attempt_count < max_attempts
            ORDER BY available_at, created_at
            FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE reach_evidence_deletion_jobs job
            SET status = 'processing', attempt_count = job.attempt_count + 1,
                lock_token = gen_random_uuid(), locked_by = $1,
                locked_until = now() + ($2::int * interval '1 second'),
                version = job.version + 1, updated_at = now()
           FROM candidate, reach_verifications verification
          WHERE job.id = candidate.id AND verification.id = job.reach_verification_id
          RETURNING job.id, job.reach_verification_id, job.attempt_count, job.lock_token,
                    verification.provider_connection_reference, verification.evidence_reference`,
        [input.workerId, leaseSeconds],
      );
      const row = result.rows[0];
      return row
        ? {
            attemptCount: row.attempt_count,
            evidenceReference: row.evidence_reference,
            jobId: row.id,
            lockToken: row.lock_token,
            providerConnectionReference: row.provider_connection_reference,
            verificationId: row.reach_verification_id,
          }
        : null;
    });
  }

  async completeEvidenceDeletion(input: {
    errorCode?: string;
    jobId: string;
    lockToken: string;
    outcome: 'deleted' | 'failed';
    workerId: string;
  }): Promise<ReachEvidenceDeletionStatus> {
    if (!this.localEnvironment) {
      throw new ReachQualificationError(
        'REACH_ACCESS_DENIED',
        403,
        'Local evidence-deletion worker is unavailable in deployed environments.',
      );
    }
    return this.withTransaction(async (client) => {
      const job = await client.query<{
        attempt_count: number;
        id: string;
        max_attempts: number;
        reach_verification_id: string;
      }>(
        `SELECT id, reach_verification_id, attempt_count, max_attempts
           FROM reach_evidence_deletion_jobs
          WHERE id = $1 AND status = 'processing' AND lock_token = $2
            AND locked_by = $3 AND locked_until > now() FOR UPDATE`,
        [input.jobId, input.lockToken, input.workerId],
      );
      const row = job.rows[0];
      if (!row) {
        throw new ReachQualificationError(
          'REACH_TRANSITION_CONFLICT',
          409,
          'Evidence deletion claim is stale or unavailable.',
        );
      }
      await client.query(
        `INSERT INTO reach_evidence_deletion_attempts (
           public_id, reach_evidence_deletion_job_id, attempt_number, outcome,
           worker_id, error_code, started_at
         ) VALUES ($1,$2,$3,$4,$5,$6,now())`,
        [
          `rda_${randomUUID()}`,
          row.id,
          row.attempt_count,
          input.outcome,
          input.workerId,
          input.outcome === 'failed' ? input.errorCode : null,
        ],
      );
      if (input.outcome === 'deleted') {
        await client.query(
          `UPDATE reach_verifications
              SET provider_connection_reference = NULL, evidence_reference = NULL,
                  estimated_local_audience_count = NULL, evidence_deleted_at = now(),
                  version = version + 1, updated_at = now()
            WHERE id = $1`,
          [row.reach_verification_id],
        );
        await client.query(
          `UPDATE reach_evidence_deletion_jobs
              SET status = 'completed', completed_at = now(), lock_token = NULL,
                  locked_by = NULL, locked_until = NULL, last_error_code = NULL,
                  version = version + 1, updated_at = now()
            WHERE id = $1`,
          [row.id],
        );
        return 'completed';
      }
      const deadLetter = row.attempt_count >= row.max_attempts;
      await client.query(
        `UPDATE reach_evidence_deletion_jobs
            SET status = $2, available_at = now() + interval '1 minute',
                dead_lettered_at = CASE WHEN $3 THEN now() ELSE NULL END,
                last_error_code = $4, lock_token = NULL, locked_by = NULL,
                locked_until = NULL, version = version + 1, updated_at = now()
          WHERE id = $1`,
        [row.id, deadLetter ? 'dead_letter' : 'pending', deadLetter, input.errorCode],
      );
      if (deadLetter) {
        await client.query(
          `INSERT INTO reach_retention_alerts (
             public_id, reach_evidence_deletion_job_id, code, attempt_count
           ) VALUES ($1,$2,'REACH_EVIDENCE_DELETION_FAILED',$3)`,
          [`ral_${randomUUID()}`, row.id, row.attempt_count],
        );
      }
      return deadLetter ? 'dead_letter' : 'pending';
    });
  }

  private async createQualification(
    client: PoolClient,
    verification: VerificationRow,
    tier: ReachLevel,
  ): Promise<void> {
    await client.query(
      `UPDATE reach_qualifications
          SET status = 'superseded', superseded_at = now(), version = version + 1, updated_at = now()
        WHERE creator_user_id = $1 AND platform = $2 AND status = 'active'`,
      [verification.creator_user_id, verification.platform],
    );
    await client.query(
      `INSERT INTO reach_qualifications (
         public_id, reach_verification_id, creator_user_id, platform, tier,
         source_type, methodology_version, verified_at, expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        `rql_${randomUUID()}`,
        verification.id,
        verification.creator_user_id,
        verification.platform,
        tier,
        verification.source_type,
        verification.methodology_version,
        verification.verified_at,
        verification.expires_at,
      ],
    );
  }

  private async selectCurrentQualification(
    client: PoolClient,
    creatorUserId: string,
    platform: SocialPlatform,
  ): Promise<ReachQualificationSummary | null> {
    const result = await client.query<{
      expires_at: Date;
      is_grace: boolean;
      platform: SocialPlatform;
      tier: ReachLevel;
      verified_at: Date;
    }>(
      `SELECT qualification.platform, qualification.tier,
              qualification.verified_at, qualification.expires_at,
              (qualification.expires_at <= now()) AS is_grace
         FROM reach_qualifications qualification
         JOIN reach_analytics_consents consent
           ON consent.creator_user_id = qualification.creator_user_id
          AND consent.platform = qualification.platform AND consent.status = 'active'
         JOIN reach_platform_capabilities capability
           ON capability.platform = qualification.platform
        WHERE qualification.creator_user_id = $1 AND qualification.platform = $2
          AND qualification.status = 'active'
          AND ((capability.status = 'enabled' AND qualification.expires_at > now()) OR
               (capability.status = 'outage' AND qualification.grace_until > now()
                AND EXISTS (SELECT 1 FROM reach_provider_outages outage
                             WHERE outage.id = qualification.grace_provider_outage_id
                               AND outage.platform = qualification.platform
                               AND outage.status = 'active')))
        ORDER BY qualification.verified_at DESC LIMIT 1`,
      [creatorUserId, platform],
    );
    const row = result.rows[0];
    return row
      ? {
          expiresAt: row.expires_at,
          isGrace: row.is_grace,
          platform: row.platform,
          status: row.is_grace ? 'outage_grace' : 'current',
          tier: row.tier,
          verifiedAt: row.verified_at,
        }
      : null;
  }

  private async selectVerification(
    client: PoolClient,
    verificationId: string,
    lock: boolean,
  ): Promise<VerificationRow> {
    const result = await client.query<VerificationRow>(
      `SELECT * FROM reach_verifications WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
      [verificationId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new ReachQualificationError(
        'REACH_NOT_FOUND',
        404,
        'Reach verification was not found.',
      );
    }
    return row;
  }

  private async assertAdministrator(client: PoolClient, actorUserId: string): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM platform_staff_memberships
        WHERE user_id = $1 AND role = 'admin' AND status = 'active'`,
      [actorUserId],
    );
    if (result.rowCount !== 1) {
      throw new ReachQualificationError(
        'REACH_ACCESS_DENIED',
        403,
        'An active platform administrator is required.',
      );
    }
  }

  private async assertReviewer(client: PoolClient, actorUserId: string): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM platform_staff_memberships
        WHERE user_id = $1 AND status = 'active'
          AND role IN ('verification_reviewer','trust_safety_reviewer','admin')`,
      [actorUserId],
    );
    if (result.rowCount !== 1) {
      throw new ReachQualificationError(
        'REACH_ACCESS_DENIED',
        403,
        'An authorized independent verification reviewer is required.',
      );
    }
  }

  private async assertCurrentConsent(
    client: PoolClient,
    creatorUserId: string,
    platform: SocialPlatform,
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM reach_analytics_consents
        WHERE creator_user_id = $1 AND platform = $2 AND status = 'active'`,
      [creatorUserId, platform],
    );
    if (result.rowCount !== 1) {
      throw new ReachQualificationError(
        'REACH_CONSENT_REQUIRED',
        409,
        'Current creator consent is required.',
      );
    }
  }

  private async appendVerificationHistory(
    client: PoolClient,
    verification: VerificationRow,
    reasonCode: string,
    fromStatus: ReachVerificationStatus | null = null,
    actorUserId: string | null = verification.creator_user_id,
  ): Promise<void> {
    await client.query(
      `INSERT INTO reach_verification_status_history (
         reach_verification_id, from_status, to_status, verification_version,
         actor_user_id, actor_type, reason_code
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        verification.id,
        fromStatus,
        verification.status,
        verification.version,
        actorUserId,
        actorUserId ? 'user' : 'service',
        reasonCode,
      ],
    );
  }

  private async upsertDeletionJob(
    client: PoolClient,
    verificationId: string,
    availableAt: Date | null,
  ): Promise<void> {
    if (!availableAt) return;
    await client.query(
      `INSERT INTO reach_evidence_deletion_jobs (
         public_id, reach_verification_id, available_at
       ) VALUES ($1,$2,$3)
       ON CONFLICT (reach_verification_id) DO UPDATE
         SET available_at = GREATEST(reach_evidence_deletion_jobs.available_at, EXCLUDED.available_at),
             version = reach_evidence_deletion_jobs.version + 1,
             updated_at = now()`,
      [`rdj_${randomUUID()}`, verificationId, availableAt],
    );
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
      `INSERT INTO audit_events (
         actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
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
