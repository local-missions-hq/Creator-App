import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 7,
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  isAvailableAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

import {
  consumeOidcCallback,
  createOidcAuthorizationRequest,
  OidcBoundaryError,
  readOidcConfiguration,
  type OidcConfiguration,
  type OidcCryptoBoundary,
} from './oidc-client';
import { MemoryOidcTransactionStore } from './oidc-transaction-storage';

const configuration: OidcConfiguration = {
  authorizationEndpoint:
    'https://login.example.test/00000000-0000-4000-8000-000000000000/oauth2/v2.0/authorize',
  clientId: '00000000-0000-4000-8000-000000000001',
  issuer: 'https://login.example.test/00000000-0000-4000-8000-000000000000/v2.0',
  jwksUri: 'https://login.example.test/00000000-0000-4000-8000-000000000000/discovery/v2.0/keys',
  redirectUri: 'localmissions://auth/callback',
  scopes: [
    'openid',
    'profile',
    'offline_access',
    'api://00000000-0000-4000-8000-000000000002/access_as_user',
  ],
  tokenEndpoint:
    'https://login.example.test/00000000-0000-4000-8000-000000000000/oauth2/v2.0/token',
};

function environment(overrides: Record<string, string> = {}) {
  return {
    EXPO_PUBLIC_ENTRA_AUTHORIZATION_ENDPOINT: configuration.authorizationEndpoint,
    EXPO_PUBLIC_ENTRA_CLIENT_ID: configuration.clientId,
    EXPO_PUBLIC_ENTRA_ISSUER: configuration.issuer,
    EXPO_PUBLIC_ENTRA_JWKS_URI: configuration.jwksUri,
    EXPO_PUBLIC_ENTRA_REDIRECT_URI: configuration.redirectUri,
    EXPO_PUBLIC_ENTRA_SCOPE: configuration.scopes.join(' '),
    EXPO_PUBLIC_ENTRA_TOKEN_ENDPOINT: configuration.tokenEndpoint,
    ...overrides,
  };
}

function deterministicCrypto(): OidcCryptoBoundary {
  let seed = 1;
  return {
    async randomBytes(length) {
      const value = Uint8Array.from({ length }, (_, index) => (seed + index) % 256);
      seed += length;
      return value;
    },
    async sha256(value) {
      return Uint8Array.from({ length: 32 }, (_, index) => (value.length + index) % 256);
    },
  };
}

async function request(now = new Date('2026-08-28T14:00:00.000Z')) {
  return createOidcAuthorizationRequest({
    configuration,
    crypto: deterministicCrypto(),
    now,
    providerIntent: 'google',
    purpose: 'sign_in',
  });
}

function consume(input: Parameters<typeof consumeOidcCallback>[0]) {
  return consumeOidcCallback({
    now: new Date('2026-08-28T14:05:00.000Z'),
    ...input,
  });
}

