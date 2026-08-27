import type {
  DisputeConflictCode,
  DisputeEvidenceKind,
  DisputeOpenedBy,
  DisputeReasonCode,
  DisputeResolutionOutcome,
  DisputeStatus,
  SubmissionStatus,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type DisputeEvidenceInput = {
  kind: DisputeEvidenceKind;
  publicId: string;
  referenceId: string;
};

export type DisputeRecord = {
  id: string;
  missionAssignmentId: string;
  openedBy: DisputeOpenedBy;
  openedByUserId: string;
  publicId: string;
  reasonCode: DisputeReasonCode;
  status: DisputeStatus;
  submissionAttemptId: string;
  version: number;
};

export class DisputeError extends Error {
  constructor(
    readonly code: DisputeConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'DisputeError';
  }
}

type DisputeRow = QueryResultRow & {
  id: string;
  mission_assignment_id: string;
  opened_by: DisputeOpenedBy;
  opened_by_user_id: string;
  public_id: string;
  reason_code: DisputeReasonCode;
  status: DisputeStatus;
  submission_attempt_id: string;
  version: number;
};

type OpenSubmissionRow = QueryResultRow & {
  business_id: string;
  campaign_brief_version_id: string;
  creator_user_id: string;
  mission_assignment_id: string;
  review_deadline_at: Date;
  server_now: Date;
  status: SubmissionStatus;
  submission_attempt_id: string;
  submission_version: number;
};

type ResolutionRow = DisputeRow & {
  application_id: string;
  application_status: 'accepted' | 'completed' | 'no_payout';
  application_version: number;
  assignment_status: 'checked_in' | 'completed' | 'no_payout';
  assignment_version: number;
  business_id: string;
  creator_user_id: string;
  mission_slot_id: string;
  slot_status: 'accepted' | 'completed' | 'no_payout';
  slot_version: number;
  submission_status: SubmissionStatus;
  submission_version: number;
};

const creatorReasonCodes = new Set<DisputeReasonCode>([
  'correction_outside_contract',
  'requirement_already_satisfied',
]);
const businessReasonCodes = new Set<DisputeReasonCode>([
  'false_check_in',
  'missing_count',
  'corrupt_file',
  'duration_out_of_range',
  'wrong_orientation',
  'insufficient_resolution',
  'wrong_subject',
  'unrelated_brand_watermark',
  'missing_disclosure',
  'suspected_fraud',
]);

function toDisputeRecord(row: DisputeRow): DisputeRecord {
  return {
    id: row.id,
    missionAssignmentId: row.mission_assignment_id,
    openedBy: row.opened_by,
    openedByUserId: row.opened_by_user_id,
    publicId: row.public_id,
    reasonCode: row.reason_code,
    status: row.status,
    submissionAttemptId: row.submission_attempt_id,
    version: row.version,
  };
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

export class DisputeStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async openDispute(input: {
    actorUserId: string;
    correlationId: string;
    evidence: readonly DisputeEvidenceInput[];
    explanation: string;
    openedBy: DisputeOpenedBy;
    publicId: string;
    reasonCode: DisputeReasonCode;
    requirementId: string;
    submissionAttemptId: string;
  }): Promise<DisputeRecord> {
    try {
      return await this.withTransaction(async (client) => {
        const sourceResult = await client.query<OpenSubmissionRow>(
          `SELECT sa.id AS submission_attempt_id, sa.status, sa.version AS submission_version,
                  sa.review_deadline_at, ma.id AS mission_assignment_id,
                  ma.creator_user_id, ma.campaign_brief_version_id, c.business_id,
                  now() AS server_now
             FROM submission_attempts sa
             JOIN mission_assignments ma ON ma.id = sa.mission_assignment_id
             JOIN campaigns c ON c.id = ma.campaign_id
            WHERE sa.id = $1
            FOR UPDATE OF sa, ma`,
          [input.submissionAttemptId],
        );
        const source = sourceResult.rows[0];
        if (!source) {
          throw new DisputeError('DISPUTE_NOT_FOUND', 404, 'Submission does not exist.');
        }
        if (!input.explanation.trim()) {
          throw new DisputeError(
            'DISPUTE_EVIDENCE_INVALID',
            409,
            'A dispute requires a plain-language explanation.',
          );
        }
        const requirement = await client.query(
          `SELECT 1 FROM deliverable_requirements
            WHERE id = $1 AND campaign_brief_version_id = $2`,
          [input.requirementId, source.campaign_brief_version_id],
        );
        if (requirement.rowCount !== 1) {
          throw new DisputeError(
            'DISPUTE_EVIDENCE_INVALID',
            409,
            'A dispute must cite one requirement from the accepted brief.',
          );
        }

        let correctionRequestId: string | null = null;
        if (input.openedBy === 'business') {
          await this.assertBusinessOpener(client, input, source);
        } else {
          correctionRequestId = await this.assertCreatorOpener(client, input, source);
        }
        await this.assertEvidence(client, {
          correctionRequestId,
          evidence: input.evidence,
          missionAssignmentId: source.mission_assignment_id,
          openedBy: input.openedBy,
          reasonCode: input.reasonCode,
          requirementId: input.requirementId,
          submissionAttemptId: source.submission_attempt_id,
        });

        const disputeResult = await client.query<DisputeRow>(
          `INSERT INTO submission_disputes (
             public_id, mission_assignment_id, submission_attempt_id,
             correction_request_id, deliverable_requirement_id, opened_by,
             opened_by_user_id, reason_code, explanation
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, public_id, mission_assignment_id, submission_attempt_id,
                     opened_by, opened_by_user_id, reason_code, status, version`,
          [
            input.publicId,
            source.mission_assignment_id,
            source.submission_attempt_id,
            correctionRequestId,
            input.requirementId,
            input.openedBy,
            input.actorUserId,
            input.reasonCode,
            input.explanation,
          ],
        );
        const dispute = disputeResult.rows[0];
        if (!dispute) throw new Error('Dispute insert returned no row.');
        for (const [index, evidence] of input.evidence.entries()) {
          await client.query(
            `INSERT INTO dispute_evidence_items (
               public_id, dispute_id, kind, reference_id, position
             ) VALUES ($1, $2, $3, $4, $5)`,
            [evidence.publicId, dispute.id, evidence.kind, evidence.referenceId, index + 1],
          );
        }
        const submissionUpdate = await client.query(
          `UPDATE submission_attempts
              SET status = 'disputed', version = version + 1, updated_at = now()
            WHERE id = $1 AND version = $2 AND status = $3::submission_status`,
          [source.submission_attempt_id, source.submission_version, source.status],
        );
        if (submissionUpdate.rowCount !== 1) {
          throw new DisputeError(
            'DISPUTE_TRANSITION_CONFLICT',
            409,
            'Submission changed before the dispute could open.',
          );
        }
        await client.query(
          `INSERT INTO submission_status_history (
             submission_attempt_id, from_status, to_status, submission_version,
             actor_id, actor_type, reason
           ) VALUES ($1, $2::submission_status, 'disputed', $3, $4, 'user', $5)`,
          [
            source.submission_attempt_id,
            source.status,
            source.submission_version + 1,
            input.actorUserId,
            input.reasonCode,
          ],
        );
        await client.query(
          `INSERT INTO dispute_status_history (
             dispute_id, from_status, to_status, dispute_version, actor_id, actor_type, reason
           ) VALUES ($1, NULL, 'open', 1, $2, 'user', $3)`,
          [dispute.id, input.actorUserId, input.reasonCode],
        );
        await this.appendAudit(client, {
          action: `dispute.opened-${input.openedBy}`,
          actorId: input.actorUserId,
          correlationId: input.correlationId,
          details: {
            evidenceCount: input.evidence.length,
            reasonCode: input.reasonCode,
            requirementId: input.requirementId,
          },
          subjectId: dispute.id,
        });
        return toDisputeRecord(dispute);
      });
    } catch (error) {
      const constraint = postgresConstraint(error);
      if (
        constraint === 'submission_disputes_assignment_uq' ||
        constraint === 'submission_disputes_submission_uq' ||
        constraint === 'submission_disputes_correction_uq'
      ) {
        throw new DisputeError(
          'DISPUTE_ALREADY_EXISTS',
          409,
          'This mission already has its one dispute case.',
        );
      }
      throw error;
    }
  }

  async resolveDispute(input: {
    actorUserId: string;
    correlationId: string;
    disputeId: string;
    explanation: string;
    outcome: DisputeResolutionOutcome;
    resolutionPublicId: string;
  }): Promise<DisputeRecord> {
    return this.withTransaction(async (client) => {
      if (!input.explanation.trim()) {
        throw new DisputeError(
          'DISPUTE_EVIDENCE_INVALID',
          409,
          'A resolution requires an evidence-based explanation.',
        );
      }
      const result = await client.query<ResolutionRow>(
        `SELECT d.id, d.public_id, d.mission_assignment_id, d.submission_attempt_id,
                d.opened_by, d.opened_by_user_id, d.reason_code, d.status, d.version,
                sa.status AS submission_status, sa.version AS submission_version,
                ma.application_id, ma.mission_slot_id, ma.creator_user_id,
                ma.status AS assignment_status, ma.version AS assignment_version,
                a.status AS application_status, a.version AS application_version,
                ms.status AS slot_status, ms.version AS slot_version, c.business_id
           FROM submission_disputes d
           JOIN submission_attempts sa ON sa.id = d.submission_attempt_id
           JOIN mission_assignments ma ON ma.id = d.mission_assignment_id
           JOIN mission_applications a ON a.id = ma.application_id
           JOIN mission_slots ms ON ms.id = ma.mission_slot_id
           JOIN campaigns c ON c.id = ma.campaign_id
          WHERE d.id = $1
          FOR UPDATE OF d, sa, ma, a, ms`,
        [input.disputeId],
      );
      const dispute = result.rows[0];
      if (!dispute) throw new DisputeError('DISPUTE_NOT_FOUND', 404, 'Dispute does not exist.');
      await this.assertIndependentReviewer(client, input.actorUserId, dispute);
      if (
        dispute.status !== 'open' ||
        dispute.submission_status !== 'disputed' ||
        dispute.assignment_status !== 'checked_in' ||
        dispute.application_status !== 'accepted' ||
        dispute.slot_status !== 'accepted'
      ) {
        throw new DisputeError(
          'DISPUTE_TRANSITION_CONFLICT',
          409,
          'Dispute and mission state are not jointly eligible for resolution.',
        );
      }

      const disputeStatus: DisputeStatus =
        input.outcome === 'earned_full' ? 'resolved_earned_full' : 'resolved_no_payout';
      const submissionStatus: SubmissionStatus =
        input.outcome === 'earned_full' ? 'resolved_approved' : 'resolved_no_payout';
      const missionStatus = input.outcome === 'earned_full' ? 'completed' : 'no_payout';
      const disputeUpdate = await client.query<DisputeRow>(
        `UPDATE submission_disputes
            SET status = $2::dispute_status, version = version + 1,
                resolved_at = now(), updated_at = now()
          WHERE id = $1 AND status = 'open' AND version = $3
          RETURNING id, public_id, mission_assignment_id, submission_attempt_id,
                    opened_by, opened_by_user_id, reason_code, status, version`,
        [dispute.id, disputeStatus, dispute.version],
      );
      const updatedDispute = disputeUpdate.rows[0];
      if (!updatedDispute) {
        throw new DisputeError(
          'DISPUTE_TRANSITION_CONFLICT',
          409,
          'Dispute changed before resolution could commit.',
        );
      }
      const resolutionResult = await client.query<{ id: string }>(
        `INSERT INTO dispute_resolutions (
           public_id, dispute_id, outcome, explanation, resolved_by_user_id
         ) VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [input.resolutionPublicId, dispute.id, input.outcome, input.explanation, input.actorUserId],
      );
      const resolution = resolutionResult.rows[0];
      if (!resolution) throw new Error('Dispute resolution insert returned no row.');
      await this.updateSubmissionForResolution(
        client,
        dispute,
        submissionStatus,
        input.actorUserId,
      );
      await this.updateMissionForResolution(client, dispute, missionStatus, input.actorUserId);
      await client.query(
        `INSERT INTO dispute_status_history (
           dispute_id, from_status, to_status, dispute_version, actor_id, actor_type, reason
         ) VALUES ($1, 'open', $2::dispute_status, $3, $4, 'user', $5)`,
        [dispute.id, disputeStatus, dispute.version + 1, input.actorUserId, input.explanation],
      );
      await client.query(
        `INSERT INTO financial_action_intents (
           public_id, mission_assignment_id, source_type, source_id, action
         ) VALUES ($1, $2, 'dispute_resolution', $3, $4::financial_action_intent_type)`,
        [
          `fin_${input.resolutionPublicId}`,
          dispute.mission_assignment_id,
          resolution.id,
          input.outcome === 'earned_full' ? 'creator_payable_full' : 'slot_refund_full',
        ],
      );
      await this.appendAudit(client, {
        action:
          input.outcome === 'earned_full'
            ? 'dispute.resolved-earned-full'
            : 'dispute.resolved-no-payout',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { outcome: input.outcome, reasonCode: dispute.reason_code },
        subjectId: dispute.id,
      });
      return toDisputeRecord(updatedDispute);
    });
  }

  private async assertBusinessOpener(
    client: PoolClient,
    input: {
      actorUserId: string;
      reasonCode: DisputeReasonCode;
    },
    source: OpenSubmissionRow,
  ): Promise<void> {
    if (!businessReasonCodes.has(input.reasonCode)) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'A business dispute must use an approved objective failure or fraud reason.',
      );
    }
    const membership = await client.query(
      `SELECT 1 FROM business_memberships
        WHERE business_id = $1 AND user_id = $2 AND status = 'active'
          AND role IN ('owner', 'manager')`,
      [source.business_id, input.actorUserId],
    );
    if (membership.rowCount !== 1) {
      throw new DisputeError(
        'DISPUTE_ACCESS_DENIED',
        403,
        'Submission is unavailable in the active business workspace.',
      );
    }
    if (source.status !== 'under_review') {
      throw new DisputeError(
        'DISPUTE_TRANSITION_CONFLICT',
        409,
        `Business cannot open a dispute from ${source.status}.`,
      );
    }
    if (source.server_now >= source.review_deadline_at) {
      throw new DisputeError(
        'DISPUTE_REVIEW_EXPIRED',
        409,
        'The business review deadline elapsed; automatic approval is authoritative.',
      );
    }
  }

  private async assertCreatorOpener(
    client: PoolClient,
    input: {
      actorUserId: string;
      reasonCode: DisputeReasonCode;
      requirementId: string;
    },
    source: OpenSubmissionRow,
  ): Promise<string> {
    if (source.creator_user_id !== input.actorUserId) {
      throw new DisputeError(
        'DISPUTE_ACCESS_DENIED',
        403,
        'Only the assigned creator can dispute this correction.',
      );
    }
    if (!creatorReasonCodes.has(input.reasonCode)) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'A creator dispute must challenge the scope or satisfaction of the correction.',
      );
    }
    if (source.status !== 'correction_requested') {
      throw new DisputeError(
        'DISPUTE_TRANSITION_CONFLICT',
        409,
        `Creator cannot open a correction dispute from ${source.status}.`,
      );
    }
    const correction = await client.query<{ deliverable_requirement_id: string; id: string }>(
      `SELECT id, deliverable_requirement_id FROM correction_requests
        WHERE mission_assignment_id = $1 AND source_submission_attempt_id = $2
          AND due_at > now()`,
      [source.mission_assignment_id, source.submission_attempt_id],
    );
    const row = correction.rows[0];
    if (!row) {
      throw new DisputeError(
        'DISPUTE_REVIEW_EXPIRED',
        409,
        'The correction deadline elapsed before the creator dispute opened.',
      );
    }
    if (row.deliverable_requirement_id !== input.requirementId) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'Creator dispute must cite the requirement named by the correction.',
      );
    }
    return row.id;
  }

  private async assertEvidence(
    client: PoolClient,
    input: {
      correctionRequestId: string | null;
      evidence: readonly DisputeEvidenceInput[];
      missionAssignmentId: string;
      openedBy: DisputeOpenedBy;
      reasonCode: DisputeReasonCode;
      requirementId: string;
      submissionAttemptId: string;
    },
  ): Promise<void> {
    if (input.evidence.length < 2 || input.evidence.length > 10) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'A dispute requires two to ten structured evidence references.',
      );
    }
    const keys = input.evidence.map((item) => `${item.kind}:${item.referenceId}`);
    if (new Set(keys).size !== keys.length) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'Dispute evidence references cannot be duplicated.',
      );
    }
    const has = (kind: DisputeEvidenceKind, referenceId?: string): boolean =>
      input.evidence.some(
        (item) =>
          item.kind === kind && (referenceId === undefined || item.referenceId === referenceId),
      );
    if (!has('deliverable_requirement', input.requirementId)) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'Dispute evidence must include the cited locked requirement.',
      );
    }
    if (
      input.openedBy === 'creator' &&
      (!input.correctionRequestId || !has('correction_request', input.correctionRequestId))
    ) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'Creator dispute evidence must include the challenged correction.',
      );
    }
    const mediaReasons = new Set<DisputeReasonCode>([
      'corrupt_file',
      'duration_out_of_range',
      'wrong_orientation',
      'insufficient_resolution',
      'wrong_subject',
      'unrelated_brand_watermark',
    ]);
    if (mediaReasons.has(input.reasonCode) && !has('media_asset')) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'This reason requires a media reference.',
      );
    }
    if (input.reasonCode === 'false_check_in' && !has('check_in_event')) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'False check-in disputes require the check-in event reference.',
      );
    }
    if (input.reasonCode === 'missing_count' && !has('submission_attempt')) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'Missing-count disputes require the complete submission reference.',
      );
    }
    if (input.reasonCode === 'missing_disclosure' && !has('submission_evidence')) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'Missing-disclosure disputes require the structured post evidence reference.',
      );
    }
    if (
      input.reasonCode === 'suspected_fraud' &&
      !has('media_asset') &&
      !has('check_in_event') &&
      !has('submission_attempt')
    ) {
      throw new DisputeError(
        'DISPUTE_EVIDENCE_INVALID',
        409,
        'Suspected-fraud disputes require mission evidence beyond the checklist reference.',
      );
    }

    for (const evidence of input.evidence) {
      const valid = await this.evidenceBelongsToMission(
        client,
        evidence,
        input.missionAssignmentId,
      );
      if (!valid) {
        throw new DisputeError(
          'DISPUTE_EVIDENCE_INVALID',
          409,
          'Every evidence reference must belong to the disputed mission.',
        );
      }
    }
  }

  private async evidenceBelongsToMission(
    client: PoolClient,
    evidence: DisputeEvidenceInput,
    missionAssignmentId: string,
  ): Promise<boolean> {
    const queries: Record<DisputeEvidenceKind, string> = {
      check_in_event: `SELECT 1 FROM check_in_events WHERE id = $1 AND mission_assignment_id = $2`,
      correction_request: `SELECT 1 FROM correction_requests WHERE id = $1 AND mission_assignment_id = $2`,
      deliverable_requirement: `SELECT 1 FROM deliverable_requirements dr
        JOIN mission_assignments ma ON ma.campaign_brief_version_id = dr.campaign_brief_version_id
        WHERE dr.id = $1 AND ma.id = $2`,
      media_asset: `SELECT 1 FROM media_assets WHERE id = $1 AND mission_assignment_id = $2`,
      submission_attempt: `SELECT 1 FROM submission_attempts WHERE id = $1 AND mission_assignment_id = $2`,
      submission_evidence: `SELECT 1 FROM submission_evidence se
        JOIN submission_attempts sa ON sa.id = se.submission_attempt_id
        WHERE se.id = $1 AND sa.mission_assignment_id = $2`,
    };
    const query = queries[evidence.kind];
    if (!query) return false;
    const result = await client.query(query, [evidence.referenceId, missionAssignmentId]);
    return result.rowCount === 1;
  }

  private async assertIndependentReviewer(
    client: PoolClient,
    actorUserId: string,
    dispute: ResolutionRow,
  ): Promise<void> {
    const reviewer = await client.query(
      `SELECT 1 FROM platform_staff_memberships
        WHERE user_id = $1 AND status = 'active' AND role IN ('dispute_reviewer', 'admin')`,
      [actorUserId],
    );
    if (reviewer.rowCount !== 1) {
      throw new DisputeError(
        'DISPUTE_ACCESS_DENIED',
        403,
        'Only an active platform dispute reviewer can resolve this case.',
      );
    }
    const businessConflict = await client.query(
      `SELECT 1 FROM business_memberships
        WHERE business_id = $1 AND user_id = $2 AND status = 'active'`,
      [dispute.business_id, actorUserId],
    );
    if (
      actorUserId === dispute.creator_user_id ||
      actorUserId === dispute.opened_by_user_id ||
      businessConflict.rowCount === 1
    ) {
      throw new DisputeError(
        'DISPUTE_REVIEWER_CONFLICT',
        409,
        'A party to the mission or dispute cannot resolve the case.',
      );
    }
  }

  private async updateSubmissionForResolution(
    client: PoolClient,
    dispute: ResolutionRow,
    status: SubmissionStatus,
    actorUserId: string,
  ): Promise<void> {
    const updated = await client.query(
      `UPDATE submission_attempts
          SET status = $2::submission_status, version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'disputed' AND version = $3`,
      [dispute.submission_attempt_id, status, dispute.submission_version],
    );
    if (updated.rowCount !== 1) {
      throw new DisputeError(
        'DISPUTE_TRANSITION_CONFLICT',
        409,
        'Submission changed before resolution could commit.',
      );
    }
    await client.query(
      `INSERT INTO submission_status_history (
         submission_attempt_id, from_status, to_status, submission_version,
         actor_id, actor_type, reason
       ) VALUES ($1, 'disputed', $2::submission_status, $3, $4, 'user', 'Admin dispute resolution')`,
      [dispute.submission_attempt_id, status, dispute.submission_version + 1, actorUserId],
    );
  }

  private async updateMissionForResolution(
    client: PoolClient,
    dispute: ResolutionRow,
    status: 'completed' | 'no_payout',
    actorUserId: string,
  ): Promise<void> {
    const assignment = await client.query(
      `UPDATE mission_assignments
          SET status = $2::mission_assignment_status, version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'checked_in' AND version = $3`,
      [dispute.mission_assignment_id, status, dispute.assignment_version],
    );
    const application = await client.query(
      `UPDATE mission_applications
          SET status = $2::mission_application_status, version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'accepted' AND version = $3`,
      [dispute.application_id, status, dispute.application_version],
    );
    const slot = await client.query(
      `UPDATE mission_slots
          SET status = $2::mission_slot_status, version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'accepted' AND version = $3`,
      [dispute.mission_slot_id, status, dispute.slot_version],
    );
    if (assignment.rowCount !== 1 || application.rowCount !== 1 || slot.rowCount !== 1) {
      throw new DisputeError(
        'DISPUTE_TRANSITION_CONFLICT',
        409,
        'Mission state changed before resolution could commit.',
      );
    }
    await client.query(
      `INSERT INTO mission_assignment_status_history (
         mission_assignment_id, from_status, to_status, assignment_version,
         actor_id, actor_type, reason
       ) VALUES ($1, 'checked_in', $2::mission_assignment_status, $3, $4, 'user',
                 'Admin dispute resolution')`,
      [dispute.mission_assignment_id, status, dispute.assignment_version + 1, actorUserId],
    );
    await client.query(
      `INSERT INTO mission_application_status_history (
         application_id, from_status, to_status, application_version,
         actor_id, actor_type, reason
       ) VALUES ($1, 'accepted', $2::mission_application_status, $3, $4, 'user',
                 'Admin dispute resolution')`,
      [dispute.application_id, status, dispute.application_version + 1, actorUserId],
    );
  }

  private async appendAudit(
    client: PoolClient,
    input: {
      action: string;
      actorId: string;
      correlationId: string;
      details: Record<string, unknown>;
      subjectId: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_events (
         actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
       ) VALUES ($1, 'user', $2, $3, 'dispute', $4, $5::jsonb)`,
      [
        input.actorId,
        input.action,
        input.correlationId,
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
