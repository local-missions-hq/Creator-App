import type {
  BusinessMembershipRole,
  CampaignRecord,
  IdentityProvider,
  IdentityTenantConflictCode,
  LocalityStatus,
  PayoutOnboardingStatus,
} from '@local-missions/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type UserRecord = {
  id: string;
  publicId: string;
  status: 'active' | 'disabled' | 'deletion_requested';
  version: number;
};

export type CreatorProfileRecord = {
  localityExpiresAt: Date | null;
  localityStatus: LocalityStatus;
  localityVerifiedAt: Date | null;
  payoutOnboardingStatus: PayoutOnboardingStatus;
  publicId: string;
  status: 'invited' | 'onboarding' | 'approved' | 'paused' | 'denied';
  userId: string;
  verifiedPostalArea: string | null;
  version: number;
};

export type BusinessLocationRecord = {
  addressLine1: string;
  addressLine2: string | null;
  businessId: string;
  city: string;
  id: string;
  isActive: boolean;
  name: string;
  postalCode: string;
  publicId: string;
  region: string;
  timezone: string;
  version: number;
};

export type VenueContactRecord = {
  businessId: string;
  businessLocationId: string;
  businessMembershipId: string;
  id: string;
  isPrimary: boolean;
  publicId: string;
  revokedAt: Date | null;
  status: 'active' | 'revoked';
  version: number;
};

export class IdentityTenantError extends Error {
  constructor(
    readonly code: IdentityTenantConflictCode,
    readonly httpStatus: 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityTenantError';
  }
}

type UserRow = QueryResultRow & {
  id: string;
  public_id: string;
  status: UserRecord['status'];
  version: number;
};

type CreatorProfileRow = QueryResultRow & {
  locality_expires_at: Date | null;
  locality_status: LocalityStatus;
  locality_verified_at: Date | null;
  payout_onboarding_status: PayoutOnboardingStatus;
  public_id: string;
  status: CreatorProfileRecord['status'];
  user_id: string;
  verified_postal_area: string | null;
  version: number;
};

type BusinessLocationRow = QueryResultRow & {
  address_line_1: string;
  address_line_2: string | null;
  business_id: string;
  city: string;
  id: string;
  is_active: boolean;
  name: string;
  postal_code: string;
  public_id: string;
  region: string;
  timezone: string;
  version: number;
};

type VenueContactRow = QueryResultRow & {
  business_id: string;
  business_location_id: string;
  business_membership_id: string;
  id: string;
  is_primary: boolean;
  public_id: string;
  revoked_at: Date | null;
  status: VenueContactRecord['status'];
  version: number;
};

type CampaignRow = QueryResultRow & {
  business_id: string;
  creator_reward_pool_minor: number;
  currency: string;
  id: string;
  platform_fee_minor: number;
  public_id: string;
  slot_count: number;
  status: CampaignRecord['status'];
  title: string;
  total_due_minor: number;
  version: number;
};

function toUserRecord(row: UserRow): UserRecord {
  return { id: row.id, publicId: row.public_id, status: row.status, version: row.version };
}

function toCreatorProfileRecord(row: CreatorProfileRow): CreatorProfileRecord {
  return {
    localityExpiresAt: row.locality_expires_at,
    localityStatus: row.locality_status,
    localityVerifiedAt: row.locality_verified_at,
    payoutOnboardingStatus: row.payout_onboarding_status,
    publicId: row.public_id,
    status: row.status,
    userId: row.user_id,
    verifiedPostalArea: row.verified_postal_area,
    version: row.version,
  };
}

function toBusinessLocationRecord(row: BusinessLocationRow): BusinessLocationRecord {
  return {
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    businessId: row.business_id,
    city: row.city,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    postalCode: row.postal_code,
    publicId: row.public_id,
    region: row.region,
    timezone: row.timezone,
    version: row.version,
  };
}

function toVenueContactRecord(row: VenueContactRow): VenueContactRecord {
  return {
    businessId: row.business_id,
    businessLocationId: row.business_location_id,
    businessMembershipId: row.business_membership_id,
    id: row.id,
    isPrimary: row.is_primary,
    publicId: row.public_id,
    revokedAt: row.revoked_at,
    status: row.status,
    version: row.version,
  };
}

