import { decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey, type JWTPayload } from 'jose';

import {
  availableModes,
  persistedSessionFromRuntime,
  type AuthenticatedMobileSession,
  type MobileAccountStatus,
  type MobileMode,
  type MobileRole,
  type MobileSessionStorage,
  type PersistedMobileSession,
} from './auth-session';
import type { OidcCallbackResult, OidcProviderIntent } from './oidc-client';

export type OidcTokenSet = {
  accessToken: string;
  expiresInSeconds: number;
  idToken?: string;
  refreshCredential?: string;
  tokenType: 'Bearer';
};

export interface OidcTokenEndpoint {
  exchangeCode(input: {
    clientId: string;
    code: string;
    redirectUri: string;
    verifier: string;
  }): Promise<OidcTokenSet>;
  refresh(input: { clientId: string; refreshCredential: string }): Promise<OidcTokenSet>;
}

export type VerifiedOidcIdToken = {
  expiresAt: string;
  issuer: string;
  subject: string;
};

export interface OidcIdTokenVerifier {
  verify(input: {
    expectedNonce: string;
    idToken: string;
    now?: Date;
  }): Promise<VerifiedOidcIdToken>;
}

export type MobileSessionBootstrap = {
  accountStatus: MobileAccountStatus;
  expiresAt: string;
  provider: OidcProviderIntent;
  roles: MobileRole[];
  sessionPublicId: string;
  userPublicId: string;
  workspacePublicId?: string;
  workspaceRole?: 'business_manager' | 'business_owner';
};

export interface MobileSessionBootstrapBoundary {
  bootstrap(input: { accessToken: string }): Promise<MobileSessionBootstrap>;
  refresh(input: { accessToken: string; sessionPublicId: string }): Promise<MobileSessionBootstrap>;
}

export class OidcSessionExchangeError extends Error {
  constructor(
    readonly code:
      | 'OIDC_EXCHANGE_FAILED'
      | 'OIDC_ID_TOKEN_INVALID'
      | 'OIDC_REFRESH_FAILED'
      | 'OIDC_SESSION_INVALID',
  ) {
    super('The secure sign-in session could not be completed.');
  }
}

export class UnavailableOidcTokenEndpoint implements OidcTokenEndpoint {
  async exchangeCode(): Promise<OidcTokenSet> {
    throw new OidcSessionExchangeError('OIDC_EXCHANGE_FAILED');
  }

  async refresh(): Promise<OidcTokenSet> {
    throw new OidcSessionExchangeError('OIDC_REFRESH_FAILED');
  }
}

const opaquePattern = /^[A-Za-z0-9._~-]{32,8000}$/;
const noncePattern = /^[A-Za-z0-9_-]{43,128}$/;
const allowedProviders = new Set(['apple', 'google', 'microsoft', 'passwordless_email']);
const allowedRoles = new Set(['business_manager', 'business_owner', 'creator', 'venue_staff']);
const publicIdPatterns = {
  session: /^ses_[a-z0-9_]{8,100}$/,
  user: /^usr_[a-z0-9_]{8,100}$/,
  workspace: /^biz_[a-z0-9_]{8,100}$/,
};

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function safeTokenSet(value: OidcTokenSet, requireIdToken: boolean): OidcTokenSet {
  if (
    value.tokenType !== 'Bearer' ||
    !opaquePattern.test(value.accessToken) ||
    !Number.isInteger(value.expiresInSeconds) ||
    value.expiresInSeconds < 60 ||
    value.expiresInSeconds > 86_400 ||
    (requireIdToken && !value.idToken) ||
    (value.idToken !== undefined && !opaquePattern.test(value.idToken)) ||
    (value.refreshCredential !== undefined && !opaquePattern.test(value.refreshCredential))
  ) {
    throw new OidcSessionExchangeError('OIDC_EXCHANGE_FAILED');
  }
  return value;
}

