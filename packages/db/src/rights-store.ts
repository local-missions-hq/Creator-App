import { randomUUID } from 'node:crypto';

import type {
  ContentLicenseChannel,
  ContentLicenseKind,
  ContentLicenseRenewalStatus,
  ContentLicenseStatus,
  LegalDocumentType,
  PaymentProvider,
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
  termNumber: number;
  version: number;
};

export type BusinessContentLicenseView = ContentLicenseRecord & {
  assetPublicIds: string[];
  channels: ContentLicenseChannel[];
  isCurrentlyUsable: boolean;
  usagePolicy:
    'active_usage' | 'future_term' | 'archived_organic_nonboostable' | 'remove_active_placement';
};

export type ContentLicenseRenewalRecord = {
  businessId: string;
  creatorRewardMinor: number;
  creatorUserId: string;
  currency: string;
  id: string;
  kind: ContentLicenseKind;
  missionAssignmentId: string;
  originalBaseRewardMinor: number;
  platformFeeMinor: number;
  publicId: string;
  requestedAt: Date;
  sourceContentLicenseId: string;
  status: ContentLicenseRenewalStatus;
  totalDueMinor: number;
  version: number;
};

export type CreatorRenewalView = ContentLicenseRenewalRecord & {
  assetPublicIds: string[];
  businessName: string;
  channels: ContentLicenseChannel[];
  currentLicenseExpiresAt: Date;
  term: '30 days' | '90 days' | '12 months';
};

export type RenewalFundingIntentRecord = {
  creatorRewardMinor: number;
  currency: string;
  id: string;
  platformFeeMinor: number;
  publicId: string;
  renewalId: string;
  status: 'pending_provider' | 'confirmed' | 'failed' | 'abandoned';
  totalDueMinor: number;
};

export type LicenseExpiryReminderRecord = {
  contentLicenseId: string;
  expiresAt: Date;
  stage: '30_days' | '7_days' | '1_day';
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
  term_number?: number;
  version: number;
};

type RenewalRow = QueryResultRow & {
  business_id: string;
  creator_reward_minor: number;
  creator_user_id: string;
  currency: string;
  id: string;
  kind: ContentLicenseKind;
  mission_assignment_id: string;
  original_base_reward_minor: number;
  platform_fee_minor: number;
  public_id: string;
  requested_at: Date;
  source_content_license_id: string;
  status: ContentLicenseRenewalStatus;
  total_due_minor: number;
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
    termNumber: row.term_number ?? 1,
    version: row.version,
  };
}

