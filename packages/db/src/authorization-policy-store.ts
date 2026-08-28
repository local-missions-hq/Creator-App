import type { Pool, PoolClient } from 'pg';

export class AuthorizationPolicyError extends Error {
  constructor(
    readonly code:
      | 'AUTHENTICATION_REQUIRED'
      | 'AUTHORIZATION_NOT_FOUND'
      | 'ADMIN_OVERRIDE_INVALID'
      | 'FINANCIAL_ACCESS_DENIED',
    readonly httpStatus: 401 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}

export type CreatorApplicationProjection = {
  campaignPublicId: string;
  publicId: string;
  status: string;
  version: number;
};

export type CreatorSubmissionProjection = {
  applicationPublicId: string;
  publicId: string;
  status: string;
  submittedAt: Date;
  version: number;
};

export type BusinessCampaignProjection = {
  businessPublicId: string;
  publicId: string;
  status: string;
  title: string;
  version: number;
};

export type VenueStaffAssignmentProjection = {
  city: string;
  locationName: string;
  publicId: string;
  region: string;
  windowEndsAt: Date;
  windowStartsAt: Date;
};

export type SupportDisputeProjection = {
  openedAt: Date;
  publicId: string;
  reasonCode: string;
  status: string;
};

type ActiveActor = { id: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireActorId(actorUserId: string | null): string {
  if (!actorUserId || !uuidPattern.test(actorUserId)) {
    throw new AuthorizationPolicyError(
      'AUTHENTICATION_REQUIRED',
      401,
      'Authentication is required.',
    );
  }
  return actorUserId;
}

function notFound(): AuthorizationPolicyError {
  return new AuthorizationPolicyError(
    'AUTHORIZATION_NOT_FOUND',
    404,
    'The requested resource was not found.',
  );
}

export class AuthorizationPolicyStore {
  constructor(private readonly pool: Pool) {}

  async readCreatorApplication(input: {
    actorUserId: string | null;
    applicationPublicId: string;
  }): Promise<CreatorApplicationProjection> {
    const actorUserId = requireActorId(input.actorUserId);
    const result = await this.pool.query<{
      campaign_public_id: string;
      public_id: string;
      status: string;
      version: number;
    }>(
      `SELECT application.public_id, application.status, application.version,
              campaign.public_id AS campaign_public_id
         FROM mission_applications application
         JOIN campaigns campaign ON campaign.id = application.campaign_id
         JOIN users actor ON actor.id = application.creator_user_id
        WHERE actor.id = $1 AND actor.status = 'active' AND application.public_id = $2`,
      [actorUserId, input.applicationPublicId],
    );
    const row = result.rows[0];
    if (!row) throw notFound();
    return {
      campaignPublicId: row.campaign_public_id,
      publicId: row.public_id,
      status: row.status,
      version: row.version,
    };
  }

  async readCreatorSubmission(input: {
    actorUserId: string | null;
    submissionPublicId: string;
  }): Promise<CreatorSubmissionProjection> {
    const actorUserId = requireActorId(input.actorUserId);
    const result = await this.pool.query<{
      application_public_id: string;
      public_id: string;
      status: string;
      submitted_at: Date;
      version: number;
    }>(
      `SELECT submission.public_id, submission.status, submission.submitted_at,
              submission.version, application.public_id AS application_public_id
         FROM submission_attempts submission
         JOIN mission_assignments assignment ON assignment.id = submission.mission_assignment_id
         JOIN mission_applications application ON application.id = assignment.application_id
         JOIN users actor ON actor.id = assignment.creator_user_id
        WHERE actor.id = $1 AND actor.status = 'active' AND submission.public_id = $2`,
      [actorUserId, input.submissionPublicId],
    );
    const row = result.rows[0];
    if (!row) throw notFound();
    return {
      applicationPublicId: row.application_public_id,
      publicId: row.public_id,
      status: row.status,
      submittedAt: row.submitted_at,
      version: row.version,
    };
  }

  async readBusinessCampaign(input: {
    actorUserId: string | null;
    campaignPublicId: string;
  }): Promise<BusinessCampaignProjection> {
    const actorUserId = requireActorId(input.actorUserId);
    const result = await this.pool.query<{
      business_public_id: string;
      public_id: string;
      status: string;
      title: string;
      version: number;
    }>(
      `SELECT campaign.public_id, campaign.status, campaign.title, campaign.version,
              business.public_id AS business_public_id
         FROM campaigns campaign
         JOIN businesses business ON business.id = campaign.business_id
         JOIN business_memberships membership ON membership.business_id = business.id
         JOIN users actor ON actor.id = membership.user_id
        WHERE actor.id = $1 AND actor.status = 'active'
          AND membership.status = 'active' AND membership.role IN ('owner','manager')
          AND campaign.public_id = $2`,
      [actorUserId, input.campaignPublicId],
    );
    const row = result.rows[0];
    if (!row) throw notFound();
    return {
      businessPublicId: row.business_public_id,
      publicId: row.public_id,
      status: row.status,
      title: row.title,
      version: row.version,
    };
  }

  async readVenueStaffAssignment(input: {
    actorUserId: string | null;
    assignmentPublicId: string;
    now: Date;
  }): Promise<VenueStaffAssignmentProjection> {
    const actorUserId = requireActorId(input.actorUserId);
    const result = await this.pool.query<{
      city: string;
      location_name: string;
      public_id: string;
      region: string;
      window_ends_at: Date;
      window_starts_at: Date;
    }>(
      `SELECT assignment.public_id, assignment.window_starts_at, assignment.window_ends_at,
              location.name AS location_name, location.city, location.region
         FROM venue_staff_assignments assignment
         JOIN business_memberships membership
           ON membership.id = assignment.business_membership_id
         JOIN users actor ON actor.id = membership.user_id
         JOIN business_locations location ON location.id = assignment.business_location_id
        WHERE actor.id = $1 AND actor.status = 'active'
          AND membership.status = 'active' AND membership.role = 'venue_staff'
          AND assignment.status = 'active' AND assignment.public_id = $2
          AND $3::timestamptz BETWEEN assignment.window_starts_at AND assignment.window_ends_at`,
      [actorUserId, input.assignmentPublicId, input.now],
    );
    const row = result.rows[0];
    if (!row) throw notFound();
    return {
      city: row.city,
      locationName: row.location_name,
      publicId: row.public_id,
      region: row.region,
      windowEndsAt: row.window_ends_at,
      windowStartsAt: row.window_starts_at,
    };
  }

  async readSupportDispute(input: {
    actorUserId: string | null;
    disputePublicId: string;
  }): Promise<SupportDisputeProjection> {
    const actorUserId = requireActorId(input.actorUserId);
    const result = await this.pool.query<{
      opened_at: Date;
      public_id: string;
      reason_code: string;
      status: string;
    }>(
      `SELECT dispute.public_id, dispute.status, dispute.reason_code, dispute.opened_at
         FROM submission_disputes dispute
         JOIN platform_staff_memberships staff
           ON staff.user_id = $1 AND staff.status = 'active' AND staff.role = 'support_agent'
         JOIN users actor ON actor.id = staff.user_id AND actor.status = 'active'
        WHERE dispute.public_id = $2`,
      [actorUserId, input.disputePublicId],
    );
    const row = result.rows[0];
    if (!row) throw notFound();
    return {
      openedAt: row.opened_at,
      publicId: row.public_id,
      reasonCode: row.reason_code,
      status: row.status,
    };
  }

  async authorizeFinancialStateMutation(actorUserId: string | null): Promise<void> {
    const requiredActorId = requireActorId(actorUserId);
    const result = await this.pool.query<ActiveActor>(
      `SELECT actor.id
         FROM users actor
         JOIN platform_staff_memberships staff ON staff.user_id = actor.id
        WHERE actor.id = $1 AND actor.status = 'active'
          AND staff.status = 'active' AND staff.role = 'finance_operator'`,
      [requiredActorId],
    );
    if (!result.rows[0]) {
      throw new AuthorizationPolicyError(
        'FINANCIAL_ACCESS_DENIED',
        403,
        'A separately authorized Finance Operator is required.',
      );
    }
  }

  async recordAdminOverride(input: {
    actorUserId: string | null;
    correlationId: string;
    reason: string;
    subjectId: string;
    subjectType: string;
  }): Promise<void> {
    const actorUserId = requireActorId(input.actorUserId);
    const reason = input.reason.trim();
    if (
      !uuidPattern.test(input.correlationId) ||
      !uuidPattern.test(input.subjectId) ||
      !/^[a-z][a-z0-9-]{1,79}$/.test(input.subjectType) ||
      reason.length < 20 ||
      reason.length > 500
    ) {
      throw new AuthorizationPolicyError(
        'ADMIN_OVERRIDE_INVALID',
        409,
        'An admin override requires a bounded reason and valid subject.',
      );
    }
    await this.withTransaction(async (client) => {
      const administrator = await client.query<ActiveActor>(
        `SELECT actor.id
           FROM users actor
           JOIN platform_staff_memberships staff ON staff.user_id = actor.id
          WHERE actor.id = $1 AND actor.status = 'active'
            AND staff.status = 'active' AND staff.role = 'admin'
          FOR SHARE`,
        [actorUserId],
      );
      if (!administrator.rows[0]) {
        throw new AuthorizationPolicyError(
          'AUTHORIZATION_NOT_FOUND',
          404,
          'The requested resource was not found.',
        );
      }
      await client.query(
        `INSERT INTO audit_events (
           actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
         ) VALUES ($1,'user','authorization.admin-override',$2,$3,$4,$5::jsonb)`,
        [
          actorUserId,
          input.correlationId,
          input.subjectType,
          input.subjectId,
          JSON.stringify({ priority: 'high', reason }),
        ],
      );
    });
  }

  private async withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
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