function toCampaignRecord(row: CampaignRow): CampaignRecord {
  return {
    businessId: row.business_id,
    creatorRewardPoolMinor: row.creator_reward_pool_minor,
    currency: row.currency,
    id: row.id,
    platformFeeMinor: row.platform_fee_minor,
    publicId: row.public_id,
    slotCount: row.slot_count,
    status: row.status,
    title: row.title,
    totalDueMinor: row.total_due_minor,
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

export class IdentityTenantStore {
  private readonly quotedSchema: string;

  constructor(
    private readonly pool: Pool,
    schemaName = 'public',
  ) {
    this.quotedSchema = quoteSchema(schemaName);
  }

  async createUserWithIdentity(input: {
    correlationId: string;
    issuer: string;
    provider: IdentityProvider;
    publicId: string;
    subject: string;
  }): Promise<UserRecord> {
    try {
      return await this.withTransaction(async (client) => {
        const result = await client.query<UserRow>(
          `INSERT INTO users (public_id)
           VALUES ($1)
           RETURNING id, public_id, status, version`,
          [input.publicId],
        );
        const row = result.rows[0];
        if (!row) throw new Error('User insert returned no row.');
        const user = toUserRecord(row);

        await client.query(
          `INSERT INTO external_identities (user_id, provider, issuer, subject, verified_at)
           VALUES ($1, $2, $3, $4, now())`,
          [user.id, input.provider, input.issuer, input.subject],
        );
        await this.appendAudit(client, {
          action: 'user.created',
          actorId: user.id,
          correlationId: input.correlationId,
          details: { identityProvider: input.provider },
          subjectId: user.id,
          subjectType: 'user',
        });
        return user;
      });
    } catch (error) {
      const constraint = postgresConstraint(error);
      if (constraint === 'external_identities_issuer_subject_uq') {
        throw new IdentityTenantError(
          'IDENTITY_ALREADY_BOUND',
          409,
          'This provider identity is already bound to a Local Missions account.',
        );
      }
      if (constraint === 'users_public_id_uq') {
        throw new IdentityTenantError(
          'USER_PUBLIC_ID_EXISTS',
          409,
          'User public identifier already exists.',
        );
      }
      throw error;
    }
  }

  async linkIdentity(input: {
    actorUserId: string;
    correlationId: string;
    issuer: string;
    provider: IdentityProvider;
    subject: string;
  }): Promise<void> {
    try {
      await this.withTransaction(async (client) => {
        const user = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [
          input.actorUserId,
        ]);
        if (user.rowCount !== 1) {
          throw new IdentityTenantError('USER_NOT_FOUND', 404, 'User does not exist.');
        }
        await client.query(
          `INSERT INTO external_identities (user_id, provider, issuer, subject, verified_at)
           VALUES ($1, $2, $3, $4, now())`,
          [input.actorUserId, input.provider, input.issuer, input.subject],
        );
        await this.appendAudit(client, {
          action: 'identity.linked',
          actorId: input.actorUserId,
          correlationId: input.correlationId,
          details: { identityProvider: input.provider },
          subjectId: input.actorUserId,
          subjectType: 'user',
        });
      });
    } catch (error) {
      const constraint = postgresConstraint(error);
      if (constraint === 'external_identities_issuer_subject_uq') {
        throw new IdentityTenantError(
          'IDENTITY_ALREADY_BOUND',
          409,
          'This provider identity is already bound to a Local Missions account.',
        );
      }
      if (constraint === 'external_identities_user_provider_uq') {
        throw new IdentityTenantError(
          'USER_IDENTITY_PROVIDER_ALREADY_LINKED',
          409,
          'This Local Missions account already has that provider.',
        );
      }
      throw error;
    }
  }

  async createCreatorProfile(input: {
    correlationId: string;
    localityExpiresAt?: Date;
    localityStatus?: LocalityStatus;
    localityVerifiedAt?: Date;
    publicId: string;
    userId: string;
    verifiedPostalArea?: string;
  }): Promise<CreatorProfileRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<CreatorProfileRow>(
        `INSERT INTO creator_profiles (
           user_id, public_id, locality_status, verified_postal_area,
           locality_verified_at, locality_expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING user_id, public_id, status, locality_status, verified_postal_area,
                   locality_verified_at, locality_expires_at, payout_onboarding_status, version`,
        [
          input.userId,
          input.publicId,
          input.localityStatus ?? 'unverified',
          input.verifiedPostalArea ?? null,
          input.localityVerifiedAt ?? null,
          input.localityExpiresAt ?? null,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Creator profile insert returned no row.');
      const profile = toCreatorProfileRecord(row);
      await this.appendAudit(client, {
        action: 'creator-profile.created',
        actorId: input.userId,
        correlationId: input.correlationId,
        details: { localityStatus: profile.localityStatus },
        subjectId: input.userId,
        subjectType: 'creator-profile',
      });
      return profile;
    });
  }

  async createBusinessWithOwner(input: {
    correlationId: string;
    name: string;
    ownerUserId: string;
    publicId: string;
  }): Promise<string> {
    return this.withTransaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO businesses (public_id, name) VALUES ($1, $2) RETURNING id`,
        [input.publicId, input.name],
      );
      const business = result.rows[0];
      if (!business) throw new Error('Business insert returned no row.');
      await client.query(
        `INSERT INTO business_memberships (business_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')`,
        [business.id, input.ownerUserId],
      );
      await this.appendAudit(client, {
        action: 'business.created',
        actorId: input.ownerUserId,
        correlationId: input.correlationId,
        details: { ownerRole: 'owner' },
        subjectId: business.id,
        subjectType: 'business',
      });
      return business.id;
    });
  }

  async addBusinessMembership(input: {
    actorUserId: string;
    businessId: string;
    correlationId: string;
    role: BusinessMembershipRole;
    userId: string;
  }): Promise<void> {
    return this.withTransaction(async (client) => {
      await this.assertCanManageBusiness(client, input.businessId, input.actorUserId);
      await client.query(
        `INSERT INTO business_memberships (business_id, user_id, role, status)
         VALUES ($1, $2, $3, 'active')`,
        [input.businessId, input.userId, input.role],
      );
      await this.appendAudit(client, {
        action: 'business-membership.created',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { role: input.role, userId: input.userId },
        subjectId: input.businessId,
        subjectType: 'business',
      });
    });
  }

  async createBusinessLocation(input: {
    actorUserId: string;
    addressLine1: string;
    addressLine2?: string;
    businessId: string;
    city: string;
    correlationId: string;
    name: string;
    postalCode: string;
    publicId: string;
    region: string;
    timezone: string;
  }): Promise<BusinessLocationRecord> {
    return this.withTransaction(async (client) => {
      await this.assertCanManageBusiness(client, input.businessId, input.actorUserId);
      const result = await client.query<BusinessLocationRow>(
        `INSERT INTO business_locations (
           public_id, business_id, name, address_line_1, address_line_2,
           city, region, postal_code, timezone
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, public_id, business_id, name, address_line_1, address_line_2,
                   city, region, postal_code, timezone, is_active, version`,
        [
          input.publicId,
          input.businessId,
          input.name,
          input.addressLine1,
          input.addressLine2 ?? null,
          input.city,
          input.region,
          input.postalCode,
          input.timezone,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Business location insert returned no row.');
      const location = toBusinessLocationRecord(row);
      await this.appendAudit(client, {
        action: 'business-location.created',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { locationPublicId: location.publicId },
        subjectId: input.businessId,
        subjectType: 'business',
      });
      return location;
    });
  }

  async listBusinessLocations(input: {
    actorUserId: string;
    businessId: string;
  }): Promise<BusinessLocationRecord[]> {
    return this.withTransaction(async (client) => {
      await this.assertCanManageBusiness(client, input.businessId, input.actorUserId);
      const result = await client.query<BusinessLocationRow>(
        `SELECT id, public_id, business_id, name, address_line_1, address_line_2,
                city, region, postal_code, timezone, is_active, version
           FROM business_locations
          WHERE business_id = $1
          ORDER BY public_id`,
        [input.businessId],
      );
      return result.rows.map(toBusinessLocationRecord);
    });
  }

  async createVenueContact(input: {
    actorUserId: string;
    businessId: string;
    businessLocationId: string;
    businessMembershipId: string;
    correlationId: string;
    isPrimary: boolean;
    publicId: string;
  }): Promise<VenueContactRecord> {
    try {
      return await this.withTransaction(async (client) => {
        await this.assertCanManageBusiness(client, input.businessId, input.actorUserId);
        const scope = await client.query(
          `SELECT 1
             FROM business_locations location
             JOIN business_memberships membership
               ON membership.id = $3
              AND membership.business_id = location.business_id
              AND membership.status = 'active'
            WHERE location.id = $2 AND location.business_id = $1 AND location.is_active = true`,
          [input.businessId, input.businessLocationId, input.businessMembershipId],
        );
        if (scope.rowCount !== 1) {
          throw new IdentityTenantError(
            'BUSINESS_ACCESS_DENIED',
            403,
            'Venue contact scope is unavailable in this business workspace.',
          );
        }
        const result = await client.query<VenueContactRow>(
          `INSERT INTO venue_contacts (
             public_id, business_id, business_location_id, business_membership_id, is_primary
           ) VALUES ($1,$2,$3,$4,$5)
           RETURNING id, public_id, business_id, business_location_id,
                     business_membership_id, status, is_primary, revoked_at, version`,
          [
            input.publicId,
            input.businessId,
            input.businessLocationId,
            input.businessMembershipId,
            input.isPrimary,
          ],
        );
        const row = result.rows[0];
        if (!row) throw new Error('Venue contact insert returned no row.');
        await client.query(
          `INSERT INTO venue_contact_status_history (
             venue_contact_id, to_status, contact_version, actor_user_id, reason
           ) VALUES ($1,'active',$2,$3,'Venue contact assigned')`,
          [row.id, row.version, input.actorUserId],
        );
        await this.appendAudit(client, {
          action: 'venue-contact.created',
          actorId: input.actorUserId,
          correlationId: input.correlationId,
          details: {
            businessLocationId: input.businessLocationId,
            isPrimary: input.isPrimary,
          },
          subjectId: row.id,
          subjectType: 'venue-contact',
        });
        return toVenueContactRecord(row);
      });
    } catch (error) {
      const constraint = postgresConstraint(error);
      if (
        constraint === 'venue_contacts_active_primary_location_uq' ||
        constraint === 'venue_contacts_active_location_member_uq' ||
        constraint === 'venue_contacts_public_id_uq'
      ) {
        throw new IdentityTenantError(
          'VENUE_CONTACT_CONFLICT',
          409,
          'The venue contact conflicts with current state.',
        );
      }
      throw error;
    }
  }

  async revokeVenueContact(input: {
    actorUserId: string;
    correlationId: string;
    expectedVersion: number;
    venueContactId: string;
  }): Promise<VenueContactRecord> {
    return this.withTransaction(async (client) => {
      const current = await client.query<VenueContactRow>(
        `SELECT id, public_id, business_id, business_location_id, business_membership_id,
                status, is_primary, revoked_at, version
           FROM venue_contacts WHERE id = $1 FOR UPDATE`,
        [input.venueContactId],
      );
      const contact = current.rows[0];
      if (!contact) {
        throw new IdentityTenantError(
          'VENUE_CONTACT_CONFLICT',
          409,
          'The venue contact conflicts with current state.',
        );
      }
      await this.assertCanManageBusiness(client, contact.business_id, input.actorUserId);
      const result = await client.query<VenueContactRow>(
        `UPDATE venue_contacts
            SET status = 'revoked', revoked_at = now(), version = version + 1, updated_at = now()
          WHERE id = $1 AND status = 'active' AND version = $2
          RETURNING id, public_id, business_id, business_location_id,
                    business_membership_id, status, is_primary, revoked_at, version`,
        [input.venueContactId, input.expectedVersion],
      );
      const row = result.rows[0];
      if (!row) {
        throw new IdentityTenantError(
          'VENUE_CONTACT_CONFLICT',
          409,
          'The venue contact conflicts with current state.',
        );
      }
      await client.query(
        `INSERT INTO venue_contact_status_history (
           venue_contact_id, from_status, to_status, contact_version, actor_user_id, reason
         ) VALUES ($1,'active','revoked',$2,$3,'Venue contact revoked')`,
        [row.id, row.version, input.actorUserId],
      );
      await this.appendAudit(client, {
        action: 'venue-contact.revoked',
        actorId: input.actorUserId,
        correlationId: input.correlationId,
        details: { businessLocationId: row.business_location_id },
        subjectId: row.id,
        subjectType: 'venue-contact',
      });
      return toVenueContactRecord(row);
    });
  }

  async getCampaignForMember(input: {
    actorUserId: string;
    campaignId: string;
  }): Promise<CampaignRecord | null> {
    return this.withTransaction(async (client) => {
      const result = await client.query<CampaignRow>(
        `SELECT c.id, c.public_id, c.business_id, c.title, c.status,
                c.creator_reward_pool_minor, c.platform_fee_minor, c.total_due_minor,
                c.currency, c.slot_count, c.version
           FROM campaigns c
           JOIN business_memberships m
             ON m.business_id = c.business_id
            AND m.user_id = $2
            AND m.status = 'active'
            AND m.role IN ('owner', 'manager')
          WHERE c.id = $1`,
        [input.campaignId, input.actorUserId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new IdentityTenantError(
          'BUSINESS_ACCESS_DENIED',
          403,
          'Campaign is unavailable in the active business workspace.',
        );
      }
      return toCampaignRecord(row);
    });
  }

  private async assertCanManageBusiness(
    client: PoolClient,
    businessId: string,
    actorUserId: string,
  ): Promise<void> {
    const membership = await client.query(
      `SELECT 1
         FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
          AND status = 'active'
          AND role IN ('owner', 'manager')`,
      [businessId, actorUserId],
    );
    if (membership.rowCount !== 1) {
      throw new IdentityTenantError(
        'BUSINESS_ACCESS_DENIED',
        403,
        'The active user cannot manage this business workspace.',
      );
    }
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