describe('mobile OIDC and PKCE boundary', () => {
  it('fails closed when configuration is absent, partial, insecure, or has the wrong redirect', () => {
    expect(readOidcConfiguration({})).toEqual({ available: false });
    expect(() =>
      readOidcConfiguration({ EXPO_PUBLIC_ENTRA_CLIENT_ID: configuration.clientId }),
    ).toThrowError(OidcBoundaryError);
    expect(() =>
      readOidcConfiguration(
        environment({
          EXPO_PUBLIC_ENTRA_AUTHORIZATION_ENDPOINT: configuration.authorizationEndpoint.replace(
            'https:',
            'http:',
          ),
        }),
      ),
    ).toThrowError(OidcBoundaryError);
    expect(() =>
      readOidcConfiguration(
        environment({
          EXPO_PUBLIC_ENTRA_AUTHORIZATION_ENDPOINT:
            'https://127.0.0.1/00000000-0000-4000-8000-000000000000/oauth2/v2.0/authorize',
        }),
      ),
    ).toThrowError(OidcBoundaryError);
    expect(() =>
      readOidcConfiguration(
        environment({
          EXPO_PUBLIC_ENTRA_AUTHORIZATION_ENDPOINT:
            'https://login.example.test/not-a-tenant/oauth2/v2.0/authorize',
          EXPO_PUBLIC_ENTRA_ISSUER: 'https://login.example.test/not-a-tenant/v2.0',
          EXPO_PUBLIC_ENTRA_JWKS_URI: 'https://login.example.test/not-a-tenant/discovery/v2.0/keys',
          EXPO_PUBLIC_ENTRA_TOKEN_ENDPOINT:
            'https://login.example.test/not-a-tenant/oauth2/v2.0/token',
        }),
      ),
    ).toThrowError(OidcBoundaryError);
    expect(() =>
      readOidcConfiguration(
        environment({
          EXPO_PUBLIC_ENTRA_JWKS_URI: configuration.jwksUri.replace(
            '00000000-0000-4000-8000-000000000000',
            '00000000-0000-4000-8000-000000000099',
          ),
        }),
      ),
    ).toThrowError(OidcBoundaryError);
    expect(() =>
      readOidcConfiguration(
        environment({ EXPO_PUBLIC_ENTRA_REDIRECT_URI: 'localmissions://wrong/callback' }),
      ),
    ).toThrowError(OidcBoundaryError);
    expect(() =>
      readOidcConfiguration(
        environment({
          EXPO_PUBLIC_ENTRA_TOKEN_ENDPOINT: configuration.tokenEndpoint.replace(
            'login.example.test',
            'other.example.test',
          ),
        }),
      ),
    ).toThrowError(OidcBoundaryError);
  });

  it('accepts only complete authorization-code configuration with required unique scopes', () => {
    expect(readOidcConfiguration(environment())).toEqual({ available: true, configuration });
    expect(() =>
      readOidcConfiguration(
        environment({ EXPO_PUBLIC_ENTRA_SCOPE: 'openid profile profile offline_access' }),
      ),
    ).toThrowError(OidcBoundaryError);
    expect(() =>
      readOidcConfiguration(
        environment({
          EXPO_PUBLIC_ENTRA_SCOPE: 'openid profile offline_access api://not-a-uuid/access_as_user',
        }),
      ),
    ).toThrowError(OidcBoundaryError);
  });

  it('creates 256-bit state, nonce, verifier, S256 challenge, and an exact ten-minute request', async () => {
    const created = await request();
    const url = new URL(created.authorizationUrl);

    expect(created.transaction).toMatchObject({
      createdAt: '2026-08-28T14:00:00.000Z',
      expiresAt: '2026-08-28T14:10:00.000Z',
      providerIntent: 'google',
      redirectUri: configuration.redirectUri,
    });
    expect(created.transaction.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(created.transaction.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(created.transaction.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('response_mode')).toBe('query');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('provider')).toBeNull();
  });

  it('accepts one exact callback and rejects replay without exposing transaction secrets', async () => {
    const created = await request();
    const store = new MemoryOidcTransactionStore();
    await store.save(created.transaction);
    const callback = `${configuration.redirectUri}?code=synthetic-code-001&state=${created.transaction.state}`;

    await expect(consume({ callbackUrl: callback, store })).resolves.toMatchObject({
      code: 'synthetic-code-001',
      status: 'code_received',
    });
    await expect(consume({ callbackUrl: callback, store })).rejects.toMatchObject({
      code: 'OIDC_STATE_INVALID',
      message: 'The secure sign-in request could not be verified.',
    });
  });

  it('does not consume the real transaction for a wrong state, redirect, or client-asserted provider', async () => {
    const created = await request();
    const store = new MemoryOidcTransactionStore();
    await store.save(created.transaction);
    const wrongState = `${configuration.redirectUri}?code=synthetic-code-001&state=${'a'.repeat(43)}`;
    await expect(consume({ callbackUrl: wrongState, store })).rejects.toMatchObject({
      code: 'OIDC_STATE_INVALID',
    });
    await expect(
      consume({
        callbackUrl: `localmissions://wrong/callback?code=synthetic-code-001&state=${created.transaction.state}`,
        store,
      }),
    ).rejects.toMatchObject({ code: 'OIDC_CALLBACK_INVALID' });
    await expect(
      consume({
        callbackUrl: `${configuration.redirectUri}?code=synthetic-code-001&state=${created.transaction.state}&provider=microsoft`,
        store,
      }),
    ).rejects.toMatchObject({ code: 'OIDC_CALLBACK_INVALID' });
    await expect(
      consume({
        callbackUrl: `${configuration.redirectUri}?code=synthetic-code-001&state=${created.transaction.state}`,
        store,
      }),
    ).resolves.toMatchObject({ status: 'code_received' });
  });

  it('consumes an expired transaction and rejects malformed or duplicate callback fields', async () => {
    const created = await request();
    const store = new MemoryOidcTransactionStore();
    await store.save(created.transaction);
    await expect(
      consume({
        callbackUrl: `${configuration.redirectUri}?code=synthetic-code-001&state=${created.transaction.state}`,
        now: new Date('2026-08-28T14:10:00.000Z'),
        store,
      }),
    ).rejects.toMatchObject({ code: 'OIDC_TRANSACTION_EXPIRED' });
    await store.save(created.transaction);
    await expect(
      consume({
        callbackUrl: `${configuration.redirectUri}?code=one&code=two&state=${created.transaction.state}`,
        store,
      }),
    ).rejects.toMatchObject({ code: 'OIDC_CALLBACK_INVALID' });
  });

  it('maps user cancellation and provider failure without trusting error descriptions', async () => {
    const created = await request();
    const store = new MemoryOidcTransactionStore();
    await store.save(created.transaction);
    await expect(
      consume({
        callbackUrl: `${configuration.redirectUri}?error=access_denied&error_description=private-marker&state=${created.transaction.state}`,
        store,
      }),
    ).resolves.toEqual({ reason: 'user_cancelled', status: 'cancelled' });
    await store.save(created.transaction);
    await expect(
      consume({
        callbackUrl: `${configuration.redirectUri}?error=temporarily_unavailable&error_description=private-marker&error_uri=https%3A%2F%2Flogin.synthetic.invalid%2Ferror&timestamp=2026-08-28T14%3A00%3A00Z&trace_id=trace-001&correlation_id=correlation-001&session_state=session-001&state=${created.transaction.state}`,
        store,
      }),
    ).resolves.toEqual({ code: 'provider_error', status: 'error' });
  });

  it('allows exactly one winner when duplicate callbacks race', async () => {
    const created = await request();
    const store = new MemoryOidcTransactionStore();
    await store.save(created.transaction);
    const callbackUrl = `${configuration.redirectUri}?code=synthetic-code-001&state=${created.transaction.state}`;
    const outcomes = await Promise.allSettled([
      consume({ callbackUrl, store }),
      consume({ callbackUrl, store }),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
  });
});
