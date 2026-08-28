import { generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  type AuthenticatedMobileSession,
  type MobileSessionStorage,
  type PersistedMobileSession,
} from './auth-session';
import type { OidcCallbackResult } from './oidc-client';
import {
  completeOidcMobileSession,
  createMobileSessionPublicId,
  OidcSessionExchangeError,
  refreshOidcMobileSession,
  SignedOidcIdTokenVerifier,
  type MobileSessionBootstrapBoundary,
  type OidcTokenEndpoint,
  type OidcTokenSet,
} from './oidc-session-exchange';

const issuer = 'https://identity.local.test/00000000-0000-4000-8000-000000000000/v2.0';
const clientId = '00000000-0000-4000-8000-000000000001';
const redirectUri = 'localmissions://auth/callback';
const nonce = 'n'.repeat(43);
const verifier = 'v'.repeat(43);
const code = `synthetic-code-${'c'.repeat(32)}`;
const now = new Date('2026-08-28T14:00:00.000Z');
let privateKey: CryptoKey;
let publicKey: CryptoKey;

beforeAll(async () => {
  ({ privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true }));
});

function callback(
  overrides: Partial<Extract<OidcCallbackResult, { status: 'code_received' }>> = {},
) {
  return { code, nonce, status: 'code_received' as const, verifier, ...overrides };
}

async function signedIdToken(input: { expiresInSeconds?: number; nonce?: string } = {}) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({
    email: 'ignored-role-claim@example.test',
    nonce: input.nonce ?? nonce,
    roles: ['platform_administrator'],
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'synthetic-local-key-001', typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(clientId)
    .setSubject('synthetic-external-subject-001')
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + (input.expiresInSeconds ?? 1_800))
    .sign(privateKey);
}

function storage() {
  const saved: PersistedMobileSession[] = [];
  const boundary: MobileSessionStorage = {
    kind: 'native-secure-store',
    clear: vi.fn(),
    load: vi.fn(),
    save: vi.fn(async (session) => {
      saved.push(session);
    }),
  };
  return { boundary, saved };
}

function bootstrap(overrides: Partial<MobileSessionBootstrapBoundary> = {}) {
  const projection = {
    accountStatus: 'active' as const,
    expiresAt: '2026-09-27T14:00:00.000Z',
    provider: 'google' as const,
    roles: ['creator', 'business_owner'] as const,
    sessionPublicId: 'ses_synthetic_exchange_001',
    userPublicId: 'usr_synthetic_exchange_001',
    workspacePublicId: 'biz_synthetic_exchange_001',
    workspaceRole: 'business_owner' as const,
    workspaces: [
      {
        name: 'Synthetic Exchange Business',
        publicId: 'biz_synthetic_exchange_001',
        role: 'business_owner' as const,
      },
    ],
  };
  return {
    bootstrap: vi.fn(async ({ sessionPublicId }) => ({ ...projection, sessionPublicId })),
    refresh: vi.fn().mockResolvedValue(projection),
    ...overrides,
  } as MobileSessionBootstrapBoundary;
}

function endpoint(initial: OidcTokenSet, refreshed?: OidcTokenSet): OidcTokenEndpoint {
  let consumed = false;
  return {
    async exchangeCode(input) {
      if (consumed || input.code !== code || input.verifier !== verifier) {
        throw new Error('provider details must not escape');
      }
      consumed = true;
      return initial;
    },
    async refresh(input) {
      if (input.refreshCredential !== 'refresh-credential-old-000000000001' || !refreshed) {
        throw new Error('provider refresh details must not escape');
      }
      return refreshed;
    },
  };
}

function verifierBoundary() {
  return new SignedOidcIdTokenVerifier({ clientId, issuer }, async () => publicKey);
}

