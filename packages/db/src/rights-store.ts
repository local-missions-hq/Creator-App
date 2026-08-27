import { randomUUID } from 'node:crypto';

import type {
  ContentLicenseChannel,
  ContentLicenseKind,
  ContentLicenseStatus,
  LegalDocumentType,
  RightsConflictCode,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

const permittedEdits = ['crop', 'resize', 'caption', 'logo_placement', 'minor_formatting'] as const;

export type LegalDocumentRecord = {
  bodySha256: string;
  effectiveAt: Date;
  id: string;
  publicId: string;
  title: string;
  type: LegalDocumentType;
  version: number;
};

export type MissionRightsOfferRecord = {
  baseRewardMinorSnapshot: number;
  campaignBriefVersionId: string;
  currency: string;
  extendedOwnedMediaBonusMinor: number;
  extendedOwnedMediaSelected: boolean;
  id: string;
  missionSlotId: string;
  paidAdvertisingBonusMinor: number;
  paidAdvertisingSelected: boolean;
  publicDisclosureRequired: boolean;
  publicId: string;
  rightsVersion: number;
  totalRightsBonusMinor: number;
};

export type MissionContractAcceptanceRecord = {
  acceptedAt: Date;
  campaignBriefVersionId: string;
  creatorUserId: string;
  id: string;
  missionAssignmentId: string;
  missionRightsOfferId: string;
  publicId: string;
};

export type ContentLicenseRecord = {
  activatedAt: Date;
  baseRewardMinorSnapshot: number;
  compensationComponentMinor: number;
  currency: string;
  expiresAt: Date;
  id: string;
  kind: ContentLicenseKind;
  missionAssignmentId: string;
  publicId: string;
  status: ContentLicenseStatus;
  version: number;
};

export type BusinessContentLicenseView = ContentLicenseRecord & {
  assetPublicIds: string[];
  channels: ContentLicenseChannel[];
  isCurrentlyUsable: boolean;
};

export class RightsError extends Error {
  constructor(
    readonly code: RightsConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'RightsError';
  }
}

type LegalDocumentRow = QueryResultRow & {
  body_sha256: string;
  effective_at: Date;
  id: string;
  public_id: string;
  title: string;
  type: LegalDocumentType;
  version: number;
};

type RightsOfferRow = QueryResultRow & {
  base_reward_minor_snapshot: number;
  campaign_brief_version_id: string;
  currency: string;
  extended_owned_media_bonus_minor: number;
  extended_owned_media_selected: boolean;
  id: string;
  mission_slot_id: string;
  paid_advertising_bonus_minor: number;
  paid_advertising_selected: boolean;
  public_disclosure_required: boolean;
  public_id: string;
  rights_version: number;
  total_rights_bonus_minor: number;
};

type AcceptanceRow = QueryResultRow & {
  accepted_at: Date;
  campaign_brief_version_id: string;
  creator_user_id: string;
  id: string;
  mission_assignment_id: string;
  mission_rights_offer_id: string;
  public_id: string;
};

type LicenseRow = QueryResultRow & {
  activated_at: Date;
  base_reward_minor_snapshot: number;
  compensation_component_minor: number;
  currency: string;
  expires_at: Date;
  id: string;
  kind: ContentLicenseKind;
  mission_assignment_id: string;
  public_id: string;
  status: ContentLicenseStatus;
  version: number;
};

function quoteSchema(schemaName: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Database schema name must be a safe lowercase PostgreSQL identifier.');
  }
  return `"${schemaName}"`;
}

function postgresConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('constraint' in error)) return undefined;
  return typeof error.constraint === 'string' ? error.constraint : undefined;
}

function roundedPercent(amountMinor: number, percentage: number): number {
  return Math.floor((amountMinor * percentage + 50) / 100);
}

function toLegalDocument(row: LegalDocumentRow): LegalDocumentRecord {
  return {
    bodySha256: row.body_sha256,
    effectiveAt: row.effective_at,
    id: row.id,
    publicId: row.public_id,
    title: row.title,
    type: row.type,
    version: row.version,
  };
}

