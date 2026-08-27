import { randomUUID } from 'node:crypto';

import type {
  LocalityAppealReason,
  LocalityConflictCode,
  LocalityEvidenceDeletionStatus,
  LocalityReviewReason,
  LocalityVerificationMethod,
  LocalityVerificationStatus,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

type LocalityReviewDecision = 'approve' | 'request_correction' | 'reject';
type LocalityAppealDecision = 'approve' | 'reject';
type LocalityWorkerEnvironment = 'local' | 'test';

export type LocalityVerificationRecord = {
  appealDeadline: Date | null;
  creatorUserId: string;
  declaredPostalArea: string;
  evidenceDeletedAt: Date | null;
  evidenceDeletionDueAt: Date | null;
  expiresAt: Date | null;
  id: string;
  method: LocalityVerificationMethod;
  publicId: string;
  status: LocalityVerificationStatus;
  version: number;
  verifiedAt: Date | null;
};

export type LocalityDeletionClaim = {
  attemptCount: number;
  evidenceReference: string | null;
  jobId: string;
  lockToken: string;
  lockedUntil: Date;
  maxAttempts: number;
  verificationId: string;
};

export type LocalityDeletionResult = {
  attemptCount: number;
  availableAt: Date;
  status: LocalityEvidenceDeletionStatus;
  version: number;
};

export class LocalityProofError extends Error {
  constructor(
    readonly code: LocalityConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'LocalityProofError';
  }
}

type VerificationRow = QueryResultRow & {
  appeal_deadline: Date | null;
  creator_user_id: string;
  declared_postal_area: string;
  evidence_deleted_at: Date | null;
  evidence_deletion_due_at: Date | null;
  expires_at: Date | null;
  id: string;
  method: LocalityVerificationMethod;
  public_id: string;
  status: LocalityVerificationStatus;
  verified_at: Date | null;
  version: number;
};

type ActiveClaimRow = QueryResultRow & {
  attempt_count: number;
  available_at: Date;
  evidence_reference: string | null;
  id: string;
  locked_by: string;
  max_attempts: number;
  status: LocalityEvidenceDeletionStatus;
  verification_id: string;
  version: number;
};

const correctionReasons = new Set<LocalityReviewReason>([
  'document_too_old',
  'postal_area_mismatch',
  'unreadable',
  'unsupported_proof',
]);
const rejectionReasons = new Set<LocalityReviewReason>(['ineligible_area', 'suspected_tampering']);

function quoteSchema(schemaName: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Database schema name must be a safe lowercase PostgreSQL identifier.');
  }
  return `"${schemaName}"`;
}

function toVerification(row: VerificationRow): LocalityVerificationRecord {
  return {
    appealDeadline: row.appeal_deadline,
    creatorUserId: row.creator_user_id,
    declaredPostalArea: row.declared_postal_area,
    evidenceDeletedAt: row.evidence_deleted_at,
    evidenceDeletionDueAt: row.evidence_deletion_due_at,
    expiresAt: row.expires_at,
    id: row.id,
    method: row.method,
    publicId: row.public_id,
    status: row.status,
    verifiedAt: row.verified_at,
    version: row.version,
  };
}

function postgresConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('constraint' in error)) return undefined;
  return typeof error.constraint === 'string' ? error.constraint : undefined;
}