function safeBootstrap(value: MobileSessionBootstrap, now = new Date()): MobileSessionBootstrap {
  const modes = availableModes(value.roles);
  const hasBusinessRole = value.roles.some(
    (role) => role === 'business_manager' || role === 'business_owner',
  );
  if (
    value.accountStatus !== 'active' ||
    !allowedProviders.has(value.provider) ||
    value.roles.length === 0 ||
    value.roles.some((role) => !allowedRoles.has(role)) ||
    new Set(value.roles).size !== value.roles.length ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    Date.parse(value.expiresAt) <= now.getTime() ||
    !publicIdPatterns.session.test(value.sessionPublicId) ||
    !publicIdPatterns.user.test(value.userPublicId) ||
    modes.length === 0 ||
    (value.workspacePublicId !== undefined &&
      !publicIdPatterns.workspace.test(value.workspacePublicId)) ||
    (value.workspaceRole !== undefined && !value.roles.includes(value.workspaceRole)) ||
    (value.workspaceRole !== undefined && value.workspacePublicId === undefined) ||
    (hasBusinessRole && (!value.workspacePublicId || !value.workspaceRole))
  ) {
    throw new OidcSessionExchangeError('OIDC_SESSION_INVALID');
  }
  return value;
}

function selectMode(bootstrap: MobileSessionBootstrap, preferredMode?: MobileMode): MobileMode {
  const modes = availableModes(bootstrap.roles);
  return preferredMode && modes.includes(preferredMode) ? preferredMode : modes[0]!;
}

function runtimeSession(input: {
  accessToken: string;
  accessTokenExpiresAt: string;
  bootstrap: MobileSessionBootstrap;
  preferredMode?: MobileMode;
  refreshCredential?: string;
}): AuthenticatedMobileSession {
  return {
    ...input.bootstrap,
    accessToken: input.accessToken,
    accessTokenExpiresAt: input.accessTokenExpiresAt,
    refreshCredential: input.refreshCredential,
    selectedMode: selectMode(input.bootstrap, input.preferredMode),
    source: 'api',
    version: 1,
  };
}

export class SignedOidcIdTokenVerifier implements OidcIdTokenVerifier {
  constructor(
    private readonly configuration: { clientId: string; issuer: string },
    private readonly keyResolver: JWTVerifyGetKey,
  ) {}

  async verify(input: {
    expectedNonce: string;
    idToken: string;
    now?: Date;
  }): Promise<VerifiedOidcIdToken> {
    try {
      if (!opaquePattern.test(input.idToken) || !noncePattern.test(input.expectedNonce)) {
        throw new Error('invalid shape');
      }
      const header = decodeProtectedHeader(input.idToken);
      if (
        header.alg !== 'RS256' ||
        header.typ !== 'JWT' ||
        typeof header.kid !== 'string' ||
        header.kid.length < 1 ||
        'jku' in header ||
        'jwk' in header ||
        'x5u' in header ||
        'x5c' in header
      ) {
        throw new Error('invalid header');
      }
      const result = await jwtVerify(input.idToken, this.keyResolver, {
        algorithms: ['RS256'],
        audience: this.configuration.clientId,
        clockTolerance: 30,
        currentDate: input.now,
        issuer: this.configuration.issuer,
        maxTokenAge: '2h',
        requiredClaims: ['aud', 'exp', 'iat', 'iss', 'nonce', 'sub'],
        typ: 'JWT',
      });
      const payload = result.payload as JWTPayload & { nonce?: unknown };
      if (
        typeof payload.sub !== 'string' ||
        payload.sub.length < 1 ||
        payload.sub.length > 255 ||
        typeof payload.exp !== 'number' ||
        typeof payload.nonce !== 'string' ||
        !constantTimeEqual(payload.nonce, input.expectedNonce)
      ) {
        throw new Error('invalid claims');
      }
      return {
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        issuer: this.configuration.issuer,
        subject: payload.sub,
      };
    } catch {
      throw new OidcSessionExchangeError('OIDC_ID_TOKEN_INVALID');
    }
  }
}