function toRightsOffer(row: RightsOfferRow): MissionRightsOfferRecord {
  return {
    baseRewardMinorSnapshot: row.base_reward_minor_snapshot,
    campaignBriefVersionId: row.campaign_brief_version_id,
    currency: row.currency,
    extendedOwnedMediaBonusMinor: row.extended_owned_media_bonus_minor,
    extendedOwnedMediaSelected: row.extended_owned_media_selected,
    id: row.id,
    missionSlotId: row.mission_slot_id,
    paidAdvertisingBonusMinor: row.paid_advertising_bonus_minor,
    paidAdvertisingSelected: row.paid_advertising_selected,
    publicDisclosureRequired: row.public_disclosure_required,
    publicId: row.public_id,
    rightsVersion: row.rights_version,
    totalRightsBonusMinor: row.total_rights_bonus_minor,
  };
}

function toAcceptance(row: AcceptanceRow): MissionContractAcceptanceRecord {
  return {
    acceptedAt: row.accepted_at,
    campaignBriefVersionId: row.campaign_brief_version_id,
    creatorUserId: row.creator_user_id,
    id: row.id,
    missionAssignmentId: row.mission_assignment_id,
    missionRightsOfferId: row.mission_rights_offer_id,
    publicId: row.public_id,
  };
}

function toLicense(row: LicenseRow): ContentLicenseRecord {
  return {
    activatedAt: row.activated_at,
    baseRewardMinorSnapshot: row.base_reward_minor_snapshot,
    compensationComponentMinor: row.compensation_component_minor,
    currency: row.currency,
    expiresAt: row.expires_at,
    id: row.id,
    kind: row.kind,
    missionAssignmentId: row.mission_assignment_id,
    publicId: row.public_id,
    status: row.status,
    version: row.version,
  };
}