describe('OIDC code exchange to protected mobile session', () => {
  it('generates an opaque 256-bit Local Missions session id without user input', async () => {
    await expect(
      createMobileSessionPublicId(async (length) => new Uint8Array(length).fill(0xab)),
    ).resolves.toBe(`ses_${'ab'.repeat(32)}`);
    await expect(createMobileSessionPublicId(async () => new Uint8Array(31))).rejects.toMatchObject(
      { code: 'OIDC_SESSION_INVALID' },
    );
  });

  it('verifies a signed nonce-bound ID token but takes roles and workspace only from the server', async () => {
    const idToken = await signedIdToken();
    const tokenEndpoint = endpoint({
      accessToken: 'access-token-in-memory-0000000000000001',
      expiresInSeconds: 3_600,
      idToken,
      refreshCredential: 'refresh-credential-old-000000000001',
      tokenType: 'Bearer',
    });
    const protectedStorage = storage();

    const result = await completeOidcMobileSession({
      bootstrap: bootstrap(),
      callback: callback(),
      clientId,
      idTokenVerifier: verifierBoundary(),
      now,
      preferredMode: 'business',
      redirectUri,
      storage: protectedStorage.boundary,
      tokenEndpoint,
    });

    expect(result).toMatchObject({
      session: {
        accessToken: 'access-token-in-memory-0000000000000001',
        roles: ['creator', 'business_owner'],
        selectedMode: 'business',
        source: 'api',
        workspacePublicId: 'biz_synthetic_exchange_001',
        workspaceRole: 'business_owner',
      },
      status: 'authenticated',
    });
    expect(protectedStorage.saved).toHaveLength(1);
    expect(protectedStorage.saved[0]).not.toHaveProperty('accessToken');
    expect(JSON.stringify(protectedStorage.saved[0])).not.toContain(idToken);
    expect(JSON.stringify(result)).not.toContain('platform_administrator');
    expect(JSON.stringify(result)).not.toContain('ignored-role-claim');
  });

  it('maps cancellation and provider errors without calling exchange, verification, or storage', async () => {
    const exchangeCode = vi.fn();
    const verify = vi.fn();
    const protectedStorage = storage();
    const input = {
      bootstrap: bootstrap(),
      clientId,
      idTokenVerifier: { verify },
      now,
      redirectUri,
      storage: protectedStorage.boundary,
      tokenEndpoint: { exchangeCode, refresh: vi.fn() },
    };

    await expect(
      completeOidcMobileSession({
        ...input,
        callback: { reason: 'user_cancelled', status: 'cancelled' },
      }),
    ).resolves.toEqual({ reason: 'user_cancelled', status: 'cancelled' });
    await expect(
      completeOidcMobileSession({
        ...input,
        callback: { code: 'provider_error', status: 'error' },
      }),
    ).resolves.toEqual({ code: 'provider_error', status: 'error' });
    expect(exchangeCode).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    expect(protectedStorage.boundary.save).not.toHaveBeenCalled();
  });

  it('allows one code exchange and rejects replay with one generic response', async () => {
    const idToken = await signedIdToken();
    const tokenEndpoint = endpoint({
      accessToken: 'access-token-replay-check-000000000001',
      expiresInSeconds: 3_600,
      idToken,
      refreshCredential: 'refresh-credential-old-000000000001',
      tokenType: 'Bearer',
    });
    const input = {
      bootstrap: bootstrap(),
      callback: callback(),
      clientId,
      idTokenVerifier: verifierBoundary(),
      now,
      redirectUri,
      storage: storage().boundary,
      tokenEndpoint,
    };
    await expect(completeOidcMobileSession(input)).resolves.toMatchObject({
      status: 'authenticated',
    });
    await expect(completeOidcMobileSession(input)).rejects.toEqual(
      new OidcSessionExchangeError('OIDC_EXCHANGE_FAILED'),
    );
  });

  it.each([
    ['wrong code', { code: 'wrong-code-value-00000000000000000001' }],
    ['wrong verifier', { verifier: 'w'.repeat(43) }],
  ])(
    'rejects %s without exposing code, verifier, or provider details',
    async (_label, override) => {
      const idToken = await signedIdToken();
      const secretMarker = Object.values(override)[0]!;
      const attempt = completeOidcMobileSession({
        bootstrap: bootstrap(),
        callback: callback(override),
        clientId,
        idTokenVerifier: verifierBoundary(),
        now,
        redirectUri,
        storage: storage().boundary,
        tokenEndpoint: endpoint({
          accessToken: 'access-token-wrong-proof-000000000001',
          expiresInSeconds: 3_600,
          idToken,
          refreshCredential: 'refresh-credential-old-000000000001',
          tokenType: 'Bearer',
        }),
      });
      await expect(attempt).rejects.toMatchObject({ code: 'OIDC_EXCHANGE_FAILED' });
      await expect(attempt).rejects.not.toThrow(secretMarker);
    },
  );

  it('rejects the wrong nonce and an expired signed ID token before server bootstrap', async () => {
    for (const idToken of [
      await signedIdToken({ nonce: 'x'.repeat(43) }),
      await signedIdToken({ expiresInSeconds: -60 }),
    ]) {
      const sessionBootstrap = bootstrap();
      await expect(
        completeOidcMobileSession({
          bootstrap: sessionBootstrap,
          callback: callback(),
          clientId,
          idTokenVerifier: verifierBoundary(),
          now,
          redirectUri,
          storage: storage().boundary,
          tokenEndpoint: endpoint({
            accessToken: 'access-token-invalid-id-0000000000001',
            expiresInSeconds: 3_600,
            idToken,
            refreshCredential: 'refresh-credential-old-000000000001',
            tokenType: 'Bearer',
          }),
        }),
      ).rejects.toMatchObject({ code: 'OIDC_ID_TOKEN_INVALID' });
      expect(sessionBootstrap.bootstrap).not.toHaveBeenCalled();
    }
  });

  it('rejects injected server roles and expired Local Missions session projections', async () => {
    const idToken = await signedIdToken();
    for (const projection of [
      {
        accountStatus: 'active',
        expiresAt: '2026-09-27T14:00:00.000Z',
        provider: 'google',
        roles: ['creator', 'platform_administrator'],
        sessionPublicId: 'ses_synthetic_exchange_001',
        userPublicId: 'usr_synthetic_exchange_001',
      },
      {
        accountStatus: 'active',
        expiresAt: '2026-08-28T13:59:59.000Z',
        provider: 'google',
        roles: ['creator'],
        sessionPublicId: 'ses_synthetic_exchange_001',
        userPublicId: 'usr_synthetic_exchange_001',
      },
    ]) {
      const protectedStorage = storage();
      await expect(
        completeOidcMobileSession({
          bootstrap: bootstrap({ bootstrap: vi.fn().mockResolvedValue(projection) }),
          callback: callback(),
          clientId,
          idTokenVerifier: verifierBoundary(),
          now,
          redirectUri,
          storage: protectedStorage.boundary,
          tokenEndpoint: endpoint({
            accessToken: 'access-token-invalid-session-00000000001',
            expiresInSeconds: 3_600,
            idToken,
            refreshCredential: 'refresh-credential-old-000000000001',
            tokenType: 'Bearer',
          }),
        }),
      ).rejects.toMatchObject({ code: 'OIDC_SESSION_INVALID' });
      expect(protectedStorage.boundary.save).not.toHaveBeenCalled();
    }
  });

  it('rotates the refresh credential atomically and retains the selected mode', async () => {
    const protectedStorage = storage();
    const current: AuthenticatedMobileSession = {
      accountStatus: 'active' as const,
      accessToken: 'access-token-current-0000000000000001',
      accessTokenExpiresAt: '2026-08-28T14:01:00.000Z',
      expiresAt: '2026-09-27T14:00:00.000Z',
      provider: 'google' as const,
      refreshCredential: 'refresh-credential-old-000000000001',
      roles: ['creator', 'business_owner'],
      selectedMode: 'business' as const,
      sessionPublicId: 'ses_synthetic_exchange_001',
      source: 'api' as const,
      userPublicId: 'usr_synthetic_exchange_001',
      version: 1 as const,
      workspacePublicId: 'biz_synthetic_exchange_001',
      workspaceRole: 'business_owner' as const,
      workspaces: [
        {
          name: 'Synthetic Exchange Business',
          publicId: 'biz_synthetic_exchange_001',
          role: 'business_owner' as const,
        },
      ],
    };
    const refreshed = await refreshOidcMobileSession({
      bootstrap: bootstrap(),
      clientId,
      current,
      now,
      storage: protectedStorage.boundary,
      tokenEndpoint: endpoint(
        {
          accessToken: 'unused-initial-access-token-00000000001',
          expiresInSeconds: 3_600,
          tokenType: 'Bearer',
        },
        {
          accessToken: 'access-token-rotated-000000000000001',
          expiresInSeconds: 3_600,
          refreshCredential: 'refresh-credential-new-000000000001',
          tokenType: 'Bearer',
        },
      ),
    });

    expect(refreshed).toMatchObject({
      accessToken: 'access-token-rotated-000000000000001',
      refreshCredential: 'refresh-credential-new-000000000001',
      selectedMode: 'business',
    });
    expect(protectedStorage.saved).toHaveLength(1);
    expect(JSON.stringify(protectedStorage.saved[0])).toContain('refresh-credential-new');
    expect(JSON.stringify(protectedStorage.saved[0])).not.toContain('refresh-credential-old');
    expect(protectedStorage.saved[0]).not.toHaveProperty('accessToken');
  });

  it('refuses a refresh response for another Local Missions session without overwriting storage', async () => {
    const protectedStorage = storage();
    const current: AuthenticatedMobileSession = {
      accountStatus: 'active' as const,
      expiresAt: '2026-09-27T14:00:00.000Z',
      provider: 'google' as const,
      refreshCredential: 'refresh-credential-old-000000000001',
      roles: ['creator'],
      selectedMode: 'creator' as const,
      sessionPublicId: 'ses_synthetic_exchange_001',
      source: 'api' as const,
      userPublicId: 'usr_synthetic_exchange_001',
      version: 1 as const,
      workspaces: [],
    };
    const wrongBootstrap = bootstrap({
      refresh: vi.fn().mockResolvedValue({
        accountStatus: 'active',
        expiresAt: '2026-09-27T14:00:00.000Z',
        provider: 'google',
        roles: ['creator'],
        sessionPublicId: 'ses_another_session_0001',
        userPublicId: 'usr_synthetic_exchange_001',
        workspaces: [],
      }),
    });
    await expect(
      refreshOidcMobileSession({
        bootstrap: wrongBootstrap,
        clientId,
        current,
        now,
        storage: protectedStorage.boundary,
        tokenEndpoint: endpoint(
          {
            accessToken: 'unused-initial-access-token-00000000001',
            expiresInSeconds: 3_600,
            tokenType: 'Bearer',
          },
          {
            accessToken: 'access-token-wrong-session-00000000001',
            expiresInSeconds: 3_600,
            refreshCredential: 'refresh-credential-new-000000000001',
            tokenType: 'Bearer',
          },
        ),
      }),
    ).rejects.toMatchObject({ code: 'OIDC_SESSION_INVALID' });
    expect(protectedStorage.boundary.save).not.toHaveBeenCalled();
  });
});
