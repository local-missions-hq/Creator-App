import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import type {
  AccountIdentityMutationResponse,
  AccountOverview,
  AccountRequestMutationResponse,
  AuthenticatedContext,
  AuthenticatedRole,
  BusinessCampaignDetail,
  BusinessCampaignPage,
  BusinessCampaignSummary,
  BusinessReachOptions,
  CreateAccountRequest,
  CreatorProfileStatus,
  CreatorMissionDetail,
  CreatorMissionPage,
  CreatorMissionSummary,
  CreatorReachOverview,
  IdentityProvider,
  LinkAccountIdentityRequest,
  MissionApplicationResponse,
  LocalityStatus,
  ReachCapabilityStatus,
  RevokeAccountSessionResponse,
  SocialPlatform,
  UnlinkAccountIdentityRequest,
} from '@local-missions/contracts';
import {
  AccountLifecycleError,
  AccountLifecycleStore,
  MissionApplicationError,
  MissionApplicationStore,
  ReachQualificationError,
  ReachQualificationStore,
} from '@local-missions/db';
import type { QueryResultRow } from 'pg';
import { z } from 'zod';

import { ApiProblem, dependencyUnavailable, validationProblem } from './api-errors.js';
import { AuthenticationService, type VerifiedBearerIdentity } from './authentication.js';
import type { ContextualRequest } from './api-context.js';
import { DatabaseService } from './database.service.js';
import {
  PROVIDER_CONTROL_PROOF_VERIFIER,
  type ProviderControlProofVerifier,
} from './provider-control-proof.js';

type AuthenticatedPrincipal = {
  businessId: string | null;
  context: AuthenticatedContext;
  userId: string;
};

type MissionRow = QueryResultRow & {
  available_community_slots: number;
  base_reward_minor: number;
  business_name: string;
  city: string;
  created_at: Date;
  currency: string;
  public_id: string;
  region: string;
  title: string;
  total_community_slots: number;
  venue_name: string;
};

type CampaignRow = QueryResultRow & {
  available_community_slots: number;
  created_at: Date;
  creator_reward_pool_minor: number;
  currency: string;
  platform_fee_minor: number;
  public_id: string;
  slot_count: number;
  status: BusinessCampaignSummary['status'];
  title: string;
  total_due_minor: number;
  version: number;
};

const cursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  publicId: z.string().min(1).max(120),
  v: z.literal(1),
});