export class RightsStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async publishLegalDocumentVersion(input: {
    actorUserId: string;
    bodySha256: string;
    correlationId: string;
    effectiveAt: Date;
    publicId: string;
    title: string;
    type: LegalDocumentType;
    version: number;
  }): Promise<LegalDocumentRecord> {
    if (
      !/^[a-f0-9]{64}$/.test(input.bodySha256) ||
      !Number.isInteger(input.version) ||
      input.version < 1 ||
      !input.title.trim()
    ) {
      throw new RightsError(
        'RIGHTS_DOCUMENT_INVALID',
        409,
        'Legal document versions require a title, positive version, and SHA-256 body hash.',
      );
    }
    try {
      return await this.withTransaction(async (client) => {
        const administrator = await client.query(
          `SELECT 1 FROM platform_staff_memberships
            WHERE user_id = $1 AND role = 'admin' AND status = 'active'`,
          [input.actorUserId],
        );
        if (administrator.rowCount !== 1) {
          throw new RightsError(
            'RIGHTS_ACCESS_DENIED',
            403,
            'Only an active platform administrator can publish legal document versions.',
          );
        }
        const result = await client.query<LegalDocumentRow>(
          `INSERT INTO legal_document_versions (
             public_id, type, version, title, body_sha256, effective_at, published_by_user_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id, public_id, type, version, title, body_sha256, effective_at`,
          [
            input.publicId,
            input.type,
            input.version,
            input.title.trim(),
            input.bodySha256,
            input.effectiveAt,
            input.actorUserId,
          ],
        );
        const document = result.rows[0];
        if (!document) throw new Error('Legal document insert returned no row.');
        await this.appendAudit(client, {
          action: 'rights.legal-document-published',
          actorId: input.actorUserId,
          actorType: 'user',
          correlationId: input.correlationId,
          details: { type: input.type, version: input.version },
          subjectId: document.id,
          subjectType: 'legal-document-version',
        });
        return toLegalDocument(document);
      });
    } catch (error) {
      const constraint = postgresConstraint(error);
      if (
        constraint === 'legal_document_versions_type_version_uq' ||
        constraint === 'legal_document_versions_type_hash_uq'
      ) {
        throw new RightsError(
          'RIGHTS_DOCUMENT_INVALID',
          409,
          'That legal document version or immutable body is already published.',
        );
      }
      throw error;
    }
  }

  async configureRightsOffer(input: {
    actorUserId: string;
    campaignBriefVersionId: string;
    correlationId: string;
    extendedOwnedMediaSelected: boolean;
    missionSlotId: string;
    paidAdvertisingSelected: boolean;
    publicId: string;
    rightsVersion: number;
  }): Promise<MissionRightsOfferRecord> {
    if (!Number.isInteger(input.rightsVersion) || input.rightsVersion < 1) {
      throw new RightsError('RIGHTS_OFFER_INVALID', 409, 'Rights version must be positive.');
    }
    return this.withTransaction(async (client) => {
      const result = await client.query<{
        base_reward_minor: number;
        contract_add_on_bonus_minor: number;
        currency: string;
        public_disclosure_required: boolean;
      }>(
        `SELECT s.base_reward_minor, s.contract_add_on_bonus_minor, s.currency,
                EXISTS (
                  SELECT 1 FROM deliverable_requirements dr
                   WHERE dr.campaign_brief_version_id = b.id AND dr.requires_disclosure = true
                ) AS public_disclosure_required
           FROM mission_slots s
           JOIN campaigns c ON c.id = s.campaign_id AND c.status = 'draft'
           JOIN campaign_brief_versions b ON b.id = $2 AND b.campaign_id = c.id
           JOIN business_memberships m ON m.business_id = c.business_id AND m.user_id = $3
            AND m.status = 'active' AND m.role IN ('owner','manager')
          WHERE s.id = $1
          FOR UPDATE OF s, c`,
        [input.missionSlotId, input.campaignBriefVersionId, input.actorUserId],
      );
      const slot = result.rows[0];
      if (!slot) {
        throw new RightsError(
          'RIGHTS_ACCESS_DENIED',
          403,
          'Only the active business manager can configure rights for its draft campaign slot.',
        );
      }
      const extendedBonus = input.extendedOwnedMediaSelected
        ? roundedPercent(slot.base_reward_minor, 50)
        : 0;
      const paidBonus = input.paidAdvertisingSelected ? slot.base_reward_minor : 0;
      const totalRightsBonus = extendedBonus + paidBonus;
      if (slot.contract_add_on_bonus_minor < totalRightsBonus) {
        throw new RightsError(
          'RIGHTS_OFFER_INVALID',
          409,
          'The locked slot reward does not include every selected rights bonus.',
        );
      }
      const insert = await client.query<RightsOfferRow>(
        `INSERT INTO mission_rights_offers (
           public_id, mission_slot_id, campaign_brief_version_id, rights_version,
           base_reward_minor_snapshot, extended_owned_media_selected,
           extended_owned_media_bonus_minor, paid_advertising_selected,
           paid_advertising_bonus_minor, total_rights_bonus_minor, currency,
           public_disclosure_required, created_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          input.publicId,
          input.missionSlotId,
          input.campaignBriefVersionId,
          input.rightsVersion,
          slot.base_reward_minor,
          input.extendedOwnedMediaSelected,
          extendedBonus,
          input.paidAdvertisingSelected,
          paidBonus,
          totalRightsBonus,
          slot.currency,
          slot.public_disclosure_required,
          input.actorUserId,
        ],
      );
      const offer = insert.rows[0];
      if (!offer) throw new Error('Mission rights offer insert returned no row.');
      await this.appendAudit(client, {
        action: 'rights.offer-configured',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: {
          extendedOwnedMediaSelected: input.extendedOwnedMediaSelected,
          paidAdvertisingSelected: input.paidAdvertisingSelected,
          rightsVersion: input.rightsVersion,
        },
        subjectId: offer.id,
        subjectType: 'mission-rights-offer',
      });
      return toRightsOffer(offer);
    });
  }

  async acceptMissionContract(input: {
    campaignBriefVersionId: string;
    compensationAcknowledged: boolean;
    correlationId: string;
    creatorTermsDocumentId: string;
    creatorUserId: string;
    deliverablesAcknowledged: boolean;
    disclosureAcknowledged: boolean;
    disclosureDocumentId: string;
    missionAssignmentId: string;
    missionRightsOfferId: string;
    publicId: string;
    rightsAcknowledged: boolean;
  }): Promise<MissionContractAcceptanceRecord> {
    if (
      !input.compensationAcknowledged ||
      !input.deliverablesAcknowledged ||
      !input.disclosureAcknowledged ||
      !input.rightsAcknowledged
    ) {
      throw new RightsError(
        'RIGHTS_ACCEPTANCE_INVALID',
        409,
        'Compensation, deliverables, disclosure, and rights require explicit acceptance.',
      );
    }
    try {
      return await this.withTransaction(async (client) => {
        const scope = await client.query<{
          campaign_brief_version_id: string;
          creator_user_id: string;
          mission_rights_offer_id: string;
        }>(
          `SELECT a.campaign_brief_version_id, a.creator_user_id, r.id AS mission_rights_offer_id
             FROM mission_assignments a
             JOIN mission_rights_offers r ON r.id = $3
              AND r.mission_slot_id = a.mission_slot_id
              AND r.campaign_brief_version_id = a.campaign_brief_version_id
             JOIN legal_document_versions terms ON terms.id = $4
              AND terms.type = 'creator_terms' AND terms.effective_at <= now()
             JOIN legal_document_versions disclosure ON disclosure.id = $5
              AND disclosure.type = 'sponsorship_disclosure' AND disclosure.effective_at <= now()
            WHERE a.id = $1 AND a.creator_user_id = $2 AND a.status = 'scheduled'
              AND a.campaign_brief_version_id = $6
            FOR UPDATE OF a`,
          [
            input.missionAssignmentId,
            input.creatorUserId,
            input.missionRightsOfferId,
            input.creatorTermsDocumentId,
            input.disclosureDocumentId,
            input.campaignBriefVersionId,
          ],
        );
        if (!scope.rows[0]) {
          throw new RightsError(
            'RIGHTS_ACCEPTANCE_INVALID',
            409,
            'Acceptance must match the assigned creator, accepted brief, rights offer, and effective document types before check-in.',
          );
        }
        const result = await client.query<AcceptanceRow>(
          `INSERT INTO mission_contract_acceptances (
             public_id, mission_assignment_id, creator_user_id, campaign_brief_version_id,
             mission_rights_offer_id, creator_terms_document_id, disclosure_document_id,
             compensation_acknowledged, deliverables_acknowledged,
             disclosure_acknowledged, rights_acknowledged
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,true,true,true)
           RETURNING id, public_id, mission_assignment_id, creator_user_id,
                     campaign_brief_version_id, mission_rights_offer_id, accepted_at`,
          [
            input.publicId,
            input.missionAssignmentId,
            input.creatorUserId,
            input.campaignBriefVersionId,
            input.missionRightsOfferId,
            input.creatorTermsDocumentId,
            input.disclosureDocumentId,
          ],
        );
        const acceptance = result.rows[0];
        if (!acceptance) throw new Error('Mission contract acceptance insert returned no row.');
        await this.appendAudit(client, {
          action: 'rights.creator-contract-accepted',
          actorId: input.creatorUserId,
          actorType: 'user',
          correlationId: input.correlationId,
          details: { campaignBriefVersionId: input.campaignBriefVersionId },
          subjectId: acceptance.id,
          subjectType: 'mission-contract-acceptance',
        });
        return toAcceptance(acceptance);
      });
    } catch (error) {
      if (postgresConstraint(error) === 'mission_contract_acceptances_assignment_uq') {
        throw new RightsError(
          'RIGHTS_ALREADY_ACCEPTED',
          409,
          'The creator already accepted the immutable mission contract for this assignment.',
        );
      }
      throw error;
    }
  }

  async activateInitialLicenses(input: {
    correlationId: string;
    licensePublicIds: {
      extendedOwnedMedia?: string;
      organicOwnedSocial: string;
      paidAdvertising?: string;
    };
    missionAssignmentId: string;
  }): Promise<ContentLicenseRecord[]> {
    return this.withTransaction(async (client) => {
      const source = await client.query<{
        acceptance_id: string;
        application_status: string;
        assignment_status: string;
        base_reward_minor_snapshot: number;
        campaign_status: string;
        currency: string;
        extended_owned_media_bonus_minor: number;
        extended_owned_media_selected: boolean;
        financial_action_intent_id: string | null;
        financial_action_intent_type: string | null;
        paid_advertising_bonus_minor: number;
        paid_advertising_selected: boolean;
        rights_version: number;
        slot_status: string;
      }>(
        `SELECT a.status AS assignment_status, app.status AS application_status,
                s.status AS slot_status, c.status AS campaign_status,
                acceptance.id AS acceptance_id, r.rights_version,
                r.base_reward_minor_snapshot, r.extended_owned_media_selected,
                r.extended_owned_media_bonus_minor, r.paid_advertising_selected,
                r.paid_advertising_bonus_minor, r.currency,
                f.id AS financial_action_intent_id, f.action AS financial_action_intent_type
           FROM mission_assignments a
           JOIN mission_applications app ON app.id = a.application_id
           JOIN mission_slots s ON s.id = a.mission_slot_id
           JOIN campaigns c ON c.id = a.campaign_id
           JOIN mission_contract_acceptances acceptance ON acceptance.mission_assignment_id = a.id
            AND acceptance.creator_user_id = a.creator_user_id
            AND acceptance.campaign_brief_version_id = a.campaign_brief_version_id
           JOIN mission_rights_offers r ON r.id = acceptance.mission_rights_offer_id
            AND r.mission_slot_id = a.mission_slot_id
           LEFT JOIN financial_action_intents f ON f.mission_assignment_id = a.id
          WHERE a.id = $1
          FOR UPDATE OF a`,
        [input.missionAssignmentId],
      );
      const row = source.rows[0];
      if (!row) {
        throw new RightsError(
          'RIGHTS_NOT_FOUND',
          404,
          'The accepted mission rights contract does not exist.',
        );
      }
      const expectedKinds: ContentLicenseKind[] = ['organic_owned_social_90d'];
      if (row.extended_owned_media_selected) expectedKinds.push('extended_owned_media_12m');
      if (row.paid_advertising_selected) expectedKinds.push('paid_advertising_30d');
      const existing = await client.query<LicenseRow>(
        `SELECT id, public_id, mission_assignment_id, kind, status, base_reward_minor_snapshot,
                compensation_component_minor, currency, activated_at, expires_at, version
           FROM content_licenses WHERE mission_assignment_id = $1 ORDER BY kind`,
        [input.missionAssignmentId],
      );
      if (existing.rows.length > 0) {
        if (
          existing.rows.length === expectedKinds.length &&
          existing.rows.every((license) => expectedKinds.includes(license.kind))
        ) {
          return existing.rows.map(toLicense);
        }
        throw new RightsError(
          'RIGHTS_ALREADY_ACTIVATED',
          409,
          'A conflicting license set already exists for this assignment.',
        );
      }
      if (
        row.assignment_status !== 'completed' ||
        row.application_status !== 'completed' ||
        row.slot_status !== 'completed' ||
        row.campaign_status !== 'published' ||
        row.financial_action_intent_type !== 'creator_payable_full' ||
        !row.financial_action_intent_id
      ) {
        throw new RightsError(
          'RIGHTS_LICENSE_NOT_READY',
          409,
          'Licenses require completed approved work and the full creator-payable obligation.',
        );
      }
      const submission = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM submission_attempts
          WHERE mission_assignment_id = $1
          ORDER BY attempt_number DESC LIMIT 1 FOR SHARE`,
        [input.missionAssignmentId],
      );
      const finalSubmission = submission.rows[0];
      if (
        !finalSubmission ||
        !['approved', 'auto_approved', 'resolved_approved'].includes(finalSubmission.status)
      ) {
        throw new RightsError(
          'RIGHTS_LICENSE_NOT_READY',
          409,
          'The latest submission must have a final full-payout approval.',
        );
      }
      const assets = await client.query<{ id: string; public_id: string }>(
        `SELECT DISTINCT media.id, media.public_id
           FROM submission_assets submitted
           JOIN media_assets media ON media.id = submitted.media_asset_id
          WHERE submitted.submission_attempt_id = $1
            AND media.mission_assignment_id = $2 AND media.status = 'verified'
          ORDER BY media.public_id`,
        [finalSubmission.id, input.missionAssignmentId],
      );
      if (assets.rows.length === 0) {
        throw new RightsError(
          'RIGHTS_NO_CONTENT',
          409,
          'No verified accepted content exists to license.',
        );
      }
      const idsByKind: Record<ContentLicenseKind, string | undefined> = {
        extended_owned_media_12m: input.licensePublicIds.extendedOwnedMedia,
        organic_owned_social_90d: input.licensePublicIds.organicOwnedSocial,
        paid_advertising_30d: input.licensePublicIds.paidAdvertising,
      };
      if (expectedKinds.some((kind) => !idsByKind[kind])) {
        throw new RightsError(
          'RIGHTS_LICENSE_NOT_READY',
          409,
          'Every selected license requires a stable public identifier.',
        );
      }
      const activatedAtResult = await client.query<{ server_now: Date }>(
        `SELECT now() AS server_now`,
      );
      const activatedAt = activatedAtResult.rows[0]?.server_now;
      if (!activatedAt) throw new Error('Database time query returned no row.');
      const created: ContentLicenseRecord[] = [];
      for (const kind of expectedKinds) {
        const compensation =
          kind === 'organic_owned_social_90d'
            ? 0
            : kind === 'extended_owned_media_12m'
              ? row.extended_owned_media_bonus_minor
              : row.paid_advertising_bonus_minor;
        const duration =
          kind === 'organic_owned_social_90d'
            ? "interval '90 days'"
            : kind === 'extended_owned_media_12m'
              ? "interval '12 months'"
              : "interval '30 days'";
        const inserted = await client.query<LicenseRow>(
          `INSERT INTO content_licenses (
             public_id, mission_assignment_id, mission_contract_acceptance_id,
             submission_attempt_id, financial_action_intent_id, kind, rights_version,
             base_reward_minor_snapshot, compensation_component_minor, currency,
             permitted_edits, activated_at, expires_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::timestamptz,$12::timestamptz + ${duration})
           RETURNING id, public_id, mission_assignment_id, kind, status,
                     base_reward_minor_snapshot, compensation_component_minor, currency,
                     activated_at, expires_at, version`,
          [
            idsByKind[kind],
            input.missionAssignmentId,
            row.acceptance_id,
            finalSubmission.id,
            row.financial_action_intent_id,
            kind,
            row.rights_version,
            row.base_reward_minor_snapshot,
            compensation,
            row.currency,
            JSON.stringify(permittedEdits),
            activatedAt,
          ],
        );
        const license = inserted.rows[0];
        if (!license) throw new Error('Content license insert returned no row.');
        const channels: ContentLicenseChannel[] =
          kind === 'organic_owned_social_90d'
            ? ['owned_social']
            : kind === 'extended_owned_media_12m'
              ? ['owned_social', 'business_website', 'business_email']
              : ['paid_advertising'];
        for (const [index, asset] of assets.rows.entries()) {
          await client.query(
            `INSERT INTO content_license_assets
               (public_id, content_license_id, media_asset_id, position)
             VALUES ($1,$2,$3,$4)`,
            [`cla_${randomUUID()}`, license.id, asset.id, index + 1],
          );
        }
        for (const channel of channels) {
          await client.query(
            `INSERT INTO content_license_channels (public_id, content_license_id, channel)
             VALUES ($1,$2,$3)`,
            [`clc_${randomUUID()}`, license.id, channel],
          );
        }
        await client.query(
          `INSERT INTO content_license_status_history (
             content_license_id, to_status, license_version, actor_type, reason, occurred_at
           ) VALUES ($1,'active',1,'service','Approved content and full creator payable established',$2)`,
          [license.id, activatedAt],
        );
        created.push(toLicense(license));
      }
      await this.appendAudit(client, {
        action: 'rights.initial-licenses-activated',
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: { kinds: expectedKinds },
        subjectId: input.missionAssignmentId,
        subjectType: 'mission-assignment',
      });
      return created;
    });
  }

  async expireDueLicenses(input: {
    correlationId: string;
    missionAssignmentId: string;
  }): Promise<ContentLicenseRecord[]> {
    return this.withTransaction(async (client) => {
      const due = await client.query<LicenseRow & { server_now: Date }>(
        `SELECT id, public_id, mission_assignment_id, kind, status,
                base_reward_minor_snapshot, compensation_component_minor, currency,
                activated_at, expires_at, version, now() AS server_now
           FROM content_licenses
          WHERE mission_assignment_id = $1 AND status = 'active' AND expires_at <= now()
          ORDER BY kind FOR UPDATE`,
        [input.missionAssignmentId],
      );
      const expired: ContentLicenseRecord[] = [];
      for (const license of due.rows) {
        const nextVersion = license.version + 1;
        const updated = await client.query<LicenseRow>(
          `UPDATE content_licenses SET status = 'expired', expired_at = $2,
                  version = $3, updated_at = $2 WHERE id = $1
           RETURNING id, public_id, mission_assignment_id, kind, status,
                     base_reward_minor_snapshot, compensation_component_minor, currency,
                     activated_at, expires_at, version`,
          [license.id, license.server_now, nextVersion],
        );
        await client.query(
          `INSERT INTO content_license_status_history (
             content_license_id, from_status, to_status, license_version,
             actor_type, reason, occurred_at
           ) VALUES ($1,'active','expired',$2,'service','Fixed license term ended',$3)`,
          [license.id, nextVersion, license.server_now],
        );
        const row = updated.rows[0];
        if (!row) throw new Error('Expired content license update returned no row.');
        expired.push(toLicense(row));
      }
      if (expired.length > 0) {
        await this.appendAudit(client, {
          action: 'rights.licenses-expired',
          actorId: null,
          actorType: 'service',
          correlationId: input.correlationId,
          details: { kinds: expired.map((license) => license.kind) },
          subjectId: input.missionAssignmentId,
          subjectType: 'mission-assignment',
        });
      }
      return expired;
    });
  }

  async listLicensesForBusiness(input: {
    actorUserId: string;
    missionAssignmentId: string;
  }): Promise<BusinessContentLicenseView[]> {
    return this.withTransaction(async (client) => {
      const licenses = await client.query<
        LicenseRow & {
          asset_public_ids: string[];
          channels: ContentLicenseChannel[];
          is_currently_usable: boolean;
        }
      >(
        `SELECT l.id, l.public_id, l.mission_assignment_id, l.kind, l.status,
                l.base_reward_minor_snapshot, l.compensation_component_minor, l.currency,
                l.activated_at, l.expires_at, l.version,
                array_agg(DISTINCT media.public_id ORDER BY media.public_id) AS asset_public_ids,
                array_agg(DISTINCT channel.channel::text ORDER BY channel.channel::text) AS channels,
                (l.status = 'active' AND now() < l.expires_at) AS is_currently_usable
           FROM content_licenses l
           JOIN mission_assignments assignment ON assignment.id = l.mission_assignment_id
           JOIN campaigns campaign ON campaign.id = assignment.campaign_id
           JOIN business_memberships member ON member.business_id = campaign.business_id
            AND member.user_id = $2 AND member.status = 'active'
            AND member.role IN ('owner','manager')
           JOIN content_license_assets asset ON asset.content_license_id = l.id
           JOIN media_assets media ON media.id = asset.media_asset_id
           JOIN content_license_channels channel ON channel.content_license_id = l.id
          WHERE l.mission_assignment_id = $1
          GROUP BY l.id
          ORDER BY l.kind`,
        [input.missionAssignmentId, input.actorUserId],
      );
      if (licenses.rows.length === 0) {
        const assignment = await client.query(`SELECT 1 FROM mission_assignments WHERE id = $1`, [
          input.missionAssignmentId,
        ]);
        if (assignment.rowCount !== 1) {
          throw new RightsError('RIGHTS_NOT_FOUND', 404, 'Mission assignment does not exist.');
        }
        const authorized = await client.query(
          `SELECT 1 FROM mission_assignments assignment
           JOIN campaigns campaign ON campaign.id = assignment.campaign_id
           JOIN business_memberships member ON member.business_id = campaign.business_id
            AND member.user_id = $2 AND member.status = 'active'
            AND member.role IN ('owner','manager')
           WHERE assignment.id = $1`,
          [input.missionAssignmentId, input.actorUserId],
        );
        if (authorized.rowCount !== 1) {
          throw new RightsError('RIGHTS_ACCESS_DENIED', 403, 'Content license access denied.');
        }
      }
      return licenses.rows.map((row) => ({
        ...toLicense(row),
        assetPublicIds: row.asset_public_ids,
        channels: row.channels,
        isCurrentlyUsable: row.is_currently_usable,
      }));
    });
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
