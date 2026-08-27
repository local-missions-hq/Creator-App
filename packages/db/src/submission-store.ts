import type {
  CorrectionReasonCode,
  DeliverableRequirementType,
  MediaAssetStatus,
  MediaOrientation,
  SubmissionConflictCode,
  SubmissionEvidenceKind,
  SubmissionStatus,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type DeliverableRequirementInput = {
  allowedMimeTypes: readonly string[];
  maxDurationSeconds?: number;
  minDurationSeconds?: number;
  minHeightPixels?: number;
  minWidthPixels?: number;
  objectiveDescription: string;
  ordinal: number;
  orientation?: MediaOrientation;
  publicId: string;
  requiredCount: number;
  requiresDisclosure?: boolean;
  type: DeliverableRequirementType;
};

export type SubmissionEvidenceInput = {
  data: Record<string, unknown>;
  kind: SubmissionEvidenceKind;
};

export type SubmissionGroupInput = {
  assetIds?: readonly string[];
  evidenceItems?: readonly SubmissionEvidenceInput[];
  requirementId: string;
};

export type MediaAssetRecord = {
  byteSize: number;
  checksumSha256: string;
  creatorUserId: string;
  durationSeconds: number | null;
  heightPixels: number;
  id: string;
  mimeType: string;
  missionAssignmentId: string;
  orientation: MediaOrientation;
  publicId: string;
  status: MediaAssetStatus;
  storageObjectKey: string;
  widthPixels: number;
};

export type SubmissionRecord = {
  attemptNumber: number;
  id: string;
  missionAssignmentId: string;
  publicId: string;
  reviewDeadlineAt: Date;
  status: SubmissionStatus;
  submittedAt: Date;
  version: number;
};

export class SubmissionError extends Error {
  constructor(
    readonly code: SubmissionConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'SubmissionError';
  }
}

type RequirementRow = QueryResultRow & {
  allowed_mime_types: string[];
  campaign_brief_version_id: string;
  id: string;
  max_duration_seconds: number | null;
  min_duration_seconds: number | null;
  min_height_pixels: number;
  min_width_pixels: number;
  objective_description: string;
  ordinal: number;
  orientation: MediaOrientation;
  required_count: number;
  requires_disclosure: boolean;
  type: DeliverableRequirementType;
};

type MediaAssetRow = QueryResultRow & {
  byte_size: number;
  checksum_sha256: string;
  creator_user_id: string;
  duration_seconds: number | null;
  height_pixels: number;
  id: string;
  mime_type: string;
  mission_assignment_id: string;
  orientation: MediaOrientation;
  public_id: string;
  status: MediaAssetStatus;
  storage_object_key: string;
  width_pixels: number;
};

type SubmissionRow = QueryResultRow & {
  attempt_number: number;
  id: string;
  mission_assignment_id: string;
  public_id: string;
  review_deadline_at: Date;
  status: SubmissionStatus;
  submitted_at: Date;
  version: number;
};

type ReviewRow = SubmissionRow & {
  application_id: string;
  application_status: 'accepted' | 'completed';
  application_version: number;
  business_id: string;
  mission_slot_id: string;
  assignment_status: 'checked_in' | 'completed';
  assignment_version: number;
  server_now: Date;
  slot_status: 'accepted' | 'completed';
  slot_version: number;
};

function toMediaAssetRecord(row: MediaAssetRow): MediaAssetRecord {
  return {
    byteSize: row.byte_size,
    checksumSha256: row.checksum_sha256,
    creatorUserId: row.creator_user_id,
    durationSeconds: row.duration_seconds,
    heightPixels: row.height_pixels,
    id: row.id,
    mimeType: row.mime_type,
    missionAssignmentId: row.mission_assignment_id,
    orientation: row.orientation,
    publicId: row.public_id,
    status: row.status,
    storageObjectKey: row.storage_object_key,
    widthPixels: row.width_pixels,
  };
}

function toSubmissionRecord(row: SubmissionRow): SubmissionRecord {
  return {
    attemptNumber: row.attempt_number,
    id: row.id,
    missionAssignmentId: row.mission_assignment_id,
    publicId: row.public_id,
    reviewDeadlineAt: row.review_deadline_at,
    status: row.status,
    submittedAt: row.submitted_at,
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

const mediaRequirementTypes = new Set<DeliverableRequirementType>([
  'photo',
  'raw_clip',
  'edited_video',
]);

export class SubmissionStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async configureDeliverableRequirements(input: {
    actorUserId: string;
    campaignId: string;
    correlationId: string;
    requirements: readonly DeliverableRequirementInput[];
  }): Promise<string[]> {
    return this.withTransaction(async (client) => {
      const briefResult = await client.query<{ brief_id: string }>(
        `SELECT cbv.id AS brief_id
           FROM campaigns c
           JOIN campaign_brief_versions cbv ON cbv.campaign_id = c.id
                AND cbv.version = (
                  SELECT max(latest.version) FROM campaign_brief_versions latest
                   WHERE latest.campaign_id = c.id
                )
          WHERE c.id = $1 AND c.status = 'draft'
            AND EXISTS (
              SELECT 1 FROM business_memberships m
               WHERE m.business_id = c.business_id AND m.user_id = $2
                 AND m.status = 'active' AND m.role IN ('owner', 'manager')
            )
          FOR UPDATE OF c, cbv`,
        [input.campaignId, input.actorUserId],
      );
      const brief = briefResult.rows[0];
      if (!brief) {
        throw new SubmissionError(
          'SUBMISSION_ACCESS_DENIED',
          403,
          'Draft campaign brief is unavailable in the active business workspace.',
        );
      }
      const existing = await client.query(
        `SELECT 1 FROM deliverable_requirements WHERE campaign_brief_version_id = $1 LIMIT 1`,
        [brief.brief_id],
      );
      if (existing.rowCount) {
        throw new SubmissionError(
          'SUBMISSION_CONTRACT_INCOMPLETE',
          409,
          'This campaign brief already has locked deliverable requirements.',
        );
      }
      this.assertRequirementContract(input.requirements);

      const ids: string[] = [];
      for (const requirement of input.requirements) {
        const result = await client.query<{ id: string }>(
          `INSERT INTO deliverable_requirements (
             public_id, campaign_brief_version_id, ordinal, type, required_count,
             allowed_mime_types, min_duration_seconds, max_duration_seconds,
             orientation, min_width_pixels, min_height_pixels,
             requires_disclosure, objective_description
           ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id`,
          [
            requirement.publicId,
            brief.brief_id,
            requirement.ordinal,
            requirement.type,
            requirement.requiredCount,
            JSON.stringify(requirement.allowedMimeTypes),
            requirement.minDurationSeconds ?? null,
            requirement.maxDurationSeconds ?? null,
            requirement.orientation ?? 'any',
            requirement.minWidthPixels ?? 0,
            requirement.minHeightPixels ?? 0,
            requirement.requiresDisclosure ?? false,
            requirement.objectiveDescription,
          ],
        );
        const row = result.rows[0];
        if (!row) throw new Error('Deliverable requirement insert returned no row.');
        ids.push(row.id);
      }
      await this.appendAudit(client, {
        action: 'campaign.deliverables-locked',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { briefId: brief.brief_id, requirementCount: ids.length },
        subjectId: input.campaignId,
        subjectType: 'campaign',
      });
      return ids;
    });
  }

  async registerMediaAsset(input: {
    byteSize: number;
    checksumSha256: string;
    correlationId: string;
    creatorUserId: string;
    durationSeconds?: number;
    heightPixels: number;
    mimeType: string;
    missionAssignmentId: string;
    orientation: MediaOrientation;
    publicId: string;
    storageObjectKey: string;
    widthPixels: number;
  }): Promise<MediaAssetRecord> {
    return this.withTransaction(async (client) => {
      const assignment = await client.query<{ public_id: string }>(
        `SELECT public_id FROM mission_assignments
          WHERE id = $1 AND creator_user_id = $2 AND status = 'checked_in'
          FOR UPDATE`,
        [input.missionAssignmentId, input.creatorUserId],
      );
      const assignmentRow = assignment.rows[0];
      if (!assignmentRow) {
        throw new SubmissionError(
          'SUBMISSION_CHECK_IN_REQUIRED',
          409,
          'Media can be registered only by the checked-in creator for this mission.',
        );
      }
      const requiredPrefix = `assignments/${assignmentRow.public_id}/`;
      if (!input.storageObjectKey.startsWith(requiredPrefix)) {
        throw new SubmissionError(
          'MEDIA_ASSET_CONFLICT',
          409,
          'Media object key is outside the assigned private mission prefix.',
        );
      }

      const result = await client.query<MediaAssetRow>(
        `INSERT INTO media_assets (
           public_id, mission_assignment_id, creator_user_id, storage_object_key,
           checksum_sha256, mime_type, byte_size, duration_seconds,
           width_pixels, height_pixels, orientation
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT DO NOTHING
         RETURNING id, public_id, mission_assignment_id, creator_user_id, storage_object_key,
                   checksum_sha256, mime_type, byte_size, duration_seconds,
                   width_pixels, height_pixels, orientation, status`,
        [
          input.publicId,
          input.missionAssignmentId,
          input.creatorUserId,
          input.storageObjectKey,
          input.checksumSha256,
          input.mimeType,
          input.byteSize,
          input.durationSeconds ?? null,
          input.widthPixels,
          input.heightPixels,
          input.orientation,
        ],
      );
      const inserted = result.rows[0];
      if (inserted) {
        await this.appendAudit(client, {
          action: 'media-asset.registered',
          actorId: input.creatorUserId,
          actorType: 'user',
          correlationId: input.correlationId,
          details: { mimeType: input.mimeType, status: inserted.status },
          subjectId: inserted.id,
          subjectType: 'media-asset',
        });
        return toMediaAssetRecord(inserted);
      }

      const replay = await client.query<MediaAssetRow>(
        `SELECT id, public_id, mission_assignment_id, creator_user_id, storage_object_key,
                checksum_sha256, mime_type, byte_size, duration_seconds,
                width_pixels, height_pixels, orientation, status
           FROM media_assets
          WHERE mission_assignment_id = $1
            AND (storage_object_key = $2 OR checksum_sha256 = $3)
          FOR UPDATE`,
        [input.missionAssignmentId, input.storageObjectKey, input.checksumSha256],
      );
      const existing = replay.rows[0];
      if (existing && this.assetMetadataMatches(existing, input)) {
        return toMediaAssetRecord(existing);
      }
      throw new SubmissionError(
        'MEDIA_ASSET_CONFLICT',
        409,
        'Media object key or checksum is already bound to different metadata.',
      );
    });
  }

  async setMediaAssetValidation(input: {
    correlationId: string;
    mediaAssetId: string;
    reason?: string;
    status: 'verified' | 'quarantined' | 'rejected';
  }): Promise<MediaAssetRecord> {
    return this.withTransaction(async (client) => {
      if (input.status === 'verified' ? input.reason !== undefined : !input.reason?.trim()) {
        throw new SubmissionError(
          'SUBMISSION_ASSET_INVALID',
          409,
          'Verified assets cannot have a failure reason; quarantine or rejection requires one.',
        );
      }
      const current = await client.query<MediaAssetRow>(
        `SELECT id, public_id, mission_assignment_id, creator_user_id, storage_object_key,
                checksum_sha256, mime_type, byte_size, duration_seconds,
                width_pixels, height_pixels, orientation, status
           FROM media_assets WHERE id = $1 FOR UPDATE`,
        [input.mediaAssetId],
      );
      const row = current.rows[0];
      if (!row) {
        throw new SubmissionError('SUBMISSION_NOT_FOUND', 404, 'Media asset does not exist.');
      }
      if (row.status !== 'pending_scan') {
        if (row.status === input.status) return toMediaAssetRecord(row);
        throw new SubmissionError(
          'SUBMISSION_TRANSITION_CONFLICT',
          409,
          `Media asset cannot transition from ${row.status} to ${input.status}.`,
        );
      }
      const updated = await client.query<MediaAssetRow>(
        `UPDATE media_assets
            SET status = $2::media_asset_status, validation_reason = $3,
                verified_at = CASE WHEN $2::media_asset_status = 'verified' THEN now() ELSE NULL END,
                updated_at = now()
          WHERE id = $1
          RETURNING id, public_id, mission_assignment_id, creator_user_id, storage_object_key,
                    checksum_sha256, mime_type, byte_size, duration_seconds,
                    width_pixels, height_pixels, orientation, status`,
        [input.mediaAssetId, input.status, input.reason ?? null],
      );
      const updatedRow = updated.rows[0];
      if (!updatedRow) throw new Error('Media validation update returned no row.');
      await this.appendAudit(client, {
        action: `media-asset.${input.status}`,
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: { reason: input.reason ?? null },
        subjectId: updatedRow.id,
        subjectType: 'media-asset',
      });
      return toMediaAssetRecord(updatedRow);
    });
  }

  async submitComplete(input: {
    correlationId: string;
    creatorUserId: string;
    groups: readonly SubmissionGroupInput[];
    missionAssignmentId: string;
    publicId: string;
  }): Promise<SubmissionRecord> {
    try {
      return await this.withTransaction(async (client) => {
        const assignmentResult = await client.query<{
          campaign_brief_version_id: string;
          creator_user_id: string;
          status: string;
        }>(
          `SELECT campaign_brief_version_id, creator_user_id, status
             FROM mission_assignments WHERE id = $1 FOR UPDATE`,
          [input.missionAssignmentId],
        );
        const assignment = assignmentResult.rows[0];
        if (!assignment || assignment.creator_user_id !== input.creatorUserId) {
          throw new SubmissionError(
            'SUBMISSION_ACCESS_DENIED',
            403,
            'Mission assignment is unavailable to this creator.',
          );
        }
        if (assignment.status !== 'checked_in') {
          throw new SubmissionError(
            'SUBMISSION_CHECK_IN_REQUIRED',
            409,
            'Complete submission requires a verified check-in.',
          );
        }

        const priorResult = await client.query<SubmissionRow>(
          `SELECT id, public_id, mission_assignment_id, attempt_number, status,
                  submitted_at, review_deadline_at, version
             FROM submission_attempts
            WHERE mission_assignment_id = $1 ORDER BY attempt_number
            FOR UPDATE`,
          [input.missionAssignmentId],
        );
        let attemptNumber = 1;
        if (priorResult.rows.length === 1) {
          const prior = priorResult.rows[0];
          if (!prior || prior.status !== 'correction_requested') {
            throw new SubmissionError(
              'SUBMISSION_ALREADY_EXISTS',
              409,
              'Mission already has an active or final complete submission.',
            );
          }
          const correction = await client.query<{ due_at: Date }>(
            `SELECT due_at FROM correction_requests
              WHERE mission_assignment_id = $1
                AND source_submission_attempt_id = $2
                AND due_at > now()`,
            [input.missionAssignmentId, prior.id],
          );
          const correctionRow = correction.rows[0];
          if (!correctionRow) {
            throw new SubmissionError(
              'SUBMISSION_TRANSITION_CONFLICT',
              409,
              'Correction deadline has passed.',
            );
          }
          attemptNumber = 2;
        } else if (priorResult.rows.length > 1) {
          throw new SubmissionError(
            'SUBMISSION_SECOND_CORRECTION_NOT_ALLOWED',
            409,
            'Only one corrected resubmission is permitted.',
          );
        }

        const requirementsResult = await client.query<RequirementRow>(
          `SELECT id, campaign_brief_version_id, ordinal, type, required_count,
                  allowed_mime_types, min_duration_seconds, max_duration_seconds,
                  orientation, min_width_pixels, min_height_pixels,
                  requires_disclosure, objective_description
             FROM deliverable_requirements
            WHERE campaign_brief_version_id = $1 ORDER BY ordinal`,
          [assignment.campaign_brief_version_id],
        );
        if (requirementsResult.rows.length === 0) {
          throw new SubmissionError(
            'SUBMISSION_CONTRACT_INCOMPLETE',
            409,
            'Accepted mission has no locked deliverable requirements.',
          );
        }
        await this.assertCompleteEvidence(client, {
          assignmentId: input.missionAssignmentId,
          creatorUserId: input.creatorUserId,
          groups: input.groups,
          requirements: requirementsResult.rows,
        });

        const submissionResult = await client.query<SubmissionRow>(
          `INSERT INTO submission_attempts (
             public_id, mission_assignment_id, attempt_number, submitted_at, review_deadline_at
           ) VALUES ($1, $2, $3, now(), now() + interval '48 hours')
           RETURNING id, public_id, mission_assignment_id, attempt_number, status,
                     submitted_at, review_deadline_at, version`,
          [input.publicId, input.missionAssignmentId, attemptNumber],
        );
        const submissionRow = submissionResult.rows[0];
        if (!submissionRow) throw new Error('Submission insert returned no row.');

        for (const group of input.groups) {
          for (const [index, assetId] of (group.assetIds ?? []).entries()) {
            await client.query(
              `INSERT INTO submission_assets (
                 submission_attempt_id, deliverable_requirement_id, media_asset_id, position
               ) VALUES ($1, $2, $3, $4)`,
              [submissionRow.id, group.requirementId, assetId, index + 1],
            );
          }
          for (const [index, evidence] of (group.evidenceItems ?? []).entries()) {
            await client.query(
              `INSERT INTO submission_evidence (
                 submission_attempt_id, deliverable_requirement_id, kind, position, evidence_data
               ) VALUES ($1, $2, $3, $4, $5::jsonb)`,
              [
                submissionRow.id,
                group.requirementId,
                evidence.kind,
                index + 1,
                JSON.stringify(evidence.data),
              ],
            );
          }
        }
        await client.query(
          `INSERT INTO submission_status_history (
             submission_attempt_id, from_status, to_status, submission_version,
             actor_id, actor_type, reason
           ) VALUES ($1, NULL, 'under_review', 1, $2, 'user', $3)`,
          [
            submissionRow.id,
            input.creatorUserId,
            attemptNumber === 1 ? 'Complete submission created' : 'Corrected submission created',
          ],
        );
        await this.appendAudit(client, {
          action: attemptNumber === 1 ? 'submission.completed' : 'submission.resubmitted',
          actorId: input.creatorUserId,
          actorType: 'user',
          correlationId: input.correlationId,
          details: {
            attemptNumber,
            reviewDeadlineAt: submissionRow.review_deadline_at.toISOString(),
          },
          subjectId: submissionRow.id,
          subjectType: 'submission',
        });
        return toSubmissionRecord(submissionRow);
      });
    } catch (error) {
      if (postgresConstraint(error) === 'submission_attempts_assignment_number_uq') {
        throw new SubmissionError(
          'SUBMISSION_ALREADY_EXISTS',
          409,
          'Only one complete submission can occupy an attempt number.',
        );
      }
      throw error;
    }
  }

  async reviewSubmission(input: {
    actorUserId: string;
    correlationId: string;
    correction?: {
      explanation: string;
      publicId: string;
      reasonCode: CorrectionReasonCode;
      requirementId: string;
    };
    decision: 'approve' | 'request_correction';
    decisionPublicId: string;
    submissionAttemptId: string;
  }): Promise<SubmissionRecord> {
    return this.withTransaction(async (client) => {
      const review = await this.selectSubmissionForReview(
        client,
        input.submissionAttemptId,
        input.actorUserId,
      );
      if (review.status !== 'under_review') {
        throw new SubmissionError(
          'SUBMISSION_TRANSITION_CONFLICT',
          409,
          `Submission cannot be reviewed from ${review.status}.`,
        );
      }
      if (review.server_now >= review.review_deadline_at) {
        throw new SubmissionError(
          'SUBMISSION_REVIEW_EXPIRED',
          409,
          'Business review window has expired; automatic approval is now authoritative.',
        );
      }
      if (input.decision === 'approve') {
        if (input.correction) {
          throw new SubmissionError(
            'SUBMISSION_TRANSITION_CONFLICT',
            409,
            'Approval cannot include a correction request.',
          );
        }
        return this.finalizeApproval(client, {
          actorId: input.actorUserId,
          actorType: 'user',
          correlationId: input.correlationId,
          decisionPublicId: input.decisionPublicId,
          review,
          status: 'approved',
        });
      }

      const correction = input.correction;
      if (!correction) {
        throw new SubmissionError(
          'SUBMISSION_TRANSITION_CONFLICT',
          409,
          'Correction request requires one objective criterion and explanation.',
        );
      }
      if (review.attempt_number !== 1) {
        throw new SubmissionError(
          'SUBMISSION_SECOND_CORRECTION_NOT_ALLOWED',
          409,
          'A second correction request is not permitted.',
        );
      }
      const requirement = await client.query(
        `SELECT 1
           FROM deliverable_requirements dr
           JOIN mission_assignments ma ON ma.campaign_brief_version_id = dr.campaign_brief_version_id
          WHERE ma.id = $1 AND dr.id = $2`,
        [review.mission_assignment_id, correction.requirementId],
      );
      if (requirement.rowCount !== 1 || !correction.explanation.trim()) {
        throw new SubmissionError(
          'SUBMISSION_TRANSITION_CONFLICT',
          409,
          'Correction must cite one locked objective requirement with an explanation.',
        );
      }

      const updated = await this.updateSubmissionStatus(client, review, 'correction_requested');
      await client.query(
        `INSERT INTO correction_requests (
           public_id, mission_assignment_id, source_submission_attempt_id,
           deliverable_requirement_id, reason_code, explanation, due_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, now() + interval '48 hours', $7)`,
        [
          correction.publicId,
          review.mission_assignment_id,
          review.id,
          correction.requirementId,
          correction.reasonCode,
          correction.explanation,
          input.actorUserId,
        ],
      );
      await client.query(
        `INSERT INTO submission_review_decisions (
           public_id, submission_attempt_id, decision, reason_code,
           explanation, actor_id, actor_type
         ) VALUES ($1, $2, 'correction_requested', $3, $4, $5, 'user')`,
        [
          input.decisionPublicId,
          review.id,
          correction.reasonCode,
          correction.explanation,
          input.actorUserId,
        ],
      );
      await this.appendSubmissionHistory(client, {
        actorId: input.actorUserId,
        actorType: 'user',
        fromStatus: review.status,
        reason: correction.reasonCode,
        submission: updated,
      });
      await this.appendAudit(client, {
        action: 'submission.correction-requested',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: {
          reasonCode: correction.reasonCode,
          requirementId: correction.requirementId,
        },
        subjectId: review.id,
        subjectType: 'submission',
      });
      return updated;
    });
  }

  async autoApproveSubmission(input: {
    correlationId: string;
    decisionPublicId: string;
    submissionAttemptId: string;
  }): Promise<SubmissionRecord> {
    return this.withTransaction(async (client) => {
      const reviewResult = await client.query<ReviewRow>(
        `SELECT sa.id, sa.public_id, sa.mission_assignment_id, sa.attempt_number,
                sa.status, sa.submitted_at, sa.review_deadline_at, sa.version,
                ma.application_id, ma.mission_slot_id, ma.status AS assignment_status,
                ma.version AS assignment_version, a.version AS application_version,
                a.status AS application_status, ms.status AS slot_status,
                ms.version AS slot_version,
                c.business_id, now() AS server_now
           FROM submission_attempts sa
           JOIN mission_assignments ma ON ma.id = sa.mission_assignment_id
           JOIN mission_applications a ON a.id = ma.application_id
           JOIN mission_slots ms ON ms.id = ma.mission_slot_id
           JOIN campaigns c ON c.id = ma.campaign_id
          WHERE sa.id = $1
          FOR UPDATE OF sa, ma, a, ms`,
        [input.submissionAttemptId],
      );
      const review = reviewResult.rows[0];
      if (!review) {
        throw new SubmissionError('SUBMISSION_NOT_FOUND', 404, 'Submission does not exist.');
      }
      if (review.status !== 'under_review') {
        throw new SubmissionError(
          'SUBMISSION_TRANSITION_CONFLICT',
          409,
          `Submission cannot auto-approve from ${review.status}.`,
        );
      }
      if (review.server_now < review.review_deadline_at) {
        throw new SubmissionError(
          'SUBMISSION_REVIEW_NOT_DUE',
          409,
          'Submission review deadline has not elapsed according to server time.',
        );
      }
      return this.finalizeApproval(client, {
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        decisionPublicId: input.decisionPublicId,
        review,
        status: 'auto_approved',
      });
    });
  }

  private assertRequirementContract(requirements: readonly DeliverableRequirementInput[]): void {
    const ordinals = requirements.map((requirement) => requirement.ordinal).sort((a, b) => a - b);
    const expected = Array.from({ length: requirements.length }, (_, index) => index + 1);
    const valid = requirements.length > 0 && JSON.stringify(ordinals) === JSON.stringify(expected);
    if (!valid) {
      throw new SubmissionError(
        'SUBMISSION_CONTRACT_INCOMPLETE',
        409,
        'Deliverable requirements need unique consecutive ordinals.',
      );
    }
    for (const requirement of requirements) {
      const commonValid =
        requirement.requiredCount > 0 &&
        requirement.allowedMimeTypes.length > 0 &&
        requirement.objectiveDescription.trim().length > 0;
      const durationPairValid =
        (requirement.minDurationSeconds === undefined &&
          requirement.maxDurationSeconds === undefined) ||
        (Boolean(requirement.minDurationSeconds) &&
          Boolean(requirement.maxDurationSeconds) &&
          requirement.maxDurationSeconds! >= requirement.minDurationSeconds!);
      let typeValid = true;
      if (requirement.type === 'raw_clip') {
        typeValid =
          requirement.requiredCount <= 3 &&
          requirement.minDurationSeconds === 5 &&
          requirement.maxDurationSeconds === 15 &&
          requirement.orientation === 'portrait_9_16' &&
          (requirement.minWidthPixels ?? 0) >= 1080 &&
          (requirement.minHeightPixels ?? 0) >= 1920;
      } else if (requirement.type === 'edited_video') {
        typeValid =
          requirement.minDurationSeconds === 15 &&
          requirement.maxDurationSeconds === 60 &&
          requirement.orientation === 'portrait_9_16' &&
          (requirement.minWidthPixels ?? 0) >= 1080 &&
          (requirement.minHeightPixels ?? 0) >= 1920;
      } else if (requirement.type === 'photo') {
        typeValid =
          requirement.requiredCount <= 10 &&
          requirement.minDurationSeconds === undefined &&
          requirement.maxDurationSeconds === undefined;
      } else if (requirement.type === 'private_response') {
        typeValid = requirement.requiredCount === 1;
      }
      if (!commonValid || !durationPairValid || !typeValid) {
        throw new SubmissionError(
          'SUBMISSION_CONTRACT_INCOMPLETE',
          409,
          `Deliverable requirement ${requirement.ordinal} violates the locked V1 objective ranges.`,
        );
      }
    }
  }

  private assetMetadataMatches(
    row: MediaAssetRow,
    input: {
      byteSize: number;
      checksumSha256: string;
      durationSeconds?: number;
      heightPixels: number;
      mimeType: string;
      missionAssignmentId: string;
      orientation: MediaOrientation;
      storageObjectKey: string;
      widthPixels: number;
    },
  ): boolean {
    return (
      row.mission_assignment_id === input.missionAssignmentId &&
      row.storage_object_key === input.storageObjectKey &&
      row.checksum_sha256 === input.checksumSha256 &&
      row.mime_type === input.mimeType &&
      row.byte_size === input.byteSize &&
      row.duration_seconds === (input.durationSeconds ?? null) &&
      row.width_pixels === input.widthPixels &&
      row.height_pixels === input.heightPixels &&
      row.orientation === input.orientation
    );
  }

  private async assertCompleteEvidence(
    client: PoolClient,
    input: {
      assignmentId: string;
      creatorUserId: string;
      groups: readonly SubmissionGroupInput[];
      requirements: readonly RequirementRow[];
    },
  ): Promise<void> {
    if (input.groups.length !== input.requirements.length) {
      throw new SubmissionError(
        'SUBMISSION_CONTRACT_INCOMPLETE',
        409,
        'Every locked deliverable requirement must appear exactly once.',
      );
    }
    const groupMap = new Map(input.groups.map((group) => [group.requirementId, group]));
    if (groupMap.size !== input.groups.length) {
      throw new SubmissionError(
        'SUBMISSION_CONTRACT_INCOMPLETE',
        409,
        'Deliverable requirement groups cannot be duplicated.',
      );
    }

    const allAssetIds = input.groups.flatMap((group) => [...(group.assetIds ?? [])]);
    if (new Set(allAssetIds).size !== allAssetIds.length) {
      throw new SubmissionError(
        'SUBMISSION_ASSET_INVALID',
        409,
        'One media asset cannot satisfy multiple checklist positions.',
      );
    }
    const assetsResult =
      allAssetIds.length === 0
        ? { rows: [] as MediaAssetRow[] }
        : await client.query<MediaAssetRow>(
            `SELECT id, public_id, mission_assignment_id, creator_user_id, storage_object_key,
                    checksum_sha256, mime_type, byte_size, duration_seconds,
                    width_pixels, height_pixels, orientation, status
               FROM media_assets WHERE id = ANY($1::uuid[]) FOR UPDATE`,
            [allAssetIds],
          );
    const assets = new Map(assetsResult.rows.map((asset) => [asset.id, asset]));
    if (assets.size !== allAssetIds.length) {
      throw new SubmissionError(
        'SUBMISSION_ASSET_INVALID',
        409,
        'Submission references an unknown media asset.',
      );
    }

    for (const requirement of input.requirements) {
      const group = groupMap.get(requirement.id);
      if (!group) {
        throw new SubmissionError(
          'SUBMISSION_CONTRACT_INCOMPLETE',
          409,
          `Missing deliverable requirement ${requirement.ordinal}.`,
        );
      }
      if (mediaRequirementTypes.has(requirement.type)) {
        if (
          (group.assetIds?.length ?? 0) !== requirement.required_count ||
          (group.evidenceItems?.length ?? 0) !== 0
        ) {
          throw new SubmissionError(
            'SUBMISSION_CONTRACT_INCOMPLETE',
            409,
            `Deliverable requirement ${requirement.ordinal} has the wrong media count.`,
          );
        }
        for (const assetId of group.assetIds ?? []) {
          const asset = assets.get(assetId);
          if (!asset) throw new Error('Validated asset map lost a row.');
          if (asset.status !== 'verified') {
            throw new SubmissionError(
              'SUBMISSION_ASSET_NOT_VERIFIED',
              409,
              'Pending, quarantined, or rejected media cannot complete a mission.',
            );
          }
          if (
            asset.creator_user_id !== input.creatorUserId ||
            asset.mission_assignment_id !== input.assignmentId ||
            !requirement.allowed_mime_types.includes(asset.mime_type) ||
            asset.width_pixels < requirement.min_width_pixels ||
            asset.height_pixels < requirement.min_height_pixels ||
            (requirement.orientation !== 'any' && asset.orientation !== requirement.orientation) ||
            (requirement.min_duration_seconds !== null &&
              (asset.duration_seconds === null ||
                asset.duration_seconds < requirement.min_duration_seconds)) ||
            (requirement.max_duration_seconds !== null &&
              (asset.duration_seconds === null ||
                asset.duration_seconds > requirement.max_duration_seconds))
          ) {
            throw new SubmissionError(
              'SUBMISSION_ASSET_INVALID',
              409,
              `Media does not satisfy objective requirement ${requirement.ordinal}.`,
            );
          }
        }
      } else {
        const evidence = group.evidenceItems ?? [];
        if (evidence.length !== requirement.required_count || (group.assetIds?.length ?? 0) > 0) {
          throw new SubmissionError(
            'SUBMISSION_CONTRACT_INCOMPLETE',
            409,
            `Deliverable requirement ${requirement.ordinal} has the wrong evidence count.`,
          );
        }
        for (const item of evidence) {
          await this.assertStructuredEvidence(client, input.assignmentId, requirement, item);
        }
      }
    }
  }

  private async assertStructuredEvidence(
    client: PoolClient,
    assignmentId: string,
    requirement: RequirementRow,
    evidence: SubmissionEvidenceInput,
  ): Promise<void> {
    let valid = false;
    if (requirement.type === 'social_post' && evidence.kind === 'platform_post') {
      valid =
        typeof evidence.data.platform === 'string' &&
        typeof evidence.data.providerPostId === 'string' &&
        (!requirement.requires_disclosure || evidence.data.disclosureConfirmed === true);
    } else if (requirement.type === 'private_response' && evidence.kind === 'structured_response') {
      const responses = evidence.data.responses;
      valid = Array.isArray(responses) && responses.length > 0 && responses.length <= 10;
    } else if (
      requirement.type === 'attendance_proof' &&
      evidence.kind === 'check_in_reference' &&
      typeof evidence.data.checkInEventId === 'string'
    ) {
      const checkIn = await client.query(
        `SELECT 1 FROM check_in_events
          WHERE id = $1 AND mission_assignment_id = $2`,
        [evidence.data.checkInEventId, assignmentId],
      );
      valid = checkIn.rowCount === 1;
    }
    if (!valid) {
      throw new SubmissionError(
        'SUBMISSION_ASSET_INVALID',
        409,
        `Structured evidence does not satisfy objective requirement ${requirement.ordinal}.`,
      );
    }
  }

  private async selectSubmissionForReview(
    client: PoolClient,
    submissionAttemptId: string,
    actorUserId: string,
  ): Promise<ReviewRow> {
    const result = await client.query<ReviewRow>(
      `SELECT sa.id, sa.public_id, sa.mission_assignment_id, sa.attempt_number,
              sa.status, sa.submitted_at, sa.review_deadline_at, sa.version,
              ma.application_id, ma.mission_slot_id, ma.status AS assignment_status,
              ma.version AS assignment_version, a.version AS application_version,
              a.status AS application_status, ms.status AS slot_status,
              ms.version AS slot_version,
              c.business_id, now() AS server_now
         FROM submission_attempts sa
         JOIN mission_assignments ma ON ma.id = sa.mission_assignment_id
         JOIN mission_applications a ON a.id = ma.application_id
         JOIN mission_slots ms ON ms.id = ma.mission_slot_id
         JOIN campaigns c ON c.id = ma.campaign_id
        WHERE sa.id = $1
          AND EXISTS (
            SELECT 1 FROM business_memberships m
             WHERE m.business_id = c.business_id AND m.user_id = $2
               AND m.status = 'active' AND m.role IN ('owner', 'manager')
          )
        FOR UPDATE OF sa, ma, a, ms`,
      [submissionAttemptId, actorUserId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new SubmissionError(
        'SUBMISSION_ACCESS_DENIED',
        403,
        'Submission is unavailable in the active business workspace.',
      );
    }
    return row;
  }

  private async updateSubmissionStatus(
    client: PoolClient,
    current: SubmissionRow,
    status: SubmissionStatus,
  ): Promise<SubmissionRecord> {
    const result = await client.query<SubmissionRow>(
      `UPDATE submission_attempts
          SET status = $2, version = version + 1, updated_at = now()
        WHERE id = $1 AND version = $3
        RETURNING id, public_id, mission_assignment_id, attempt_number, status,
                  submitted_at, review_deadline_at, version`,
      [current.id, status, current.version],
    );
    const row = result.rows[0];
    if (!row) {
      throw new SubmissionError(
        'SUBMISSION_TRANSITION_CONFLICT',
        409,
        'Submission changed before the transition could commit.',
      );
    }
    return toSubmissionRecord(row);
  }

  private async finalizeApproval(
    client: PoolClient,
    input: {
      actorId: string | null;
      actorType: 'user' | 'service';
      correlationId: string;
      decisionPublicId: string;
      review: ReviewRow;
      status: 'approved' | 'auto_approved';
    },
  ): Promise<SubmissionRecord> {
    if (
      input.review.assignment_status !== 'checked_in' ||
      input.review.application_status !== 'accepted' ||
      input.review.slot_status !== 'accepted'
    ) {
      throw new SubmissionError(
        'SUBMISSION_TRANSITION_CONFLICT',
        409,
        'Mission application, assignment, and slot are not jointly eligible for completion.',
      );
    }
    const updated = await this.updateSubmissionStatus(client, input.review, input.status);
    await client.query(
      `INSERT INTO submission_review_decisions (
         public_id, submission_attempt_id, decision, actor_id, actor_type
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        input.decisionPublicId,
        input.review.id,
        input.status === 'approved' ? 'approved' : 'auto_approved',
        input.actorId,
        input.actorType,
      ],
    );
    await this.appendSubmissionHistory(client, {
      actorId: input.actorId,
      actorType: input.actorType,
      fromStatus: input.review.status,
      reason: input.status === 'approved' ? 'Business approved' : '48-hour deadline elapsed',
      submission: updated,
    });

    const assignmentUpdate = await client.query(
      `UPDATE mission_assignments
          SET status = 'completed', version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'checked_in' AND version = $2`,
      [input.review.mission_assignment_id, input.review.assignment_version],
    );
    if (assignmentUpdate.rowCount !== 1) {
      throw new SubmissionError(
        'SUBMISSION_TRANSITION_CONFLICT',
        409,
        'Mission assignment changed before completion could commit.',
      );
    }
    await client.query(
      `INSERT INTO mission_assignment_status_history (
         mission_assignment_id, from_status, to_status, assignment_version,
         actor_id, actor_type, reason
       ) VALUES ($1, 'checked_in', 'completed', $2, $3, $4, $5)`,
      [
        input.review.mission_assignment_id,
        input.review.assignment_version + 1,
        input.actorId,
        input.actorType,
        input.status === 'approved' ? 'Submission approved' : 'Submission auto-approved',
      ],
    );
    const applicationUpdate = await client.query(
      `UPDATE mission_applications
          SET status = 'completed', version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'accepted' AND version = $2`,
      [input.review.application_id, input.review.application_version],
    );
    if (applicationUpdate.rowCount !== 1) {
      throw new SubmissionError(
        'SUBMISSION_TRANSITION_CONFLICT',
        409,
        'Mission application changed before completion could commit.',
      );
    }
    await client.query(
      `INSERT INTO mission_application_status_history (
         application_id, from_status, to_status, application_version,
         actor_id, actor_type, reason
       ) VALUES ($1, 'accepted', 'completed', $2, $3, $4, $5)`,
      [
        input.review.application_id,
        input.review.application_version + 1,
        input.actorId,
        input.actorType,
        input.status === 'approved' ? 'Submission approved' : 'Submission auto-approved',
      ],
    );
    const slotUpdate = await client.query(
      `UPDATE mission_slots
          SET status = 'completed', version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'accepted' AND version = $2`,
      [input.review.mission_slot_id, input.review.slot_version],
    );
    if (slotUpdate.rowCount !== 1) {
      throw new SubmissionError(
        'SUBMISSION_TRANSITION_CONFLICT',
        409,
        'Mission slot changed before completion could commit.',
      );
    }
    await this.appendAudit(client, {
      action: input.status === 'approved' ? 'submission.approved' : 'submission.auto-approved',
      actorId: input.actorId,
      actorType: input.actorType,
      correlationId: input.correlationId,
      details: { attemptNumber: input.review.attempt_number },
      subjectId: input.review.id,
      subjectType: 'submission',
    });
    return updated;
  }

  private async appendSubmissionHistory(
    client: PoolClient,
    input: {
      actorId: string | null;
      actorType: 'user' | 'service';
      fromStatus: SubmissionStatus;
      reason: string;
      submission: SubmissionRecord;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO submission_status_history (
         submission_attempt_id, from_status, to_status, submission_version,
         actor_id, actor_type, reason
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.submission.id,
        input.fromStatus,
        input.submission.status,
        input.submission.version,
        input.actorId,
        input.actorType,
        input.reason,
      ],
    );
  }

  private async appendAudit(
    client: PoolClient,
    input: {
      action: string;
      actorId: string | null;
      actorType: 'user' | 'service';
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
