import type {
  MissionApplicationConflictCode,
  MissionApplicationRecord,
  MissionApplicationStatus,
  MissionSlotType,
  MissionTemplateCode,
  ReachLevel,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type CampaignSlotInput = {
  baseRewardMinor: number;
  bonusRewardMinor: number;
  currency: string;
  ordinal: number;
  publicId: string;
  reachLevel?: ReachLevel;
  type: MissionSlotType;
};

export class MissionApplicationError extends Error {
  constructor(
    readonly code: MissionApplicationConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'MissionApplicationError';
  }
}

type ApplicationRow = QueryResultRow & {
  campaign_id: string;
  creator_user_id: string;
  id: string;
  public_id: string;
  reserved_slot_id: string;
  slot_type: MissionSlotType;
  status: MissionApplicationStatus;
  version: number;
};

function toApplicationRecord(row: ApplicationRow): MissionApplicationRecord {
  return {
    campaignId: row.campaign_id,
    creatorUserId: row.creator_user_id,
    id: row.id,
    publicId: row.public_id,
    reservedSlotId: row.reserved_slot_id,
    slotType: row.slot_type,
    status: row.status,
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

export class MissionApplicationStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async configureCampaignContract(input: {
    actorUserId: string;
    campaignId: string;
    checklist: Record<string, unknown>;
    correlationId: string;
    missionTemplateCode: MissionTemplateCode;
    missionTemplateVersion: number;
    plainLanguageBrief: string;
    slots: readonly CampaignSlotInput[];
  }): Promise<{ briefVersion: number; communitySlots: number; totalSlots: number }> {
    return this.withTransaction(async (client) => {
      const campaignResult = await client.query<{
        creator_reward_pool_minor: number;
        currency: string;
        slot_count: number;
        status: string;
      }>(
        `SELECT creator_reward_pool_minor, currency, slot_count, status
           FROM campaigns c
          WHERE c.id = $1
            AND EXISTS (
              SELECT 1 FROM business_memberships m
               WHERE m.business_id = c.business_id
                 AND m.user_id = $2
                 AND m.status = 'active'
                 AND m.role IN ('owner', 'manager')
            )
          FOR UPDATE OF c`,
        [input.campaignId, input.actorUserId],
      );
      const campaign = campaignResult.rows[0];
      if (!campaign) {
        throw new MissionApplicationError(
          'APPLICATION_ACCESS_DENIED',
          403,
          'Campaign contract is unavailable in the active business workspace.',
        );
      }
      if (campaign.status !== 'draft') {
        throw new MissionApplicationError(
          'CAMPAIGN_NOT_AVAILABLE',
          409,
          'Only a draft campaign can receive its initial mission contract.',
        );
      }

      const existing = await client.query(
        `SELECT 1 FROM campaign_brief_versions WHERE campaign_id = $1
         UNION ALL
         SELECT 1 FROM mission_slots WHERE campaign_id = $1
         LIMIT 1`,
        [input.campaignId],
      );
      if (existing.rowCount) {
        throw new MissionApplicationError(
          'CAMPAIGN_CONTRACT_INCOMPLETE',
          409,
          'This campaign already has an initial brief or slot allocation.',
        );
      }

      const templateResult = await client.query<{ id: string }>(
        `SELECT id FROM mission_templates
          WHERE code = $1 AND version = $2 AND status = 'active'`,
        [input.missionTemplateCode, input.missionTemplateVersion],
      );
      const template = templateResult.rows[0];
      if (!template) {
        throw new MissionApplicationError(
          'CAMPAIGN_CONTRACT_INCOMPLETE',
          409,
          'The requested active mission template version does not exist.',
        );
      }

      this.assertSlotContract(input.slots, campaign);
      await client.query(
        `INSERT INTO campaign_brief_versions (
           campaign_id, version, mission_template_id, plain_language_brief, checklist, created_by
         ) VALUES ($1, 1, $2, $3, $4::jsonb, $5)`,
        [
          input.campaignId,
          template.id,
          input.plainLanguageBrief,
          JSON.stringify(input.checklist),
          input.actorUserId,
        ],
      );

      for (const slot of input.slots) {
        await client.query(
          `INSERT INTO mission_slots (
             public_id, campaign_id, ordinal, type, base_reward_minor, bonus_reward_minor,
             reward_minor, reach_level, currency
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            slot.publicId,
            input.campaignId,
            slot.ordinal,
            slot.type,
            slot.baseRewardMinor,
            slot.bonusRewardMinor,
            slot.baseRewardMinor + slot.bonusRewardMinor,
            slot.reachLevel ?? null,
            slot.currency,
          ],
        );
      }

      const communitySlots = input.slots.filter((slot) => slot.type === 'community').length;
      await this.appendAudit(client, {
        action: 'campaign.contract-configured',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: {
          briefVersion: 1,
          communitySlots,
          missionTemplateCode: input.missionTemplateCode,
          totalSlots: input.slots.length,
        },
        subjectId: input.campaignId,
        subjectType: 'campaign',
      });
      return { briefVersion: 1, communitySlots, totalSlots: input.slots.length };
    });
  }

  async applyForCommunityMission(input: {
    campaignId: string;
    correlationId: string;
    creatorUserId: string;
    publicId: string;
  }): Promise<MissionApplicationRecord> {
    try {
      return await this.withTransaction(async (client) => {
        const eligible = await client.query(
          `SELECT 1
             FROM creator_profiles
            WHERE user_id = $1
              AND status = 'approved'
              AND locality_status = 'verified'
              AND locality_expires_at > now()`,
          [input.creatorUserId],
        );
        if (eligible.rowCount !== 1) {
          throw new MissionApplicationError(
            'CREATOR_NOT_QUALIFIED',
            403,
            'Creator must be approved with a current verified locality credential.',
          );
        }

        const campaign = await client.query(
          `SELECT 1 FROM campaigns WHERE id = $1 AND status = 'published'`,
          [input.campaignId],
        );
        if (campaign.rowCount !== 1) {
          throw new MissionApplicationError(
            'CAMPAIGN_NOT_AVAILABLE',
            409,
            'Campaign is not currently published for creator applications.',
          );
        }

        const slotResult = await client.query<{ id: string; type: MissionSlotType }>(
          `SELECT id, type
             FROM mission_slots
            WHERE campaign_id = $1 AND type = 'community' AND status = 'available'
            ORDER BY ordinal
            FOR UPDATE SKIP LOCKED
            LIMIT 1`,
          [input.campaignId],
        );
        const slot = slotResult.rows[0];
        if (!slot) {
          throw new MissionApplicationError(
            'MISSION_CAPACITY_FULL',
            409,
            'No Community Slot remains available for this campaign.',
          );
        }

        const applicationResult = await client.query<{
          campaign_id: string;
          creator_user_id: string;
          id: string;
          public_id: string;
          status: MissionApplicationStatus;
          version: number;
        }>(
          `INSERT INTO mission_applications (public_id, campaign_id, creator_user_id)
           VALUES ($1, $2, $3)
           RETURNING id, public_id, campaign_id, creator_user_id, status, version`,
          [input.publicId, input.campaignId, input.creatorUserId],
        );
        const application = applicationResult.rows[0];
        if (!application) throw new Error('Mission application insert returned no row.');

        await client.query(
          `UPDATE mission_slots
              SET status = 'reserved', version = version + 1, updated_at = now()
            WHERE id = $1 AND status = 'available'`,
          [slot.id],
        );
        await client.query(
          `INSERT INTO slot_reservations (mission_slot_id, application_id)
           VALUES ($1, $2)`,
          [slot.id, application.id],
        );
        await client.query(
          `INSERT INTO mission_application_status_history (
             application_id, from_status, to_status, application_version, actor_id, reason
           ) VALUES ($1, NULL, 'submitted', 1, $2, 'Creator reserved a Community Slot')`,
          [application.id, input.creatorUserId],
        );
        await this.appendAudit(client, {
          action: 'mission-application.submitted',
          actorId: input.creatorUserId,
          correlationId: input.correlationId,
          details: { slotType: slot.type },
          subjectId: application.id,
          subjectType: 'mission-application',
        });

        return toApplicationRecord({
          ...application,
          reserved_slot_id: slot.id,
          slot_type: slot.type,
        });
      });
    } catch (error) {
      if (postgresConstraint(error) === 'mission_applications_campaign_creator_uq') {
        throw new MissionApplicationError(
          'APPLICATION_ALREADY_EXISTS',
          409,
          'A creator can apply only once to a campaign.',
        );
      }
      throw error;
    }
  }

  async acceptApplication(input: {
    actorUserId: string;
    applicationId: string;
    correlationId: string;
  }): Promise<MissionApplicationRecord> {
    return this.withTransaction(async (client) => {
      const current = await this.selectApplicationForBusiness(
        client,
        input.applicationId,
        input.actorUserId,
      );
      if (current.status !== 'submitted') {
        throw new MissionApplicationError(
          'APPLICATION_TRANSITION_CONFLICT',
          409,
          `Application cannot transition from ${current.status} to accepted.`,
        );
      }

      const updated = await this.updateApplicationStatus(client, current, 'accepted');
      await client.query(
        `UPDATE slot_reservations SET status = 'converted'
          WHERE application_id = $1 AND status = 'active'`,
        [current.id],
      );
      await client.query(
        `UPDATE mission_slots SET status = 'accepted', version = version + 1, updated_at = now()
          WHERE id = $1 AND status = 'reserved'`,
        [current.reserved_slot_id],
      );
      await this.appendApplicationHistory(
        client,
        current,
        updated,
        input.actorUserId,
        'Business accepted objective assignment',
      );
      await this.appendAudit(client, {
        action: 'mission-application.accepted',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { slotType: updated.slotType },
        subjectId: updated.id,
        subjectType: 'mission-application',
      });
      return updated;
    });
  }

  async withdrawApplication(input: {
    applicationId: string;
    correlationId: string;
    creatorUserId: string;
  }): Promise<MissionApplicationRecord> {
    return this.withTransaction(async (client) => {
      const current = await this.selectApplicationForCreator(
        client,
        input.applicationId,
        input.creatorUserId,
      );
      if (current.status !== 'submitted') {
        throw new MissionApplicationError(
          'APPLICATION_TRANSITION_CONFLICT',
          409,
          `Application cannot transition from ${current.status} to withdrawn.`,
        );
      }

      const updated = await this.updateApplicationStatus(client, current, 'withdrawn');
      await client.query(
        `UPDATE slot_reservations SET status = 'released', released_at = now()
          WHERE application_id = $1 AND status = 'active'`,
        [current.id],
      );
      await client.query(
        `UPDATE mission_slots SET status = 'available', version = version + 1, updated_at = now()
          WHERE id = $1 AND status = 'reserved'`,
        [current.reserved_slot_id],
      );
      await this.appendApplicationHistory(
        client,
        current,
        updated,
        input.creatorUserId,
        'Creator withdrew before acceptance',
      );
      await this.appendAudit(client, {
        action: 'mission-application.withdrawn',
        actorId: input.creatorUserId,
        correlationId: input.correlationId,
        details: { slotReleased: true },
        subjectId: updated.id,
        subjectType: 'mission-application',
      });
      return updated;
    });
  }

  private assertSlotContract(
    slots: readonly CampaignSlotInput[],
    campaign: { creator_reward_pool_minor: number; currency: string; slot_count: number },
  ): void {
    const ordinals = slots.map((slot) => slot.ordinal).sort((a, b) => a - b);
    const expectedOrdinals = Array.from({ length: campaign.slot_count }, (_, index) => index + 1);
    const rewardTotal = slots.reduce(
      (total, slot) => total + slot.baseRewardMinor + slot.bonusRewardMinor,
      0,
    );
    const communitySlots = slots.filter((slot) => slot.type === 'community').length;
    const minimumCommunitySlots = Math.ceil(campaign.slot_count * 0.8);
    const validReachConfiguration = slots.every(
      (slot) =>
        (slot.type === 'community' && !slot.reachLevel && slot.bonusRewardMinor === 0) ||
        (slot.type === 'reach' && Boolean(slot.reachLevel) && slot.bonusRewardMinor > 0),
    );

    if (
      slots.length !== campaign.slot_count ||
      JSON.stringify(ordinals) !== JSON.stringify(expectedOrdinals) ||
      rewardTotal !== campaign.creator_reward_pool_minor ||
      communitySlots < minimumCommunitySlots ||
      slots.some((slot) => slot.currency !== campaign.currency) ||
      !validReachConfiguration
    ) {
      throw new MissionApplicationError(
        'CAMPAIGN_CONTRACT_INCOMPLETE',
        409,
        'Mission slots must exactly match campaign capacity, reward pool, currency, ordinals, and the 80% Community minimum.',
      );
    }
  }

  private async selectApplicationForBusiness(
    client: PoolClient,
    applicationId: string,
    actorUserId: string,
  ): Promise<ApplicationRow> {
    const result = await client.query<ApplicationRow>(
      `SELECT a.id, a.public_id, a.campaign_id, a.creator_user_id, a.status, a.version,
              r.mission_slot_id AS reserved_slot_id, s.type AS slot_type
         FROM mission_applications a
         JOIN campaigns c ON c.id = a.campaign_id
         JOIN slot_reservations r ON r.application_id = a.id
         JOIN mission_slots s ON s.id = r.mission_slot_id
        WHERE a.id = $1
          AND EXISTS (
            SELECT 1 FROM business_memberships m
             WHERE m.business_id = c.business_id AND m.user_id = $2
               AND m.status = 'active' AND m.role IN ('owner', 'manager')
          )
        FOR UPDATE OF a, r, s`,
      [applicationId, actorUserId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new MissionApplicationError(
        'APPLICATION_ACCESS_DENIED',
        403,
        'Application is unavailable in the active business workspace.',
      );
    }
    return row;
  }

  private async selectApplicationForCreator(
    client: PoolClient,
    applicationId: string,
    creatorUserId: string,
  ): Promise<ApplicationRow> {
    const result = await client.query<ApplicationRow>(
      `SELECT a.id, a.public_id, a.campaign_id, a.creator_user_id, a.status, a.version,
              r.mission_slot_id AS reserved_slot_id, s.type AS slot_type
         FROM mission_applications a
         JOIN slot_reservations r ON r.application_id = a.id
         JOIN mission_slots s ON s.id = r.mission_slot_id
        WHERE a.id = $1 AND a.creator_user_id = $2
        FOR UPDATE OF a, r, s`,
      [applicationId, creatorUserId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new MissionApplicationError(
        'APPLICATION_ACCESS_DENIED',
        403,
        'Application is unavailable to this creator.',
      );
    }
    return row;
  }

  private async updateApplicationStatus(
    client: PoolClient,
    current: ApplicationRow,
    status: MissionApplicationStatus,
  ): Promise<MissionApplicationRecord> {
    const result = await client.query<ApplicationRow>(
      `UPDATE mission_applications
          SET status = $2, version = version + 1, updated_at = now()
        WHERE id = $1 AND version = $3
        RETURNING id, public_id, campaign_id, creator_user_id, status, version,
                  $4::uuid AS reserved_slot_id, $5::mission_slot_type AS slot_type`,
      [current.id, status, current.version, current.reserved_slot_id, current.slot_type],
    );
    const row = result.rows[0];
    if (!row) {
      throw new MissionApplicationError(
        'APPLICATION_TRANSITION_CONFLICT',
        409,
        'Application changed before the transition could be committed.',
      );
    }
    return toApplicationRecord(row);
  }

  private async appendApplicationHistory(
    client: PoolClient,
    current: ApplicationRow,
    updated: MissionApplicationRecord,
    actorId: string,
    reason: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO mission_application_status_history (
         application_id, from_status, to_status, application_version, actor_id, reason
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [updated.id, current.status, updated.status, updated.version, actorId, reason],
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
      subjectType: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_events (
         actor_id, actor_type, action, correlation_id, subject_type, subject_id, details
       ) VALUES ($1, 'user', $2, $3, $4, $5, $6::jsonb)`,
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