function encodeCursor(row: { created_at: Date; public_id: string }): string {
  return Buffer.from(
    JSON.stringify({ createdAt: row.created_at.toISOString(), publicId: row.public_id, v: 1 }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(value: string | undefined) {
  if (!value) return undefined;
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
  } catch {
    throw validationProblem(
      [{ code: 'custom', message: 'Invalid cursor.', path: ['cursor'] }],
      'query',
    );
  }
}

function toMissionSummary(row: MissionRow): CreatorMissionSummary {
  return {
    availableCommunitySlots: row.available_community_slots,
    baseRewardMinor: row.base_reward_minor,
    businessName: row.business_name,
    currency: row.currency,
    publicId: row.public_id,
    title: row.title,
    totalCommunitySlots: row.total_community_slots,
    venue: { city: row.city, name: row.venue_name, region: row.region },
  };
}

function toCampaignSummary(row: CampaignRow): BusinessCampaignSummary {
  return {
    availableCommunitySlots: row.available_community_slots,
    creatorRewardPoolMinor: row.creator_reward_pool_minor,
    currency: row.currency,
    platformFeeMinor: row.platform_fee_minor,
    publicId: row.public_id,
    slotCount: row.slot_count,
    status: row.status,
    title: row.title,
    totalDueMinor: row.total_due_minor,
    version: row.version,
  };
}

@Injectable()
export class DomainApiService {
  constructor(
    @Inject(AuthenticationService) private readonly authentication: AuthenticationService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PROVIDER_CONTROL_PROOF_VERIFIER)
    private readonly providerProofs: ProviderControlProofVerifier,
  ) {}

  async authenticate(request: ContextualRequest): Promise<AuthenticatedPrincipal> {
    const identity = await this.authentication.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    try {
      return await this.resolvePrincipal(identity);
    } catch (error) {
      if (error instanceof ApiProblem) throw error;
      throw dependencyUnavailable();
    }
  }

  requireRole(principal: AuthenticatedPrincipal, roles: readonly AuthenticatedRole[]): void {
    if (!roles.includes(principal.context.role)) {
      throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
    }
  }

  async getAccountOverview(principal: AuthenticatedPrincipal): Promise<AccountOverview> {
    const pool = this.database.requirePool();
    const [identities, sessions, requests, hold] = await Promise.all([
      pool.query<{
        provider: AccountOverview['identities'][number]['provider'];
        verified_at: Date;
      }>(
        `SELECT provider, verified_at
           FROM external_identities
          WHERE user_id = $1 AND status = 'active'
          ORDER BY verified_at, provider`,
        [principal.userId],
      ),
      pool.query<{
        authenticated_at: Date;
        expires_at: Date;
        provider: AccountOverview['sessions'][number]['provider'];
        public_id: string;
      }>(
        `SELECT session.public_id, identity.provider,
                session.authenticated_at, session.expires_at
           FROM account_sessions session
           JOIN external_identities identity ON identity.id = session.external_identity_id
          WHERE session.user_id = $1 AND session.status = 'active'
            AND session.expires_at > now()
          ORDER BY session.authenticated_at DESC`,
        [principal.userId],
      ),
      pool.query<{
        public_id: string;
        requested_at: Date;
        status: AccountOverview['requests'][number]['status'];
        type: AccountOverview['requests'][number]['type'];
      }>(
        `SELECT public_id, type, status, requested_at
           FROM account_requests
          WHERE user_id = $1
          ORDER BY requested_at DESC
          LIMIT 20`,
        [principal.userId],
      ),
      pool.query(
        `SELECT 1 FROM account_sensitive_holds
          WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [principal.userId],
      ),
    ]);

    return {
      identities: identities.rows.map((identity) => ({
        provider: identity.provider,
        status: 'active',
        verifiedAt: identity.verified_at.toISOString(),
      })),
      requests: requests.rows.map((request) => ({
        publicId: request.public_id,
        requestedAt: request.requested_at.toISOString(),
        status: request.status,
        type: request.type,
      })),
      role: principal.context.role,
      sensitiveHoldActive: hold.rowCount === 1,
      sessions: sessions.rows.map((session) => ({
        authenticatedAt: session.authenticated_at.toISOString(),
        expiresAt: session.expires_at.toISOString(),
        provider: session.provider,
        publicId: session.public_id,
        status: 'active',
      })),
      status: 'active',
      userPublicId: principal.context.userPublicId,
    };
  }

  async linkAccountIdentity(
    principal: AuthenticatedPrincipal,
    input: LinkAccountIdentityRequest,
    correlationId: string,
  ): Promise<AccountIdentityMutationResponse> {
    try {
      const proof = await this.providerProofs.verify(
        input.providerProofToken,
        principal.context.userPublicId,
      );
      const grantId = await this.resolveRecentAuthGrantId(
        principal.userId,
        input.recentAuthGrantPublicId,
      );
      await new AccountLifecycleStore(this.database.requirePool()).linkIdentity({
        correlationId,
        grantId,
        issuer: proof.issuer,
        provider: proof.provider,
        subject: proof.subject,
        userId: principal.userId,
      });
      return { provider: proof.provider, status: 'active' };
    } catch (error) {
      this.throwAccountProblem(error);
    }
  }

  async unlinkAccountIdentity(
    principal: AuthenticatedPrincipal,
    provider: IdentityProvider,
    input: UnlinkAccountIdentityRequest,
    correlationId: string,
  ): Promise<AccountIdentityMutationResponse> {
    try {
      const [externalIdentityId, grantId] = await Promise.all([
        this.resolveExternalIdentityId(principal.userId, provider),
        this.resolveRecentAuthGrantId(principal.userId, input.recentAuthGrantPublicId),
      ]);
      await new AccountLifecycleStore(this.database.requirePool()).unlinkIdentity({
        correlationId,
        externalIdentityId,
        grantId,
        userId: principal.userId,
      });
      return { provider, status: 'revoked' };
    } catch (error) {
      this.throwAccountProblem(error);
    }
  }

  async revokeAccountSession(
    principal: AuthenticatedPrincipal,
    sessionPublicId: string,
    correlationId: string,
  ): Promise<RevokeAccountSessionResponse> {
    try {
      const sessionId = await this.resolveAccountSessionId(principal.userId, sessionPublicId);
      const revokedSessionPublicId = await new AccountLifecycleStore(
        this.database.requirePool(),
      ).revokeSession({
        correlationId,
        sessionId,
        userId: principal.userId,
      });
      return { sessionPublicId: revokedSessionPublicId, status: 'revoked' };
    } catch (error) {
      this.throwAccountProblem(error);
    }
  }

  async createAccountRequest(
    principal: AuthenticatedPrincipal,
    input: CreateAccountRequest,
    correlationId: string,
  ): Promise<AccountRequestMutationResponse> {
    try {
      const sessionId = await this.resolveAccountSessionId(principal.userId, input.sessionPublicId);
      const grantId = input.recentAuthGrantPublicId
        ? await this.resolveRecentAuthGrantId(principal.userId, input.recentAuthGrantPublicId)
        : undefined;
      await new AccountLifecycleStore(this.database.requirePool()).requestAccountAction({
        correlationId,
        ...(grantId ? { grantId } : {}),
        publicId: input.publicId,
        sessionId,
        type: input.type,
        userId: principal.userId,
      });
      return { publicId: input.publicId, status: 'requested', type: input.type };
    } catch (error) {
      this.throwAccountProblem(error);
    }
  }

  async getCreatorReach(principal: AuthenticatedPrincipal): Promise<CreatorReachOverview> {
    this.requireRole(principal, ['creator']);
    const platforms = ['instagram', 'tiktok', 'youtube'] as const;
    const state = await this.database.requirePool().query<{
      consent_status: 'active' | 'revoked' | null;
      platform: SocialPlatform;
      status: ReachCapabilityStatus;
    }>(
      `SELECT capability.platform, capability.status, consent.status AS consent_status
         FROM reach_platform_capabilities capability
         LEFT JOIN reach_analytics_consents consent
           ON consent.platform = capability.platform AND consent.creator_user_id = $1
        ORDER BY array_position(
          ARRAY['instagram','tiktok','youtube']::text[], capability.platform::text
        )`,
      [principal.userId],
    );
    const byPlatform = new Map(state.rows.map((row) => [row.platform, row]));
    const store = new ReachQualificationStore(this.database.requirePool());
    return {
      communityAccessIndependent: true,
      platforms: await Promise.all(
        platforms.map(async (platform) => {
          const row = byPlatform.get(platform);
          const qualification = await store.getCreatorQualification({
            actorUserId: principal.userId,
            platform,
          });
          return {
            capabilityStatus: row?.status ?? 'disabled',
            connectionAvailable: row?.status === 'enabled',
            consentStatus: row?.consent_status ?? null,
            platform,
            qualification: qualification
              ? {
                  ...qualification,
                  expiresAt: qualification.expiresAt.toISOString(),
                  verifiedAt: qualification.verifiedAt.toISOString(),
                }
              : null,
          };
        }),
      ),
    };
  }

  async grantCreatorReachConsent(
    principal: AuthenticatedPrincipal,
    platform: SocialPlatform,
    correlationId: string,
  ): Promise<CreatorReachOverview> {
    this.requireRole(principal, ['creator']);
    try {
      await new ReachQualificationStore(this.database.requirePool()).setConsent({
        actorUserId: principal.userId,
        consentVersion: 'reach-consent-v1',
        correlationId,
        platform,
        publicId: `rcs_${randomUUID()}`,
      });
      return this.getCreatorReach(principal);
    } catch (error) {
      this.throwReachProblem(error);
    }
  }

  async revokeCreatorReachConsent(
    principal: AuthenticatedPrincipal,
    platform: SocialPlatform,
    correlationId: string,
  ): Promise<CreatorReachOverview> {
    this.requireRole(principal, ['creator']);
    try {
      await new ReachQualificationStore(this.database.requirePool()).revokeConsent({
        actorUserId: principal.userId,
        correlationId,
        platform,
      });
      return this.getCreatorReach(principal);
    } catch (error) {
      this.throwReachProblem(error);
    }
  }

  async getBusinessReachOptions(principal: AuthenticatedPrincipal): Promise<BusinessReachOptions> {
    this.requireRole(principal, ['business_owner', 'business_manager']);
    if (!principal.businessId) throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
    const result = await this.database.requirePool().query<{
      platform: SocialPlatform;
      status: ReachCapabilityStatus;
    }>(
      `SELECT platform, status FROM reach_platform_capabilities
        ORDER BY array_position(ARRAY['instagram','tiktok','youtube']::text[], platform::text)`,
    );
    return {
      communityMinimumPercent: 80,
      packages: [
        { bonusMultiplierBps: 5_000, creatorRewardMultiplierBps: 15_000, level: 'level_1' },
        { bonusMultiplierBps: 10_000, creatorRewardMultiplierBps: 20_000, level: 'level_2' },
        { bonusMultiplierBps: 20_000, creatorRewardMultiplierBps: 30_000, level: 'level_3' },
      ],
      platforms: result.rows.map((row) => ({
        bookingAvailable: row.status === 'enabled',
        capabilityStatus: row.status,
        platform: row.platform,
      })),
      rawAudienceFiltersAllowed: false,
    };
  }

  async listCreatorMissions(
    principal: AuthenticatedPrincipal,
    limit: number,
    cursorValue?: string,
  ): Promise<CreatorMissionPage> {
    this.requireRole(principal, ['creator']);
    const cursor = decodeCursor(cursorValue);
    const result = await this.database.requirePool().query<MissionRow>(
      `SELECT c.public_id, c.title, c.currency, c.created_at, b.name AS business_name,
              location.name AS venue_name, location.city, location.region,
              min(slot.base_reward_minor)::integer AS base_reward_minor,
              count(*) FILTER (WHERE slot.type = 'community')::integer AS total_community_slots,
              count(*) FILTER (
                WHERE slot.type = 'community' AND slot.status = 'available'
              )::integer AS available_community_slots
         FROM campaigns c
         JOIN businesses b ON b.id = c.business_id
         JOIN mission_slots slot ON slot.campaign_id = c.id
         JOIN LATERAL (
           SELECT name, city, region FROM business_locations
            WHERE business_id = c.business_id AND is_active = true
            ORDER BY public_id LIMIT 1
         ) location ON true
        WHERE c.status = 'published'
          AND ($1::timestamptz IS NULL OR (c.created_at, c.public_id) < ($1, $2))
        GROUP BY c.id, b.name, location.name, location.city, location.region
       HAVING count(*) FILTER (
                WHERE slot.type = 'community' AND slot.status = 'available'
              ) > 0
        ORDER BY c.created_at DESC, c.public_id DESC
        LIMIT $3`,
      [cursor?.createdAt ?? null, cursor?.publicId ?? null, limit + 1],
    );
    const hasMore = result.rows.length > limit;
    const selected = result.rows.slice(0, limit);
    const last = selected.at(-1);
    return {
      data: selected.map(toMissionSummary),
      page: {
        hasMore,
        limit,
        nextCursor: hasMore && last ? encodeCursor(last) : null,
      },
    };
  }

  async getCreatorMission(
    principal: AuthenticatedPrincipal,
    campaignPublicId: string,
  ): Promise<CreatorMissionDetail> {
    this.requireRole(principal, ['creator']);
    const result = await this.database.requirePool().query<
      MissionRow & {
        brief: string;
        checklist: Record<string, unknown>;
      }
    >(
      `SELECT c.public_id, c.title, c.currency, c.created_at, b.name AS business_name,
              location.name AS venue_name, location.city, location.region,
              min(slot.base_reward_minor)::integer AS base_reward_minor,
              count(*) FILTER (WHERE slot.type = 'community')::integer AS total_community_slots,
              count(*) FILTER (
                WHERE slot.type = 'community' AND slot.status = 'available'
              )::integer AS available_community_slots,
              brief.plain_language_brief AS brief, brief.checklist
         FROM campaigns c
         JOIN businesses b ON b.id = c.business_id
         JOIN mission_slots slot ON slot.campaign_id = c.id
         JOIN LATERAL (
           SELECT name, city, region FROM business_locations
            WHERE business_id = c.business_id AND is_active = true
            ORDER BY public_id LIMIT 1
         ) location ON true
         JOIN LATERAL (
           SELECT id, plain_language_brief, checklist FROM campaign_brief_versions
            WHERE campaign_id = c.id ORDER BY version DESC LIMIT 1
         ) brief ON true
        WHERE c.public_id = $1 AND c.status = 'published'
        GROUP BY c.id, b.name, location.name, location.city, location.region,
                 brief.id, brief.plain_language_brief, brief.checklist`,
      [campaignPublicId],
    );
    const row = result.rows[0];
    if (!row) throw new ApiProblem('NOT_FOUND', 'The requested resource was not found.', 404);
    const requirements = await this.database.requirePool().query<{
      objective_description: string;
      ordinal: number;
      required_count: number;
      type: CreatorMissionDetail['requirements'][number]['type'];
    }>(
      `SELECT requirement.ordinal, requirement.type, requirement.required_count,
              requirement.objective_description
         FROM deliverable_requirements requirement
         JOIN campaign_brief_versions brief
           ON brief.id = requirement.campaign_brief_version_id
         JOIN campaigns c ON c.id = brief.campaign_id
        WHERE c.public_id = $1
          AND brief.version = (
            SELECT max(version) FROM campaign_brief_versions WHERE campaign_id = c.id
          )
        ORDER BY requirement.ordinal`,
      [campaignPublicId],
    );
    return {
      ...toMissionSummary(row),
      brief: row.brief,
      checklist: row.checklist,
      requirements: requirements.rows.map((requirement) => ({
        description: requirement.objective_description,
        ordinal: requirement.ordinal,
        requiredCount: requirement.required_count,
        type: requirement.type,
      })),
    };
  }

  async applyForMission(input: {
    campaignPublicId: string;
    correlationId: string;
    idempotencyKey: string;
    principal: AuthenticatedPrincipal;
    publicId: string;
  }): Promise<MissionApplicationResponse> {
    this.requireRole(input.principal, ['creator']);
    const campaign = await this.database
      .requirePool()
      .query<{ id: string }>(`SELECT id FROM campaigns WHERE public_id = $1`, [
        input.campaignPublicId,
      ]);
    const campaignId = campaign.rows[0]?.id;
    if (!campaignId)
      throw new ApiProblem('NOT_FOUND', 'The requested resource was not found.', 404);
    try {
      const application = await new MissionApplicationStore(
        this.database.requirePool(),
      ).applyForCommunityMission({
        campaignId,
        correlationId: input.correlationId,
        creatorUserId: input.principal.userId,
        idempotencyKey: input.idempotencyKey,
        publicId: input.publicId,
      });
      return {
        applicationPublicId: application.publicId,
        campaignPublicId: input.campaignPublicId,
        slotType: application.slotType,
        status: application.status,
        version: application.version,
      };
    } catch (error) {
      if (error instanceof MissionApplicationError) {
        throw new ApiProblem(
          error.httpStatus === 403 ? 'ACCESS_DENIED' : 'STATE_CONFLICT',
          error.httpStatus === 403
            ? 'Access is denied.'
            : 'The request conflicts with current state.',
          error.httpStatus,
        );
      }
      throw dependencyUnavailable();
    }
  }

  async listBusinessCampaigns(
    principal: AuthenticatedPrincipal,
    limit: number,
    cursorValue?: string,
  ): Promise<BusinessCampaignPage> {
    this.requireRole(principal, ['business_owner', 'business_manager']);
    if (!principal.businessId) throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
    const cursor = decodeCursor(cursorValue);
    const result = await this.database.requirePool().query<CampaignRow>(
      `SELECT c.public_id, c.title, c.status, c.creator_reward_pool_minor,
              c.platform_fee_minor, c.total_due_minor, c.currency, c.slot_count,
              c.version, c.created_at,
              count(slot.id) FILTER (
                WHERE slot.type = 'community' AND slot.status = 'available'
              )::integer AS available_community_slots
         FROM campaigns c
         LEFT JOIN mission_slots slot ON slot.campaign_id = c.id
        WHERE c.business_id = $1
          AND ($2::timestamptz IS NULL OR (c.created_at, c.public_id) < ($2, $3))
        GROUP BY c.id
        ORDER BY c.created_at DESC, c.public_id DESC
        LIMIT $4`,
      [principal.businessId, cursor?.createdAt ?? null, cursor?.publicId ?? null, limit + 1],
    );
    const hasMore = result.rows.length > limit;
    const selected = result.rows.slice(0, limit);
    const last = selected.at(-1);
    return {
      data: selected.map(toCampaignSummary),
      page: {
        hasMore,
        limit,
        nextCursor: hasMore && last ? encodeCursor(last) : null,
      },
    };
  }

  async getBusinessCampaign(
    principal: AuthenticatedPrincipal,
    campaignPublicId: string,
  ): Promise<BusinessCampaignDetail> {
    this.requireRole(principal, ['business_owner', 'business_manager']);
    if (!principal.businessId) throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
    const result = await this.database.requirePool().query<
      CampaignRow & {
        brief: string | null;
        submitted_applications: number;
      }
    >(
      `SELECT c.public_id, c.title, c.status, c.creator_reward_pool_minor,
              c.platform_fee_minor, c.total_due_minor, c.currency, c.slot_count,
              c.version, c.created_at,
              count(DISTINCT slot.id) FILTER (
                WHERE slot.type = 'community' AND slot.status = 'available'
              )::integer AS available_community_slots,
              count(DISTINCT application.id) FILTER (
                WHERE application.status = 'submitted'
              )::integer AS submitted_applications,
              brief.plain_language_brief AS brief
         FROM campaigns c
         LEFT JOIN mission_slots slot ON slot.campaign_id = c.id
         LEFT JOIN mission_applications application ON application.campaign_id = c.id
         LEFT JOIN LATERAL (
           SELECT plain_language_brief FROM campaign_brief_versions
            WHERE campaign_id = c.id ORDER BY version DESC LIMIT 1
         ) brief ON true
        WHERE c.business_id = $1 AND c.public_id = $2
        GROUP BY c.id, brief.plain_language_brief`,
      [principal.businessId, campaignPublicId],
    );
    const row = result.rows[0];
    if (!row) throw new ApiProblem('NOT_FOUND', 'The requested resource was not found.', 404);
    return {
      ...toCampaignSummary(row),
      brief: row.brief,
      submittedApplications: row.submitted_applications,
    };
  }

  private async resolvePrincipal(
    identity: VerifiedBearerIdentity,
  ): Promise<AuthenticatedPrincipal> {
    const pool = this.database.requirePool();
    const user = await pool.query<{ id: string; public_id: string; status: string }>(
      `SELECT id, public_id, status FROM users WHERE public_id = $1`,
      [identity.subjectPublicId],
    );
    const row = user.rows[0];
    if (!row) throw new ApiProblem('AUTHENTICATION_REQUIRED', 'Authentication is required.', 401);
    if (row.status !== 'active') throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);

    if (identity.role === 'creator') {
      const profile = await pool.query<{
        locality_expires_at: Date | null;
        locality_status: LocalityStatus;
        public_id: string;
        status: CreatorProfileStatus;
      }>(
        `SELECT public_id, status, locality_status, locality_expires_at
           FROM creator_profiles WHERE user_id = $1`,
        [row.id],
      );
      const creator = profile.rows[0];
      if (!creator) throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
      return {
        businessId: null,
        context: {
          business: null,
          creator: {
            locality: {
              expiresAt: creator.locality_expires_at?.toISOString() ?? null,
              status: creator.locality_status,
            },
            profilePublicId: creator.public_id,
            status: creator.status,
          },
          role: 'creator',
          userPublicId: row.public_id,
        },
        userId: row.id,
      };
    }

    if (!identity.tenantPublicId) throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
    const expectedMembershipRole = identity.role === 'business_owner' ? 'owner' : 'manager';
    const business = await pool.query<{
      id: string;
      membership_role: 'owner' | 'manager';
      name: string;
      public_id: string;
    }>(
      `SELECT b.id, b.public_id, b.name, membership.role AS membership_role
         FROM businesses b
         JOIN business_memberships membership
           ON membership.business_id = b.id
          AND membership.user_id = $1
          AND membership.status = 'active'
        WHERE b.public_id = $2 AND membership.role = $3`,
      [row.id, identity.tenantPublicId, expectedMembershipRole],
    );
    const workspace = business.rows[0];
    if (!workspace) throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
    return {
      businessId: workspace.id,
      context: {
        business: {
          membershipRole: workspace.membership_role,
          name: workspace.name,
          publicId: workspace.public_id,
        },
        creator: null,
        role: identity.role,
        userPublicId: row.public_id,
      },
      userId: row.id,
    };
  }

  private async resolveAccountSessionId(userId: string, publicId: string): Promise<string> {
    const result = await this.database.requirePool().query<{ id: string }>(
      `SELECT id FROM account_sessions
        WHERE user_id = $1 AND public_id = $2 AND status = 'active' AND expires_at > now()`,
      [userId, publicId],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
    return id;
  }

  private async resolveRecentAuthGrantId(userId: string, publicId: string): Promise<string> {
    const result = await this.database.requirePool().query<{ id: string }>(
      `SELECT id FROM recent_auth_grants
        WHERE user_id = $1 AND public_id = $2 AND consumed_at IS NULL AND expires_at > now()`,
      [userId, publicId],
    );
    const id = result.rows[0]?.id;
    if (!id) {
      throw new ApiProblem(
        'STATE_CONFLICT',
        'A fresh, single-use recent-authentication proof is required.',
        409,
      );
    }
    return id;
  }

  private async resolveExternalIdentityId(
    userId: string,
    provider: IdentityProvider,
  ): Promise<string> {
    const result = await this.database.requirePool().query<{ id: string }>(
      `SELECT id FROM external_identities
        WHERE user_id = $1 AND provider = $2 AND status = 'active'`,
      [userId, provider],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new ApiProblem('ACCESS_DENIED', 'Access is denied.', 403);
    return id;
  }

  private throwAccountProblem(error: unknown): never {
    if (error instanceof ApiProblem) throw error;
    if (error instanceof AccountLifecycleError) {
      throw new ApiProblem(
        error.httpStatus === 403 ? 'ACCESS_DENIED' : 'STATE_CONFLICT',
        error.message,
        error.httpStatus,
      );
    }
    throw dependencyUnavailable();
  }

  private throwReachProblem(error: unknown): never {
    if (error instanceof ReachQualificationError) {
      throw new ApiProblem(
        error.httpStatus === 403 ? 'ACCESS_DENIED' : 'STATE_CONFLICT',
        error.httpStatus === 403
          ? 'Access is denied.'
          : 'The request conflicts with current state.',
        error.httpStatus,
      );
    }
    throw dependencyUnavailable();
  }
}