function toRenewal(row: RenewalRow): ContentLicenseRenewalRecord {
  return {
    businessId: row.business_id,
    creatorRewardMinor: row.creator_reward_minor,
    creatorUserId: row.creator_user_id,
    currency: row.currency,
    id: row.id,
    kind: row.kind,
    missionAssignmentId: row.mission_assignment_id,
    originalBaseRewardMinor: row.original_base_reward_minor,
    platformFeeMinor: row.platform_fee_minor,
    publicId: row.public_id,
    requestedAt: row.requested_at,
    sourceContentLicenseId: row.source_content_license_id,
    status: row.status,
    totalDueMinor: row.total_due_minor,
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
                compensation_component_minor, currency, activated_at, expires_at, term_number, version
           FROM content_licenses WHERE mission_assignment_id = $1 AND term_number = 1 ORDER BY kind`,
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
                     activated_at, expires_at, term_number, version`,
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

  async requestRenewal(input: {
    actorUserId: string;
    correlationId: string;
    publicId: string;
    sourceContentLicenseId: string;
  }): Promise<ContentLicenseRenewalRecord> {
    return this.withTransaction(async (client) => {
      const sourceResult = await client.query<
        LicenseRow & {
          business_id: string;
          creator_user_id: string;
          server_now: Date;
        }
      >(
        `SELECT l.*, assignment.creator_user_id, campaign.business_id, now() AS server_now
           FROM content_licenses l
           JOIN mission_assignments assignment ON assignment.id = l.mission_assignment_id
           JOIN campaigns campaign ON campaign.id = assignment.campaign_id
           JOIN business_memberships member ON member.business_id = campaign.business_id
            AND member.user_id = $2 AND member.status = 'active' AND member.role IN ('owner','manager')
          WHERE l.id = $1 FOR UPDATE OF l`,
        [input.sourceContentLicenseId, input.actorUserId],
      );
      const source = sourceResult.rows[0];
      if (!source) {
        throw new RightsError('RIGHTS_ACCESS_DENIED', 403, 'Renewal request access denied.');
      }
      if (
        source.status !== 'active' ||
        source.expires_at <= source.server_now ||
        source.expires_at.getTime() > source.server_now.getTime() + 30 * 86_400_000
      ) {
        throw new RightsError(
          'RIGHTS_RENEWAL_WINDOW_CLOSED',
          409,
          'Renewals can be requested only during the final 30 days of an active license.',
        );
      }
      const existing = await client.query(
        `SELECT 1 FROM content_license_renewals WHERE source_content_license_id = $1`,
        [source.id],
      );
      if (existing.rowCount) {
        throw new RightsError(
          'RIGHTS_TRANSITION_CONFLICT',
          409,
          'This license term already has a renewal decision path.',
        );
      }
      const percentage =
        source.kind === 'organic_owned_social_90d'
          ? 25
          : source.kind === 'extended_owned_media_12m'
            ? 50
            : 100;
      const creatorRewardMinor = roundedPercent(source.base_reward_minor_snapshot, percentage);
      const platformFeeMinor = roundedPercent(creatorRewardMinor, 15);
      const inserted = await client.query<RenewalRow>(
        `INSERT INTO content_license_renewals (
           public_id, source_content_license_id, mission_assignment_id, creator_user_id,
           business_id, kind, original_base_reward_minor, creator_reward_minor,
           platform_fee_minor, total_due_minor, currency, requested_by_user_id, requested_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          input.publicId,
          source.id,
          source.mission_assignment_id,
          source.creator_user_id,
          source.business_id,
          source.kind,
          source.base_reward_minor_snapshot,
          creatorRewardMinor,
          platformFeeMinor,
          creatorRewardMinor + platformFeeMinor,
          source.currency,
          input.actorUserId,
          source.server_now,
        ],
      );
      const renewal = inserted.rows[0];
      if (!renewal) throw new Error('Content license renewal insert returned no row.');
      await client.query(
        `INSERT INTO content_license_renewal_history (
           content_license_renewal_id, to_status, renewal_version,
           actor_user_id, actor_type, reason, occurred_at
         ) VALUES ($1,'requested',1,$2,'user','Business requested creator-visible renewal',$3)`,
        [renewal.id, input.actorUserId, source.server_now],
      );
      await this.appendAudit(client, {
        action: 'rights.renewal-requested',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: {
          creatorRewardMinor,
          kind: source.kind,
          platformFeeMinor,
          totalDueMinor: creatorRewardMinor + platformFeeMinor,
        },
        subjectId: renewal.id,
        subjectType: 'content-license-renewal',
      });
      return toRenewal(renewal);
    });
  }

  async getRenewalForCreator(input: {
    actorUserId: string;
    renewalId: string;
  }): Promise<CreatorRenewalView> {
    return this.withTransaction(async (client) => {
      const result = await client.query<
        RenewalRow & {
          asset_public_ids: string[];
          business_name: string;
          channels: ContentLicenseChannel[];
          current_license_expires_at: Date;
        }
      >(
        `SELECT renewal.*, business.name AS business_name,
                source.expires_at AS current_license_expires_at,
                array_agg(DISTINCT media.public_id ORDER BY media.public_id) AS asset_public_ids,
                array_agg(DISTINCT channel.channel::text ORDER BY channel.channel::text) AS channels
           FROM content_license_renewals renewal
           JOIN businesses business ON business.id = renewal.business_id
           JOIN content_licenses source ON source.id = renewal.source_content_license_id
           JOIN content_license_assets asset ON asset.content_license_id = source.id
           JOIN media_assets media ON media.id = asset.media_asset_id
           JOIN content_license_channels channel ON channel.content_license_id = source.id
          WHERE renewal.id = $1 AND renewal.creator_user_id = $2
          GROUP BY renewal.id, business.id, source.id`,
        [input.renewalId, input.actorUserId],
      );
      const row = result.rows[0];
      if (!row)
        throw new RightsError('RIGHTS_ACCESS_DENIED', 403, 'Creator renewal access denied.');
      return {
        ...toRenewal(row),
        assetPublicIds: row.asset_public_ids,
        businessName: row.business_name,
        channels: row.channels,
        currentLicenseExpiresAt: row.current_license_expires_at,
        term:
          row.kind === 'organic_owned_social_90d'
            ? '90 days'
            : row.kind === 'extended_owned_media_12m'
              ? '12 months'
              : '30 days',
      };
    });
  }

  async decideRenewal(input: {
    actorUserId: string;
    correlationId: string;
    decision: 'accept' | 'decline';
    renewalId: string;
  }): Promise<ContentLicenseRenewalRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<RenewalRow & { server_now: Date }>(
        `SELECT *, now() AS server_now FROM content_license_renewals
          WHERE id = $1 AND creator_user_id = $2 FOR UPDATE`,
        [input.renewalId, input.actorUserId],
      );
      const renewal = result.rows[0];
      if (!renewal)
        throw new RightsError('RIGHTS_ACCESS_DENIED', 403, 'Creator renewal access denied.');
      if (renewal.status !== 'requested') {
        throw new RightsError('RIGHTS_TRANSITION_CONFLICT', 409, 'Renewal was already decided.');
      }
      const nextStatus = input.decision === 'accept' ? 'accepted' : 'declined';
      const nextVersion = renewal.version + 1;
      const updated = await client.query<RenewalRow>(
        `UPDATE content_license_renewals
            SET status = $2::content_license_renewal_status,
                decision_at = $3::timestamptz,
                terminal_at = CASE
                  WHEN $2::content_license_renewal_status = 'declined' THEN $3::timestamptz
                  ELSE NULL::timestamptz
                END,
                version = $4, updated_at = $3::timestamptz
          WHERE id = $1 RETURNING *`,
        [renewal.id, nextStatus, renewal.server_now, nextVersion],
      );
      await client.query(
        `INSERT INTO content_license_renewal_history (
           content_license_renewal_id, from_status, to_status, renewal_version,
           actor_user_id, actor_type, reason, occurred_at
         ) VALUES ($1,'requested',$2,$3,$4,'user',$5,$6)`,
        [
          renewal.id,
          nextStatus,
          nextVersion,
          input.actorUserId,
          input.decision === 'accept'
            ? 'Creator explicitly accepted renewal economics and scope'
            : 'Creator declined renewal without reliability effect',
          renewal.server_now,
        ],
      );
      await this.appendAudit(client, {
        action: input.decision === 'accept' ? 'rights.renewal-accepted' : 'rights.renewal-declined',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { reliabilityChanged: false },
        subjectId: renewal.id,
        subjectType: 'content-license-renewal',
      });
      const row = updated.rows[0];
      if (!row) throw new Error('Renewal decision update returned no row.');
      return toRenewal(row);
    });
  }

  async beginRenewalFunding(input: {
    actorUserId: string;
    correlationId: string;
    fundingIntentPublicId: string;
    renewalId: string;
  }): Promise<RenewalFundingIntentRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<RenewalRow & { server_now: Date }>(
        `SELECT renewal.*, now() AS server_now
           FROM content_license_renewals renewal
           JOIN business_memberships member ON member.business_id = renewal.business_id
            AND member.user_id = $2 AND member.status = 'active' AND member.role IN ('owner','manager')
          WHERE renewal.id = $1 FOR UPDATE OF renewal`,
        [input.renewalId, input.actorUserId],
      );
      const renewal = result.rows[0];
      if (!renewal)
        throw new RightsError('RIGHTS_ACCESS_DENIED', 403, 'Renewal funding access denied.');
      if (renewal.status !== 'accepted') {
        throw new RightsError(
          'RIGHTS_RENEWAL_NOT_READY',
          409,
          'Creator acceptance is required before Business funding.',
        );
      }
      const intentResult = await client.query<{
        creator_reward_minor: number;
        currency: string;
        id: string;
        platform_fee_minor: number;
        public_id: string;
        status: 'pending_provider';
        total_due_minor: number;
      }>(
        `INSERT INTO content_license_renewal_funding_intents (
           public_id, content_license_renewal_id, creator_reward_minor,
           platform_fee_minor, total_due_minor, currency, requested_by_user_id, requested_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          input.fundingIntentPublicId,
          renewal.id,
          renewal.creator_reward_minor,
          renewal.platform_fee_minor,
          renewal.total_due_minor,
          renewal.currency,
          input.actorUserId,
          renewal.server_now,
        ],
      );
      const intent = intentResult.rows[0];
      if (!intent) throw new Error('Renewal funding intent insert returned no row.');
      const nextVersion = renewal.version + 1;
      await client.query(
        `UPDATE content_license_renewals SET status = 'funding_pending',
                funding_requested_at = $2, version = $3, updated_at = $2 WHERE id = $1`,
        [renewal.id, renewal.server_now, nextVersion],
      );
      await client.query(
        `INSERT INTO content_license_renewal_history (
           content_license_renewal_id, from_status, to_status, renewal_version,
           actor_user_id, actor_type, reason, occurred_at
         ) VALUES ($1,'accepted','funding_pending',$2,$3,'user',
                   'Business explicitly requested separately priced renewal funding',$4)`,
        [renewal.id, nextVersion, input.actorUserId, renewal.server_now],
      );
      await this.appendAudit(client, {
        action: 'rights.renewal-funding-requested',
        actorId: input.actorUserId,
        actorType: 'user',
        correlationId: input.correlationId,
        details: { totalDueMinor: renewal.total_due_minor },
        subjectId: intent.id,
        subjectType: 'content-license-renewal-funding-intent',
      });
      return {
        creatorRewardMinor: intent.creator_reward_minor,
        currency: intent.currency,
        id: intent.id,
        platformFeeMinor: intent.platform_fee_minor,
        publicId: intent.public_id,
        renewalId: renewal.id,
        status: intent.status,
        totalDueMinor: intent.total_due_minor,
      };
    });
  }

  async closeRenewalFunding(input: {
    correlationId: string;
    fundingIntentId: string;
    outcome: 'failed' | 'abandoned';
  }): Promise<void> {
    return this.withTransaction(async (client) => {
      const result = await client.query<{
        id: string;
        renewal_id: string;
        renewal_version: number;
        server_now: Date;
        status: string;
      }>(
        `SELECT intent.id, intent.status, renewal.id AS renewal_id,
                renewal.version AS renewal_version, now() AS server_now
           FROM content_license_renewal_funding_intents intent
           JOIN content_license_renewals renewal ON renewal.id = intent.content_license_renewal_id
          WHERE intent.id = $1 FOR UPDATE OF intent, renewal`,
        [input.fundingIntentId],
      );
      const row = result.rows[0];
      if (!row || row.status !== 'pending_provider') {
        throw new RightsError(
          'RIGHTS_RENEWAL_NOT_READY',
          409,
          'Pending renewal funding is absent.',
        );
      }
      const renewalStatus = input.outcome === 'failed' ? 'funding_failed' : 'abandoned';
      await client.query(
        `UPDATE content_license_renewal_funding_intents
            SET status = $2, completed_at = $3, version = version + 1 WHERE id = $1`,
        [row.id, input.outcome, row.server_now],
      );
      await client.query(
        `UPDATE content_license_renewals SET status = $2, terminal_at = $3,
                version = version + 1, updated_at = $3 WHERE id = $1`,
        [row.renewal_id, renewalStatus, row.server_now],
      );
      await client.query(
        `INSERT INTO content_license_renewal_history (
           content_license_renewal_id, from_status, to_status, renewal_version,
           actor_type, reason, occurred_at
         ) VALUES ($1,'funding_pending',$2,$3,'provider',$4,$5)`,
        [
          row.renewal_id,
          renewalStatus,
          row.renewal_version + 1,
          input.outcome === 'failed'
            ? 'Authoritative provider funding failed; no rights extended'
            : 'Renewal funding was abandoned; no rights extended',
          row.server_now,
        ],
      );
      await this.appendAudit(client, {
        action: `rights.renewal-funding-${input.outcome}`,
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: { rightsExtended: false },
        subjectId: row.renewal_id,
        subjectType: 'content-license-renewal',
      });
    });
  }

  async recordAuthoritativeRenewalFunding(input: {
    correlationId: string;
    fundedAt: Date;
    fundingIntentId: string;
    fundingSnapshotPublicId: string;
    invoiceProviderObjectId: string;
    invoiceProviderReferencePublicId: string;
    licensePublicId: string;
    payablePublicId: string;
    paymentIntentProviderObjectId: string;
    paymentIntentProviderReferencePublicId: string;
    provider: PaymentProvider;
    providerAccountReference: string;
    providerEventId: string;
  }): Promise<ContentLicenseRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<
        RenewalRow & {
          acceptance_id: string;
          funding_intent_id: string;
          funding_status: string;
          rights_version: number;
          server_now: Date;
          source_expires_at: Date;
          source_status: ContentLicenseStatus;
          submission_attempt_id: string;
          term_number: number;
        }
      >(
        `SELECT renewal.*, intent.id AS funding_intent_id, intent.status AS funding_status,
                source.status AS source_status, source.expires_at AS source_expires_at,
                source.term_number, source.rights_version, source.mission_contract_acceptance_id AS acceptance_id,
                source.submission_attempt_id, now() AS server_now
           FROM content_license_renewal_funding_intents intent
           JOIN content_license_renewals renewal ON renewal.id = intent.content_license_renewal_id
           JOIN content_licenses source ON source.id = renewal.source_content_license_id
          WHERE intent.id = $1 FOR UPDATE OF intent, renewal, source`,
        [input.fundingIntentId],
      );
      const renewal = result.rows[0];
      if (!renewal)
        throw new RightsError('RIGHTS_NOT_FOUND', 404, 'Renewal funding intent is absent.');
      if (renewal.funding_status === 'confirmed' && renewal.status === 'funded') {
        const existing = await client.query<LicenseRow>(
          `SELECT license.* FROM content_license_renewal_funding_snapshots snapshot
            JOIN content_licenses license ON license.id = snapshot.activated_content_license_id
           WHERE snapshot.content_license_renewal_funding_intent_id = $1
             AND snapshot.provider_event_id = $2`,
          [renewal.funding_intent_id, input.providerEventId],
        );
        const row = existing.rows[0];
        if (row) return toLicense(row);
        throw new RightsError(
          'RIGHTS_TRANSITION_CONFLICT',
          409,
          'Renewal funding was already confirmed by different immutable evidence.',
        );
      }
      if (
        renewal.status !== 'funding_pending' ||
        renewal.funding_status !== 'pending_provider' ||
        !['active', 'expired'].includes(renewal.source_status)
      ) {
        throw new RightsError(
          'RIGHTS_RENEWAL_NOT_READY',
          409,
          'Only an accepted pending renewal can consume authoritative funding.',
        );
      }
      const termEndExpression =
        renewal.kind === 'organic_owned_social_90d'
          ? `interval '90 days'`
          : renewal.kind === 'extended_owned_media_12m'
            ? `interval '12 months'`
            : `interval '30 days'`;
      const invoiceReference = await client.query<{ id: string }>(
        `INSERT INTO payment_provider_references (
           public_id, provider, provider_account_reference, object_type, provider_object_id
         ) VALUES ($1,$2,$3,'invoice',$4) RETURNING id`,
        [
          input.invoiceProviderReferencePublicId,
          input.provider,
          input.providerAccountReference,
          input.invoiceProviderObjectId,
        ],
      );
      const paymentReference = await client.query<{ id: string }>(
        `INSERT INTO payment_provider_references (
           public_id, provider, provider_account_reference, object_type, provider_object_id
         ) VALUES ($1,$2,$3,'payment_intent',$4) RETURNING id`,
        [
          input.paymentIntentProviderReferencePublicId,
          input.provider,
          input.providerAccountReference,
          input.paymentIntentProviderObjectId,
        ],
      );
      const invoiceReferenceId = invoiceReference.rows[0]?.id;
      const paymentReferenceId = paymentReference.rows[0]?.id;
      if (!invoiceReferenceId || !paymentReferenceId) {
        throw new Error('Renewal provider reference insert returned no row.');
      }
      const licenseResult = await client.query<LicenseRow>(
        `INSERT INTO content_licenses (
           public_id, mission_assignment_id, mission_contract_acceptance_id,
           submission_attempt_id, financial_action_intent_id, kind, status, term_number,
           rights_version, base_reward_minor_snapshot, compensation_component_minor,
           currency, permitted_edits, activated_at, expires_at
         )
         SELECT $1,$2,$3,$4,NULL,$5,'active',$6,$7,$8,$9,$10,$11::jsonb,
                GREATEST(source.expires_at, now()),
                GREATEST(source.expires_at, now()) + ${termEndExpression}
           FROM content_licenses source WHERE source.id = $12
         RETURNING *`,
        [
          input.licensePublicId,
          renewal.mission_assignment_id,
          renewal.acceptance_id,
          renewal.submission_attempt_id,
          renewal.kind,
          renewal.term_number + 1,
          renewal.rights_version + 1,
          renewal.original_base_reward_minor,
          renewal.creator_reward_minor,
          renewal.currency,
          JSON.stringify(permittedEdits),
          renewal.source_content_license_id,
        ],
      );
      const license = licenseResult.rows[0];
      if (!license) throw new Error('Renewal content license insert returned no row.');
      await client.query(
        `INSERT INTO content_license_assets (public_id, content_license_id, media_asset_id, position)
         SELECT $1 || '_' || source.position::text, $2, source.media_asset_id, source.position
           FROM content_license_assets source
          WHERE source.content_license_id = $3 ORDER BY source.position`,
        [`cla_${input.licensePublicId}`, license.id, renewal.source_content_license_id],
      );
      await client.query(
        `INSERT INTO content_license_channels (public_id, content_license_id, channel)
         SELECT $1 || '_' || row_number() OVER (ORDER BY source.channel)::text,
                $2, source.channel
           FROM content_license_channels source
          WHERE source.content_license_id = $3`,
        [`clc_${input.licensePublicId}`, license.id, renewal.source_content_license_id],
      );
      await client.query(
        `INSERT INTO content_license_status_history (
           content_license_id, to_status, license_version, actor_type, reason, occurred_at
         ) VALUES ($1,'active',1,'provider','Authoritative separately funded renewal activation',$2)`,
        [license.id, renewal.server_now],
      );
      await client.query(
        `INSERT INTO content_license_renewal_funding_snapshots (
           public_id, content_license_renewal_funding_intent_id,
           invoice_provider_reference_id, payment_intent_provider_reference_id,
           activated_content_license_id, provider_event_id, creator_reward_minor,
           platform_fee_minor, total_due_minor, currency, funded_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          input.fundingSnapshotPublicId,
          renewal.funding_intent_id,
          invoiceReferenceId,
          paymentReferenceId,
          license.id,
          input.providerEventId,
          renewal.creator_reward_minor,
          renewal.platform_fee_minor,
          renewal.total_due_minor,
          renewal.currency,
          input.fundedAt,
        ],
      );
      await client.query(
        `INSERT INTO content_license_renewal_payables (
           public_id, content_license_renewal_id, creator_user_id, amount_minor, currency
         ) VALUES ($1,$2,$3,$4,$5)`,
        [
          input.payablePublicId,
          renewal.id,
          renewal.creator_user_id,
          renewal.creator_reward_minor,
          renewal.currency,
        ],
      );
      await client.query(
        `UPDATE content_license_renewal_funding_intents
            SET status = 'confirmed', completed_at = $2, version = version + 1 WHERE id = $1`,
        [renewal.funding_intent_id, renewal.server_now],
      );
      const nextVersion = renewal.version + 1;
      await client.query(
        `UPDATE content_license_renewals SET status = 'funded', funded_at = $2,
                version = $3, updated_at = $2 WHERE id = $1`,
        [renewal.id, renewal.server_now, nextVersion],
      );
      await client.query(
        `INSERT INTO content_license_renewal_history (
           content_license_renewal_id, from_status, to_status, renewal_version,
           actor_type, reason, occurred_at
         ) VALUES ($1,'funding_pending','funded',$2,'provider',
                   'Authoritative provider success activated renewal and full creator payable',$3)`,
        [renewal.id, nextVersion, renewal.server_now],
      );
      await this.appendAudit(client, {
        action: 'rights.renewal-funded',
        actorId: null,
        actorType: 'service',
        correlationId: input.correlationId,
        details: {
          creatorRewardMinor: renewal.creator_reward_minor,
          platformFeeMinor: renewal.platform_fee_minor,
          termStartsAt: license.activated_at.toISOString(),
          totalDueMinor: renewal.total_due_minor,
        },
        subjectId: renewal.id,
        subjectType: 'content-license-renewal',
      });
      return toLicense(license);
    });
  }

  async recordDueLicenseExpiryReminders(input: {
    correlationId: string;
    missionAssignmentId: string;
  }): Promise<LicenseExpiryReminderRecord[]> {
    return this.withTransaction(async (client) => {
      const due = await client.query<
        LicenseRow & { reminder_stage: '30_days' | '7_days' | '1_day'; server_now: Date }
      >(
        `SELECT id, public_id, mission_assignment_id, kind, status,
                base_reward_minor_snapshot, compensation_component_minor, currency,
                activated_at, expires_at, term_number, version, now() AS server_now,
                CASE
                  WHEN expires_at <= now() + interval '1 day' THEN '1_day'
                  WHEN expires_at <= now() + interval '7 days' THEN '7_days'
                  ELSE '30_days'
                END AS reminder_stage
           FROM content_licenses
          WHERE mission_assignment_id = $1 AND status = 'active'
            AND expires_at > now() AND expires_at <= now() + interval '30 days'
          ORDER BY kind, term_number FOR UPDATE`,
        [input.missionAssignmentId],
      );
      const recorded: LicenseExpiryReminderRecord[] = [];
      for (const license of due.rows) {
        const usagePolicyAtExpiry =
          license.kind === 'organic_owned_social_90d'
            ? 'archived_organic_nonboostable'
            : 'remove_active_placement';
        const inserted = await client.query(
          `INSERT INTO audit_events (
             actor_id, actor_type, action, correlation_id,
             subject_type, subject_id, details, occurred_at
           )
           SELECT NULL, 'service', 'rights.license-expiry-reminder-recorded', $2,
                  'content-license', $1,
                  jsonb_build_object(
                    'stage', $3::text,
                    'kind', $4::text,
                    'termNumber', $5::int,
                    'expiresAt', $6::timestamptz,
                    'usagePolicyAtExpiry', $7::text
                  ), $8::timestamptz
            WHERE NOT EXISTS (
              SELECT 1 FROM audit_events
               WHERE action = 'rights.license-expiry-reminder-recorded'
                 AND subject_type = 'content-license' AND subject_id = $1
                 AND details->>'stage' = $3::text
            )
            RETURNING id`,
          [
            license.id,
            input.correlationId,
            license.reminder_stage,
            license.kind,
            license.term_number ?? 1,
            license.expires_at,
            usagePolicyAtExpiry,
            license.server_now,
          ],
        );
        if (inserted.rowCount === 1) {
          recorded.push({
            contentLicenseId: license.id,
            expiresAt: license.expires_at,
            stage: license.reminder_stage,
          });
        }
      }
      return recorded;
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
                activated_at, expires_at, term_number, version, now() AS server_now
           FROM content_licenses
          WHERE mission_assignment_id = $1 AND status = 'active' AND expires_at <= now()
          ORDER BY kind, term_number FOR UPDATE`,
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
                     activated_at, expires_at, term_number, version`,
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
          usage_policy:
            | 'active_usage'
            | 'future_term'
            | 'archived_organic_nonboostable'
            | 'remove_active_placement';
        }
      >(
        `SELECT l.id, l.public_id, l.mission_assignment_id, l.kind, l.status,
                l.base_reward_minor_snapshot, l.compensation_component_minor, l.currency,
                l.activated_at, l.expires_at, l.term_number, l.version,
                array_agg(DISTINCT media.public_id ORDER BY media.public_id) AS asset_public_ids,
                array_agg(DISTINCT channel.channel::text ORDER BY channel.channel::text) AS channels,
                (l.status = 'active' AND now() >= l.activated_at AND now() < l.expires_at)
                  AS is_currently_usable,
                CASE
                  WHEN now() < l.activated_at THEN 'future_term'
                  WHEN l.status = 'active' AND now() < l.expires_at THEN 'active_usage'
                  WHEN l.kind = 'organic_owned_social_90d' THEN 'archived_organic_nonboostable'
                  ELSE 'remove_active_placement'
                END AS usage_policy
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
          ORDER BY l.kind, l.term_number`,
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
        usagePolicy: row.usage_policy,
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