export async function completeOidcMobileSession(input: {
  bootstrap: MobileSessionBootstrapBoundary;
  callback: OidcCallbackResult;
  clientId: string;
  idTokenVerifier: OidcIdTokenVerifier;
  now?: Date;
  preferredMode?: MobileMode;
  redirectUri: string;
  storage: MobileSessionStorage;
  tokenEndpoint: OidcTokenEndpoint;
}): Promise<
  | { reason: 'user_cancelled'; status: 'cancelled' }
  | { code: 'provider_error'; status: 'error' }
  | { session: AuthenticatedMobileSession; status: 'authenticated' }
> {
  if (input.callback.status !== 'code_received') return input.callback;
  try {
    const tokenSet = safeTokenSet(
      await input.tokenEndpoint.exchangeCode({
        clientId: input.clientId,
        code: input.callback.code,
        redirectUri: input.redirectUri,
        verifier: input.callback.verifier,
      }),
      true,
    );
    await input.idTokenVerifier.verify({
      expectedNonce: input.callback.nonce,
      idToken: tokenSet.idToken!,
      now: input.now,
    });
    const bootstrap = safeBootstrap(
      await input.bootstrap.bootstrap({ accessToken: tokenSet.accessToken }),
      input.now,
    );
    const now = input.now ?? new Date();
    const session = runtimeSession({
      accessToken: tokenSet.accessToken,
      accessTokenExpiresAt: new Date(
        now.getTime() + tokenSet.expiresInSeconds * 1000,
      ).toISOString(),
      bootstrap,
      preferredMode: input.preferredMode,
      refreshCredential: tokenSet.refreshCredential,
    });
    await input.storage.save(persistedSessionFromRuntime(session));
    return { session, status: 'authenticated' };
  } catch (error) {
    if (error instanceof OidcSessionExchangeError) throw error;
    throw new OidcSessionExchangeError('OIDC_EXCHANGE_FAILED');
  }
}

export async function refreshOidcMobileSession(input: {
  bootstrap: MobileSessionBootstrapBoundary;
  clientId: string;
  current: AuthenticatedMobileSession;
  now?: Date;
  storage: MobileSessionStorage;
  tokenEndpoint: OidcTokenEndpoint;
}): Promise<AuthenticatedMobileSession> {
  try {
    if (!input.current.refreshCredential) {
      throw new OidcSessionExchangeError('OIDC_REFRESH_FAILED');
    }
    const tokenSet = safeTokenSet(
      await input.tokenEndpoint.refresh({
        clientId: input.clientId,
        refreshCredential: input.current.refreshCredential,
      }),
      false,
    );
    const bootstrap = safeBootstrap(
      await input.bootstrap.refresh({
        accessToken: tokenSet.accessToken,
        sessionPublicId: input.current.sessionPublicId,
      }),
      input.now,
    );
    if (bootstrap.sessionPublicId !== input.current.sessionPublicId) {
      throw new OidcSessionExchangeError('OIDC_SESSION_INVALID');
    }
    const now = input.now ?? new Date();
    const session = runtimeSession({
      accessToken: tokenSet.accessToken,
      accessTokenExpiresAt: new Date(
        now.getTime() + tokenSet.expiresInSeconds * 1000,
      ).toISOString(),
      bootstrap,
      preferredMode: input.current.selectedMode,
      refreshCredential: tokenSet.refreshCredential ?? input.current.refreshCredential,
    });
    await input.storage.save(persistedSessionFromRuntime(session));
    return session;
  } catch (error) {
    if (error instanceof OidcSessionExchangeError) throw error;
    throw new OidcSessionExchangeError('OIDC_REFRESH_FAILED');
  }
}

export function persistedCredentialForTests(
  session: AuthenticatedMobileSession,
): PersistedMobileSession {
  return persistedSessionFromRuntime(session);
}