export class LocalityProofStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
    private readonly localEnvironment: LocalityWorkerEnvironment | null = 'local',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async submit(input: {
    actorUserId: string;
    correlationId: string;
    declaredPostalArea: string;
    evidenceReference: string;
    method: LocalityVerificationMethod;
    publicId: string;
  }): Promise<LocalityVerificationRecord> {
    this.assertEvidence(input.evidenceReference, input.declaredPostalArea);
    try {
      return await this.withTransaction(async (client) => {
        const profile = await client.query<{ locality_current: boolean }>(
          `SELECT locality_status = 'verified' AND locality_expires_at > now() AS locality_current
             FROM creator_profiles WHERE user_id = $1 FOR UPDATE`,
          [input.actorUserId],
        );
        if (profile.rowCount !== 1) {
          throw new LocalityProofError(
            'LOCALITY_ACCESS_DENIED',
            403,
            'Only the Creator can submit locality evidence for this profile.',
          );
        }
        const result = await client.query<VerificationRow>(
          `INSERT INTO locality_verifications (
             public_id, creator_user_id, method, declared_postal_area, evidence_reference
           ) VALUES ($1,$2,$3,$4,$5)
           RETURNING id, public_id, creator_user_id, status, method, declared_postal_area,
                     verified_at, expires_at, appeal_deadline, evidence_deletion_due_at,
                     evidence_deleted_at, version`,
          [
            input.publicId,
            input.actorUserId,
            input.method,
            input.declaredPostalArea,
            input.evidenceReference,
          ],
        );
        const row = result.rows[0];
        if (!row) throw new Error('Locality verification insert returned no row.');
        if (!profile.rows[0]?.locality_current) {
          await client.query(
            `UPDATE creator_profiles
                SET locality_status = 'pending', verified_postal_area = NULL,
                    locality_verified_at = NULL, locality_expires_at = NULL,
                    version = version + 1, updated_at = now()
              WHERE user_id = $1`,
            [input.actorUserId],
          );
        }
        await this.appendHistory(client, {
          actorUserId: input.actorUserId,
          fromStatus: null,
          reasonCode: 'CREATOR_EVIDENCE_SUBMITTED',
          toStatus: 'pending_review',
          verificationId: row.id,
          version: row.version,
        });
        await this.appendAudit(client, {
          action: 'locality.evidence-submitted',
          actorId: input.actorUserId,
          actorType: 'user',
          correlationId: input.correlationId,
          details: { method: input.method, reviewPolicyVersion: 'locality-v1' },
          subjectId: row.id,
          subjectType: 'locality-verification',
        });
        return toVerification(row);
      });
    } catch (error) {
      const constraint = postgresConstraint(error);
      if (constraint === 'locality_verifications_active_creator_uq') {
        throw new LocalityProofError(
          'LOCALITY_ACTIVE_REVIEW_EXISTS',
          409,
          'The Creator already has an active locality review.',
        );
      }
      if (
        constraint === 'locality_verifications_evidence_reference_ck' ||
        constraint === 'locality_verifications_postal_area_ck'
      ) {
        throw new LocalityProofError(
          'LOCALITY_EVIDENCE_INVALID',
          409,
          'Locality evidence must use a private reference and normalized postal area.',
        );
      }
      throw error;
    }
  }

  async resubmitCorrection(input: {
    actorUserId: string;
    correlationId: string;
    declaredPostalArea: string;
    evidenceReference: string;
    method: LocalityVerificationMethod;
    verificationId: string;
  }): Promise<LocalityVerificationRecord> {
    this.assertEvidence(input.evidenceReference, input.declaredPostalArea);
    return this.withTransaction(async (client) => {
      const current = await this.selectVerification(client, input.verificationId, true);
      if (current.creator_user_id !== input.actorUserId) {
        throw new LocalityProofError(
          'LOCALITY_ACCESS_DENIED',
          403,
          'Only the Creator can correct their locality evidence.',
        );
      }
      if (current.status !== 'correction_needed') {
        throw new LocalityProofError(
          'LOCALITY_TRANSITION_CONFLICT',
          409,
          'Only a correction-needed verification can be resubmitted.',
        );
      }
      const result = await client.query<VerificationRow>(
        `UPDATE locality_verifications
            SET status = 'pending_review', method = $2, declared_postal_area = $3,
                evidence_reference = $4, reviewer_user_id = NULL, review_reason = NULL,
                reviewed_at = NULL, version = version + 1, updated_at = now()
          WHERE id = $1
          RETURNING id, public_id, creator_user_id, status, method, declared_postal_area,
                    verified_at, expires_at, appeal_deadline, evidence_deletion_due_at,
                    evidence_deleted_at, version`,
        [current.id, input.method, input.declaredPostalArea, input.evidenceReference],
      );
      const updated = result.rows[0];
      if (!updated) throw new Error('Locality correction update returned no row.');
      await this.appendHistory(client, {
        actorUserId: input.actorUserId,
        fromStatus: current.status,
        reasonCode: 'CREATOR_CORRECTION_RESUBMITTED',
        toStatus: updated.status,
        verificationId: current.id,
        version: updated.version,
      });
      await this.appendAudit(client, {
        action: 'locality.correction-resubmitted',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { method: input.method },
        subjectId: current.id,
        subjectType: 'locality-verification',
      });
      return toVerification(updated);
    });
  }

  async review(input: {
    actorUserId: string;
    correlationId: string;
    decision: LocalityReviewDecision;
    reason: LocalityReviewReason;
    verificationId: string;
  }): Promise<LocalityVerificationRecord> {
    this.assertReviewShape(input.decision, input.reason);
    return this.withTransaction(async (client) => {
      await this.assertReviewer(client, input.actorUserId);
      const current = await this.selectVerification(client, input.verificationId, true);
      if (current.status !== 'pending_review') {
        throw new LocalityProofError(
          'LOCALITY_REVIEW_INVALID',
          409,
          'Only a pending locality verification can be reviewed.',
        );
      }

      const nextStatus: LocalityVerificationStatus =
        input.decision === 'approve'
          ? 'verified'
          : input.decision === 'request_correction'
            ? 'correction_needed'
            : 'rejected';
      const completed = input.decision !== 'request_correction';
      const result = await client.query<VerificationRow>(
        `UPDATE locality_verifications
            SET status = $2, reviewer_user_id = $3, review_reason = $4, reviewed_at = now(),
                verification_completed_at = CASE WHEN $5 THEN now() ELSE NULL END,
                verified_at = CASE WHEN $2::locality_verification_status = 'verified'
                  THEN now() ELSE NULL END,
                expires_at = CASE WHEN $2::locality_verification_status = 'verified'
                  THEN now() + interval '1 year' ELSE NULL END,
                appeal_deadline = CASE WHEN $2::locality_verification_status = 'rejected'
                  THEN now() + interval '14 days' ELSE NULL END,
                evidence_deletion_due_at = CASE WHEN $5 THEN now() + interval '30 days'
                  ELSE NULL END,
                version = version + 1, updated_at = now()
          WHERE id = $1
          RETURNING id, public_id, creator_user_id, status, method, declared_postal_area,
                    verified_at, expires_at, appeal_deadline, evidence_deletion_due_at,
                    evidence_deleted_at, version`,
        [current.id, nextStatus, input.actorUserId, input.reason, completed],
      );
      const updated = result.rows[0];
      if (!updated) throw new Error('Locality review update returned no row.');
      if (input.decision === 'approve') {
        await this.supersedePriorCredentials(client, {
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          creatorUserId: updated.creator_user_id,
          keepVerificationId: updated.id,
        });
        await this.setVerifiedProfile(client, updated);
      } else if (input.decision === 'reject') {
        await this.clearProfileUnlessCurrent(client, updated.creator_user_id, 'rejected');
      } else {
        await this.clearProfileUnlessCurrent(client, updated.creator_user_id, 'pending');
      }
      if (completed && updated.evidence_deletion_due_at) {
        await this.upsertDeletionJob(client, updated.id, updated.evidence_deletion_due_at);
      }
      await this.appendHistory(client, {
        actorUserId: input.actorUserId,
        fromStatus: current.status,
        reasonCode: `REVIEW_${input.reason.toUpperCase()}`,
        toStatus: updated.status,
        verificationId: current.id,
        version: updated.version,
      });
      await this.appendAudit(client, {
        action: `locality.review-${input.decision}`,
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { reason: input.reason, reviewPolicyVersion: 'locality-v1' },
        subjectId: current.id,
        subjectType: 'locality-verification',
      });
      return toVerification(updated);
    });
  }

  async appeal(input: {
    actorUserId: string;
    correlationId: string;
    reason: LocalityAppealReason;
    verificationId: string;
  }): Promise<LocalityVerificationRecord> {
    return this.withTransaction(async (client) => {
      const current = await this.selectVerification(client, input.verificationId, true);
      if (current.creator_user_id !== input.actorUserId) {
        throw new LocalityProofError(
          'LOCALITY_ACCESS_DENIED',
          403,
          'Only the Creator can appeal this locality decision.',
        );
      }
      const eligible = await client.query(
        `SELECT 1 FROM locality_verifications
          WHERE id = $1 AND status = 'rejected' AND appeal_deadline >= now()`,
        [current.id],
      );
      if (eligible.rowCount !== 1) {
        throw new LocalityProofError(
          'LOCALITY_APPEAL_INVALID',
          409,
          'The locality appeal window is closed or the decision is not appealable.',
        );
      }
      const result = await client.query<VerificationRow>(
        `UPDATE locality_verifications
            SET status = 'appeal_pending', appealed_at = now(), appeal_reason = $2,
                version = version + 1, updated_at = now()
          WHERE id = $1
          RETURNING id, public_id, creator_user_id, status, method, declared_postal_area,
                    verified_at, expires_at, appeal_deadline, evidence_deletion_due_at,
                    evidence_deleted_at, version`,
        [current.id, input.reason],
      );
      const updated = result.rows[0];
      if (!updated) throw new Error('Locality appeal update returned no row.');
      await this.appendHistory(client, {
        actorUserId: input.actorUserId,
        fromStatus: current.status,
        reasonCode: `APPEAL_${input.reason.toUpperCase()}`,
        toStatus: updated.status,
        verificationId: current.id,
        version: updated.version,
      });
      await this.appendAudit(client, {
        action: 'locality.appeal-opened',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { reason: input.reason },
        subjectId: current.id,
        subjectType: 'locality-verification',
      });
      return toVerification(updated);
    });
  }

  async decideAppeal(input: {
    actorUserId: string;
    correlationId: string;
    decision: LocalityAppealDecision;
    verificationId: string;
  }): Promise<LocalityVerificationRecord> {
    return this.withTransaction(async (client) => {
      await this.assertReviewer(client, input.actorUserId);
      const current = await client.query<VerificationRow & { reviewer_user_id: string | null }>(
        `SELECT id, public_id, creator_user_id, status, method, declared_postal_area,
                verified_at, expires_at, appeal_deadline, evidence_deletion_due_at,
                evidence_deleted_at, version, reviewer_user_id
           FROM locality_verifications WHERE id = $1 FOR UPDATE`,
        [input.verificationId],
      );
      const verification = current.rows[0];
      if (!verification) {
        throw new LocalityProofError(
          'LOCALITY_NOT_FOUND',
          404,
          'Locality verification was not found.',
        );
      }
      if (
        verification.status !== 'appeal_pending' ||
        verification.reviewer_user_id === input.actorUserId
      ) {
        throw new LocalityProofError(
          'LOCALITY_APPEAL_INVALID',
          409,
          'An appeal needs a different authorized reviewer and a pending appeal.',
        );
      }
      const nextStatus = input.decision === 'approve' ? 'verified' : 'final_rejected';
      const result = await client.query<VerificationRow>(
        `UPDATE locality_verifications
            SET status = $2, appeal_reviewer_user_id = $3, appeal_decided_at = now(),
                verification_completed_at = now(),
                review_reason = CASE WHEN $2::locality_verification_status = 'verified'
                  THEN 'approved'::locality_review_reason ELSE review_reason END,
                verified_at = CASE WHEN $2::locality_verification_status = 'verified'
                  THEN now() ELSE NULL END,
                expires_at = CASE WHEN $2::locality_verification_status = 'verified'
                  THEN now() + interval '1 year' ELSE NULL END,
                evidence_deletion_due_at = GREATEST(evidence_deletion_due_at,
                  now() + interval '30 days'),
                version = version + 1, updated_at = now()
          WHERE id = $1
          RETURNING id, public_id, creator_user_id, status, method, declared_postal_area,
                    verified_at, expires_at, appeal_deadline, evidence_deletion_due_at,
                    evidence_deleted_at, version`,
        [verification.id, nextStatus, input.actorUserId],
      );
      const updated = result.rows[0];
      if (!updated || !updated.evidence_deletion_due_at) {
        throw new Error('Locality appeal decision returned no deletion deadline.');
      }
      if (input.decision === 'approve') {
        await this.supersedePriorCredentials(client, {
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          creatorUserId: updated.creator_user_id,
          keepVerificationId: updated.id,
        });
        await this.setVerifiedProfile(client, updated);
      } else {
        await this.clearProfileUnlessCurrent(client, updated.creator_user_id, 'rejected');
      }
      await this.upsertDeletionJob(client, updated.id, updated.evidence_deletion_due_at);
      await this.appendHistory(client, {
        actorUserId: input.actorUserId,
        fromStatus: verification.status,
        reasonCode: `APPEAL_${input.decision.toUpperCase()}`,
        toStatus: updated.status,
        verificationId: verification.id,
        version: updated.version,
      });
      await this.appendAudit(client, {
        action: `locality.appeal-${input.decision}`,
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { independentReviewer: true },
        subjectId: verification.id,
        subjectType: 'locality-verification',
      });
      return toVerification(updated);
    });
  }

  async declareAddressChange(input: { actorUserId: string; correlationId: string }): Promise<void> {
    return this.withTransaction(async (client) => {
      const result = await client.query<VerificationRow>(
        `UPDATE locality_verifications
            SET status = 'invalidated', invalidated_at = now(),
                invalidation_reason = 'DECLARED_ADDRESS_CHANGE',
                version = version + 1, updated_at = now()
          WHERE id = (
            SELECT id FROM locality_verifications
             WHERE creator_user_id = $1 AND status = 'verified'
             ORDER BY verified_at DESC FOR UPDATE LIMIT 1
          )
          RETURNING id, public_id, creator_user_id, status, method, declared_postal_area,
                    verified_at, expires_at, appeal_deadline, evidence_deletion_due_at,
                    evidence_deleted_at, version`,
        [input.actorUserId],
      );
      const updated = result.rows[0];
      if (!updated) {
        throw new LocalityProofError(
          'LOCALITY_TRANSITION_CONFLICT',
          409,
          'The Creator has no active verified locality to invalidate.',
        );
      }
      await this.clearProfileLocality(client, input.actorUserId, 'unverified');
      await this.appendHistory(client, {
        actorUserId: input.actorUserId,
        fromStatus: 'verified',
        reasonCode: 'DECLARED_ADDRESS_CHANGE',
        toStatus: 'invalidated',
        verificationId: updated.id,
        version: updated.version,
      });
      await this.appendAudit(client, {
        action: 'locality.address-change-declared',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { credentialInvalidated: true },
        subjectId: updated.id,
        subjectType: 'locality-verification',
      });
    });
  }

  async expireDueCredentials(input: { correlationId: string; limit?: number }): Promise<number> {
    const limit = input.limit ?? 25;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new LocalityProofError(
        'LOCALITY_TRANSITION_CONFLICT',
        409,
        'Locality expiry batch size must be between 1 and 100.',
      );
    }
    return this.withTransaction(async (client) => {
      const due = await client.query<VerificationRow>(
        `WITH candidates AS (
           SELECT id FROM locality_verifications
            WHERE status = 'verified' AND expires_at <= now()
            ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT $1
         )
         UPDATE locality_verifications verification
            SET status = 'expired', version = verification.version + 1, updated_at = now()
           FROM candidates WHERE verification.id = candidates.id
         RETURNING verification.id, verification.public_id, verification.creator_user_id,
                   verification.status, verification.method, verification.declared_postal_area,
                   verification.verified_at, verification.expires_at,
                   verification.appeal_deadline, verification.evidence_deletion_due_at,
                   verification.evidence_deleted_at, verification.version`,
        [limit],
      );
      for (const row of due.rows) {
        await client.query(
          `UPDATE creator_profiles
              SET locality_status = 'expired', version = version + 1, updated_at = now()
            WHERE user_id = $1 AND locality_status = 'verified'
              AND locality_expires_at <= now()`,
          [row.creator_user_id],
        );
        await this.appendHistory(client, {
          actorUserId: null,
          fromStatus: 'verified',
          reasonCode: 'ANNUAL_CREDENTIAL_EXPIRED',
          toStatus: 'expired',
          verificationId: row.id,
          version: row.version,
        });
        await this.appendAudit(client, {
          action: 'locality.credential-expired',
          actorId: null,
          actorType: 'service',
          correlationId: input.correlationId,
          details: { annualExpiry: true },
          subjectId: row.id,
          subjectType: 'locality-verification',
        });
      }
      return due.rowCount ?? 0;
    });
  }

  async createLegalHold(input: {
    actorUserId: string;
    caseId: string;
    correlationId: string;
    expiresAt: Date;
    publicId: string;
    reason: 'binding_legal_request' | 'litigation_preservation' | 'security_incident';
    reviewAt: Date;
    verificationId: string;
  }): Promise<string> {
    return this.withTransaction(async (client) => {
      await this.assertAdministrator(client, input.actorUserId);
      const window = await client.query<{ valid: boolean }>(
        `SELECT $1::timestamptz > now()
             AND $1::timestamptz <= $2::timestamptz
             AND $2::timestamptz <= now() + interval '90 days' AS valid`,
        [input.reviewAt, input.expiresAt],
      );
      if (!window.rows[0]?.valid || !/^[A-Z0-9_-]{6,80}$/.test(input.caseId)) {
        throw new LocalityProofError(
          'LOCALITY_HOLD_INVALID',
          409,
          'A legal hold needs a bounded case, review date, and expiry within 90 days.',
        );
      }
      const result = await client.query<{ id: string }>(
        `INSERT INTO locality_legal_holds (
           public_id, locality_verification_id, case_id, reason,
           owner_user_id, review_at, expires_at
         )
         SELECT $1,$2,$3,$4,$5,$6,$7
          WHERE EXISTS (SELECT 1 FROM locality_verifications WHERE id = $2)
         RETURNING id`,
        [
          input.publicId,
          input.verificationId,
          input.caseId,
          input.reason,
          input.actorUserId,
          input.reviewAt,
          input.expiresAt,
        ],
      );
      const hold = result.rows[0];
      if (!hold) {
        throw new LocalityProofError(
          'LOCALITY_NOT_FOUND',
          404,
          'Locality verification was not found.',
        );
      }
      await this.appendAudit(client, {
        action: 'locality.legal-hold-created',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: {
          caseId: input.caseId,
          expiresAt: input.expiresAt.toISOString(),
          reason: input.reason,
          scope: 'locality_evidence',
        },
        subjectId: input.verificationId,
        subjectType: 'locality-verification',
      });
      return hold.id;
    });
  }

  async releaseLegalHold(input: {
    actorUserId: string;
    correlationId: string;
    holdId: string;
  }): Promise<void> {
    return this.withTransaction(async (client) => {
      await this.assertAdministrator(client, input.actorUserId);
      const result = await client.query<{ locality_verification_id: string }>(
        `UPDATE locality_legal_holds
            SET released_at = now(), released_by_user_id = $2,
                version = version + 1, updated_at = now()
          WHERE id = $1 AND released_at IS NULL
          RETURNING locality_verification_id`,
        [input.holdId, input.actorUserId],
      );
      const hold = result.rows[0];
      if (!hold) {
        throw new LocalityProofError(
          'LOCALITY_HOLD_INVALID',
          409,
          'Only an active legal hold can be released.',
        );
      }
      await this.appendAudit(client, {
        action: 'locality.legal-hold-released',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { holdId: input.holdId },
        subjectId: hold.locality_verification_id,
        subjectType: 'locality-verification',
      });
    });
  }

  async claimNextDeletion(input: {
    leaseSeconds?: number;
    workerId: string;
  }): Promise<LocalityDeletionClaim | null> {
    const leaseSeconds = input.leaseSeconds ?? 60;
    if (
      !/^[a-z0-9][a-z0-9:_-]{2,79}$/.test(input.workerId) ||
      !Number.isInteger(leaseSeconds) ||
      leaseSeconds < 15 ||
      leaseSeconds > 300
    ) {
      throw new LocalityProofError(
        'LOCALITY_CLAIM_INVALID',
        409,
        'Worker identity or lease duration is invalid.',
      );
    }
    return this.withTransaction(async (client) => {
      const candidate = await client.query<{ id: string }>(
        `SELECT job.id
           FROM locality_evidence_deletion_jobs job
           JOIN locality_verifications verification ON verification.id = job.locality_verification_id
          WHERE ((job.status = 'pending' AND job.available_at <= now())
             OR (job.status = 'processing' AND job.locked_until <= now()))
            AND verification.evidence_deletion_due_at <= now()
            AND NOT EXISTS (
              SELECT 1 FROM locality_legal_holds hold
               WHERE hold.locality_verification_id = verification.id
                 AND hold.released_at IS NULL AND hold.expires_at > now()
            )
          ORDER BY job.available_at, job.created_at
          FOR UPDATE OF job SKIP LOCKED LIMIT 1`,
      );
      const due = candidate.rows[0];
      if (!due) return null;
      const lockToken = randomUUID();
      const result = await client.query<{
        attempt_count: number;
        evidence_reference: string | null;
        id: string;
        locked_until: Date;
        max_attempts: number;
        verification_id: string;
      }>(
        `UPDATE locality_evidence_deletion_jobs job
            SET status = 'processing', attempt_count = job.attempt_count + 1,
                lock_token = $2, locked_by = $3,
                locked_until = now() + ($4::int * interval '1 second'),
                version = job.version + 1, updated_at = now()
           FROM locality_verifications verification
          WHERE job.id = $1 AND verification.id = job.locality_verification_id
          RETURNING job.id, job.locality_verification_id AS verification_id,
                    job.attempt_count, job.max_attempts, job.locked_until,
                    verification.evidence_reference`,
        [due.id, lockToken, input.workerId, leaseSeconds],
      );
      const claim = result.rows[0];
      if (!claim) throw new Error('Locality deletion claim returned no row.');
      return {
        attemptCount: claim.attempt_count,
        evidenceReference: claim.evidence_reference,
        jobId: claim.id,
        lockToken,
        lockedUntil: claim.locked_until,
        maxAttempts: claim.max_attempts,
        verificationId: claim.verification_id,
      };
    });
  }

  async completeDeletionLocally(input: {
    correlationId: string;
    jobId: string;
    lockToken: string;
  }): Promise<LocalityDeletionResult> {
    if (!this.localEnvironment) {
      throw new LocalityProofError(
        'LOCALITY_TRANSITION_CONFLICT',
        409,
        'The synthetic deletion adapter is unavailable outside local and test environments.',
      );
    }
    return this.withTransaction(async (client) => {
      const claim = await this.selectActiveClaim(client, input.jobId, input.lockToken);
      const outcome = claim.evidence_reference ? 'deleted' : 'no_object';
      await client.query(
        `UPDATE locality_verifications
            SET evidence_reference = NULL, evidence_deleted_at = now(),
                version = version + 1, updated_at = now()
          WHERE id = $1`,
        [claim.verification_id],
      );
      await client.query(
        `INSERT INTO locality_evidence_deletion_attempts (
           public_id, locality_evidence_deletion_job_id, attempt_number, outcome,
           worker_id, started_at
         ) VALUES ($1,$2,$3,$4,$5,now())`,
        [`leda_${randomUUID()}`, claim.id, claim.attempt_count, outcome, claim.locked_by],
      );
      const result = await client.query<{
        attempt_count: number;
        available_at: Date;
        status: LocalityEvidenceDeletionStatus;
        version: number;
      }>(
        `UPDATE locality_evidence_deletion_jobs
            SET status = 'completed', lock_token = NULL, locked_by = NULL,
                locked_until = NULL, last_error_code = NULL, completed_at = now(),
                version = version + 1, updated_at = now()
          WHERE id = $1
          RETURNING status, attempt_count, available_at, version`,
        [claim.id],
      );
      const job = result.rows[0];
      if (!job) throw new Error('Locality deletion completion returned no row.');
      await this.appendAudit(client, {
        action: 'locality.evidence-deleted',
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: { outcome, referenceCleared: true },
        subjectId: claim.verification_id,
        subjectType: 'locality-verification',
      });
      return {
        attemptCount: job.attempt_count,
        availableAt: job.available_at,
        status: job.status,
        version: job.version,
      };
    });
  }

  async recordDeletionFailure(input: {
    correlationId: string;
    errorCode: string;
    jobId: string;
    lockToken: string;
    retryable?: boolean;
  }): Promise<LocalityDeletionResult> {
    if (!/^[A-Z0-9_]{2,80}$/.test(input.errorCode)) {
      throw new LocalityProofError(
        'LOCALITY_TRANSITION_CONFLICT',
        409,
        'Retention failures keep only a bounded safe error code.',
      );
    }
    return this.withTransaction(async (client) => {
      const claim = await this.selectActiveClaim(client, input.jobId, input.lockToken);
      await client.query(
        `INSERT INTO locality_evidence_deletion_attempts (
           public_id, locality_evidence_deletion_job_id, attempt_number, outcome,
           worker_id, error_code, started_at
         ) VALUES ($1,$2,$3,'failed',$4,$5,now())`,
        [`leda_${randomUUID()}`, claim.id, claim.attempt_count, claim.locked_by, input.errorCode],
      );
      const deadLetter = input.retryable === false || claim.attempt_count >= claim.max_attempts;
      const backoffSeconds = [60, 300, 1_800, 7_200, 21_600][Math.min(claim.attempt_count - 1, 4)];
      const result = await client.query<{
        attempt_count: number;
        available_at: Date;
        status: LocalityEvidenceDeletionStatus;
        version: number;
      }>(
        `UPDATE locality_evidence_deletion_jobs
            SET status = $2::locality_evidence_deletion_status,
                lock_token = NULL, locked_by = NULL, locked_until = NULL,
                last_error_code = $3,
                available_at = CASE WHEN $2::locality_evidence_deletion_status = 'pending'
                  THEN now() + ($4::int * interval '1 second') ELSE available_at END,
                dead_lettered_at = CASE WHEN $2::locality_evidence_deletion_status = 'dead_letter'
                  THEN now() ELSE NULL END,
                version = version + 1, updated_at = now()
          WHERE id = $1
          RETURNING status, attempt_count, available_at, version`,
        [claim.id, deadLetter ? 'dead_letter' : 'pending', input.errorCode, backoffSeconds],
      );
      const job = result.rows[0];
      if (!job) throw new Error('Locality deletion failure transition returned no row.');
      if (deadLetter) {
        await client.query(
          `INSERT INTO locality_retention_alerts (
             public_id, locality_evidence_deletion_job_id, code, attempt_count
           ) VALUES ($1,$2,'LOCALITY_EVIDENCE_DELETION_FAILED',$3)
           ON CONFLICT (locality_evidence_deletion_job_id) DO NOTHING`,
          [`lra_${randomUUID()}`, claim.id, claim.attempt_count],
        );
      }
      await this.appendAudit(client, {
        action: deadLetter
          ? 'locality.evidence-deletion-dead-lettered'
          : 'locality.evidence-deletion-retry-scheduled',
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: {
          attemptCount: claim.attempt_count,
          errorCode: input.errorCode,
          retryable: input.retryable !== false,
        },
        subjectId: claim.verification_id,
        subjectType: 'locality-verification',
      });
      return {
        attemptCount: job.attempt_count,
        availableAt: job.available_at,
        status: job.status,
        version: job.version,
      };
    });
  }

  private assertEvidence(evidenceReference: string, postalArea: string): void {
    if (
      !/^private\/locality\/[a-z0-9/_-]{8,180}$/.test(evidenceReference) ||
      !/^[0-9]{5}$/.test(postalArea)
    ) {
      throw new LocalityProofError(
        'LOCALITY_EVIDENCE_INVALID',
        409,
        'Locality evidence must use a private reference and normalized postal area.',
      );
    }
  }

  private assertReviewShape(decision: LocalityReviewDecision, reason: LocalityReviewReason): void {
    const valid =
      (decision === 'approve' && reason === 'approved') ||
      (decision === 'request_correction' && correctionReasons.has(reason)) ||
      (decision === 'reject' && rejectionReasons.has(reason));
    if (!valid) {
      throw new LocalityProofError(
        'LOCALITY_REVIEW_INVALID',
        409,
        'Locality decisions require an objective reason valid for that outcome.',
      );
    }
  }

  private async assertReviewer(client: PoolClient, actorUserId: string): Promise<void> {
    const reviewer = await client.query(
      `SELECT 1 FROM platform_staff_memberships
        WHERE user_id = $1 AND status = 'active'
          AND role IN ('verification_reviewer', 'admin')`,
      [actorUserId],
    );
    if (reviewer.rowCount !== 1) {
      throw new LocalityProofError(
        'LOCALITY_ACCESS_DENIED',
        403,
        'An active verification reviewer is required.',
      );
    }
  }

  private async assertAdministrator(client: PoolClient, actorUserId: string): Promise<void> {
    const administrator = await client.query(
      `SELECT 1 FROM platform_staff_memberships
        WHERE user_id = $1 AND status = 'active' AND role = 'admin'`,
      [actorUserId],
    );
    if (administrator.rowCount !== 1) {
      throw new LocalityProofError(
        'LOCALITY_ACCESS_DENIED',
        403,
        'An active platform administrator is required for legal holds.',
      );
    }
  }

  private async selectVerification(
    client: PoolClient,
    verificationId: string,
    forUpdate = false,
  ): Promise<VerificationRow> {
    const result = await client.query<VerificationRow>(
      `SELECT id, public_id, creator_user_id, status, method, declared_postal_area,
              verified_at, expires_at, appeal_deadline, evidence_deletion_due_at,
              evidence_deleted_at, version
         FROM locality_verifications WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
      [verificationId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new LocalityProofError(
        'LOCALITY_NOT_FOUND',
        404,
        'Locality verification was not found.',
      );
    }
    return row;
  }

  private async setVerifiedProfile(
    client: PoolClient,
    verification: VerificationRow,
  ): Promise<void> {
    await client.query(
      `UPDATE creator_profiles
          SET locality_status = 'verified', verified_postal_area = $2,
              locality_verified_at = $3, locality_expires_at = $4,
              version = version + 1, updated_at = now()
        WHERE user_id = $1`,
      [
        verification.creator_user_id,
        verification.declared_postal_area,
        verification.verified_at,
        verification.expires_at,
      ],
    );
  }

  private async clearProfileLocality(
    client: PoolClient,
    creatorUserId: string,
    status: 'expired' | 'rejected' | 'unverified',
  ): Promise<void> {
    await client.query(
      `UPDATE creator_profiles
          SET locality_status = $2, verified_postal_area = NULL,
              locality_verified_at = NULL, locality_expires_at = NULL,
              version = version + 1, updated_at = now()
        WHERE user_id = $1`,
      [creatorUserId, status],
    );
  }

  private async clearProfileUnlessCurrent(
    client: PoolClient,
    creatorUserId: string,
    status: 'pending' | 'rejected',
  ): Promise<void> {
    await client.query(
      `UPDATE creator_profiles
          SET locality_status = $2, verified_postal_area = NULL,
              locality_verified_at = NULL, locality_expires_at = NULL,
              version = version + 1, updated_at = now()
        WHERE user_id = $1
          AND NOT (locality_status = 'verified' AND locality_expires_at > now())`,
      [creatorUserId, status],
    );
  }

  private async supersedePriorCredentials(
    client: PoolClient,
    input: {
      actorUserId: string;
      correlationId: string;
      creatorUserId: string;
      keepVerificationId: string;
    },
  ): Promise<void> {
    const superseded = await client.query<{ id: string; version: number }>(
      `UPDATE locality_verifications
          SET status = 'invalidated', invalidated_at = now(),
              invalidation_reason = 'NEW_CREDENTIAL_APPROVED',
              version = version + 1, updated_at = now()
        WHERE creator_user_id = $1 AND status = 'verified' AND id <> $2
        RETURNING id, version`,
      [input.creatorUserId, input.keepVerificationId],
    );
    for (const prior of superseded.rows) {
      await this.appendHistory(client, {
        actorUserId: input.actorUserId,
        fromStatus: 'verified',
        reasonCode: 'NEW_CREDENTIAL_APPROVED',
        toStatus: 'invalidated',
        verificationId: prior.id,
        version: prior.version,
      });
      await this.appendAudit(client, {
        action: 'locality.credential-superseded',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { replacementVerificationId: input.keepVerificationId },
        subjectId: prior.id,
        subjectType: 'locality-verification',
      });
    }
  }

  private async upsertDeletionJob(
    client: PoolClient,
    verificationId: string,
    availableAt: Date,
  ): Promise<void> {
    await client.query(
      `INSERT INTO locality_evidence_deletion_jobs (
         public_id, locality_verification_id, available_at
       ) VALUES ($1,$2,$3)
       ON CONFLICT (locality_verification_id) DO UPDATE
         SET available_at = GREATEST(locality_evidence_deletion_jobs.available_at,
                                     EXCLUDED.available_at),
             updated_at = now()
       WHERE locality_evidence_deletion_jobs.status = 'pending'`,
      [`ledj_${randomUUID()}`, verificationId, availableAt],
    );
  }

  private async selectActiveClaim(
    client: PoolClient,
    jobId: string,
    lockToken: string,
  ): Promise<ActiveClaimRow> {
    const result = await client.query<ActiveClaimRow>(
      `SELECT job.id, job.status, job.attempt_count, job.max_attempts, job.available_at,
              job.locked_by, job.version, verification.id AS verification_id,
              verification.evidence_reference
         FROM locality_evidence_deletion_jobs job
         JOIN locality_verifications verification ON verification.id = job.locality_verification_id
        WHERE job.id = $1 AND job.status = 'processing' AND job.lock_token = $2
          AND job.locked_until > now()
        FOR UPDATE OF job, verification`,
      [jobId, lockToken],
    );
    const claim = result.rows[0];
    if (!claim) {
      throw new LocalityProofError(
        'LOCALITY_CLAIM_INVALID',
        409,
        'The locality deletion claim is missing, expired, or owned by another worker.',
      );
    }
    return claim;
  }

  private async appendHistory(
    client: PoolClient,
    input: {
      actorUserId: string | null;
      fromStatus: LocalityVerificationStatus | null;
      reasonCode: string;
      toStatus: LocalityVerificationStatus;
      verificationId: string;
      version: number;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO locality_verification_status_history (
         locality_verification_id, from_status, to_status, verification_version,
         actor_user_id, actor_type, reason_code
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.verificationId,
        input.fromStatus,
        input.toStatus,
        input.version,
        input.actorUserId,
        input.actorUserId ? 'user' : 'service',
        input.reasonCode,
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
