import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { MobileSessionStorage } from './auth-session';
import { OidcBoundaryError, type OidcConfiguration } from './oidc-client';
import {
  createMobileOidcJwksResolver,
  HttpsOidcTokenEndpoint,
  OidcNetworkBoundaryError,
} from './oidc-network-transport';
import {
  completeOidcMobileSession,
  OidcSessionExchangeError,
  SignedOidcIdTokenVerifier,
  type MobileSessionBootstrapBoundary,
} from './oidc-session-exchange';

const configuration: OidcConfiguration = {
  authorizationEndpoint:
    'https://login.synthetic.invalid/00000000-0000-4000-8000-000000000000/oauth2/v2.0/authorize',
  clientId: '00000000-0000-4000-8000-000000000001',
  issuer: 'https://login.synthetic.invalid/00000000-0000-4000-8000-000000000000/v2.0',
  jwksUri:
    'https://login.synthetic.invalid/00000000-0000-4000-8000-000000000000/discovery/v2.0/keys',
  redirectUri: 'localmissions://auth/callback',
  scopes: [
    'openid',
    'profile',
    'offline_access',
    'api://00000000-0000-4000-8000-000000000002/access_as_user',
  ],
  tokenEndpoint:
    'https://login.synthetic.invalid/00000000-0000-4000-8000-000000000000/oauth2/v2.0/token',
};
const code = `synthetic-code-${'c'.repeat(32)}`;
const verifier = 'v'.repeat(43);
const nonce = 'n'.repeat(43);
const accessToken = 'access-token-network-0000000000000001';
const idTokenFixture = 'id-token-network-0000000000000000001';
const oldRefreshCredential = 'refresh-credential-network-old-00000001';
const newRefreshCredential = 'refresh-credential-network-new-00000001';
const now = new Date('2026-08-28T16:00:00.000Z');

let firstPrivateKey: CryptoKey;
let firstPublicJwk: JWK;
let secondPrivateKey: CryptoKey;
let secondPublicJwk: JWK;

beforeAll(async () => {
  const first = await generateKeyPair('RS256', { extractable: true });
  firstPrivateKey = first.privateKey;
  firstPublicJwk = {
    ...(await exportJWK(first.publicKey)),
    alg: 'RS256',
    kid: 'mobile-key-one',
    use: 'sig',
  };
  const second = await generateKeyPair('RS256', { extractable: true });
  secondPrivateKey = second.privateKey;
  secondPublicJwk = {
    ...(await exportJWK(second.publicKey)),
    alg: 'RS256',
    kid: 'mobile-key-two',
    use: 'sig',
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function jsonResponse(
  value: unknown,
  input: { contentType?: string; declaredLength?: string; status?: number } = {},
) {
  const headers = new Headers({
    'content-type': input.contentType ?? 'application/json; charset=utf-8',
  });
  if (input.declaredLength !== undefined) {
    headers.set('content-length', input.declaredLength);
  }
  return new Response(JSON.stringify(value), {
    headers,
    status: input.status ?? 200,
  });
}

function tokenResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: accessToken,
    expires_in: 3_600,
    id_token: idTokenFixture,
    refresh_token: oldRefreshCredential,
    token_type: 'Bearer',
    ...overrides,
  };
}

function followedJsonResponse(value: unknown) {
  const response = jsonResponse(value);
  Object.defineProperties(response, {
    redirected: { value: true },
    url: { value: 'https://redirected.synthetic.invalid/token' },
  });
  return response;
}

async function signedIdToken(
  input: {
    key?: CryptoKey;
    keyId?: string;
    subject?: string;
  } = {},
) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ nonce })
    .setProtectedHeader({
      alg: 'RS256',
      kid: input.keyId ?? 'mobile-key-one',
      typ: 'JWT',
    })
    .setIssuer(configuration.issuer)
    .setAudience(configuration.clientId)
    .setSubject(input.subject ?? 'synthetic-mobile-subject-001')
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 1_800)
    .sign(input.key ?? firstPrivateKey);
}

describe('mobile OIDC HTTPS token transport', () => {
  it('posts an exact public-client code exchange with no client secret and maps bounded JSON', async () => {
    const fetch = vi.fn(async (_url: string, _options: RequestInit) =>
      jsonResponse(tokenResponse()),
    );
    const endpoint = new HttpsOidcTokenEndpoint(configuration, { fetch });

    await expect(
      endpoint.exchangeCode({
        clientId: configuration.clientId,
        code,
        redirectUri: configuration.redirectUri,
        verifier,
      }),
    ).resolves.toEqual({
      accessToken,
      expiresInSeconds: 3_600,
      idToken: idTokenFixture,
      refreshCredential: oldRefreshCredential,
      tokenType: 'Bearer',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0]!;
    expect(url).toBe(configuration.tokenEndpoint);
    expect(options).toMatchObject({
      cache: 'no-store',
      credentials: 'omit',
      method: 'POST',
      redirect: 'manual',
      referrerPolicy: 'no-referrer',
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(options.headers);
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('content-type')).toBe('application/x-www-form-urlencoded;charset=UTF-8');
    const body = new URLSearchParams(String(options.body));
    expect(Object.fromEntries(body)).toEqual({
      client_id: configuration.clientId,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: configuration.redirectUri,
    });
    expect(String(options.body).toLowerCase()).not.toContain('secret');
  });

  it('posts only the refresh grant and accepts safe credential rotation', async () => {
    const fetch = vi.fn(async (_url: string, _options: RequestInit) =>
      jsonResponse(
        tokenResponse({
          id_token: undefined,
          refresh_token: newRefreshCredential,
        }),
      ),
    );
    const endpoint = new HttpsOidcTokenEndpoint(configuration, { fetch });

    await expect(
      endpoint.refresh({
        clientId: configuration.clientId,
        refreshCredential: oldRefreshCredential,
      }),
    ).resolves.toEqual({
      accessToken,
      expiresInSeconds: 3_600,
      refreshCredential: newRefreshCredential,
      tokenType: 'Bearer',
    });

    const body = new URLSearchParams(String(fetch.mock.calls[0]![1].body));
    expect(Object.fromEntries(body)).toEqual({
      client_id: configuration.clientId,
      grant_type: 'refresh_token',
      refresh_token: oldRefreshCredential,
    });
    expect(body.has('code')).toBe(false);
    expect(body.has('code_verifier')).toBe(false);
    expect(body.has('client_secret')).toBe(false);
  });

  it('composes the concrete token and JWKS boundaries into one fixture-backed mobile session', async () => {
    const signed = await signedIdToken();
    const tokenFetch = vi.fn(async (_url: string, _options: RequestInit) =>
      jsonResponse(tokenResponse({ id_token: signed })),
    );
    const jwksFetch = vi.fn(async (_url: string, _options: RequestInit) =>
      jsonResponse({ keys: [firstPublicJwk] }),
    );
    const endpoint = new HttpsOidcTokenEndpoint(configuration, { fetch: tokenFetch });
    const resolver = createMobileOidcJwksResolver(configuration, { fetch: jwksFetch });
    const idTokenVerifier = new SignedOidcIdTokenVerifier(
      { clientId: configuration.clientId, issuer: configuration.issuer },
      resolver,
    );
    const bootstrap: MobileSessionBootstrapBoundary = {
      bootstrap: vi.fn(async ({ sessionPublicId }) => ({
        accountStatus: 'active' as const,
        expiresAt: '2026-09-28T16:00:00.000Z',
        provider: 'google' as const,
        roles: ['creator'] as Array<'creator'>,
        sessionPublicId,
        userPublicId: 'usr_synthetic_network_001',
        workspaces: [],
      })),
      refresh: vi.fn(),
    };
    const save = vi.fn();
    const storage: MobileSessionStorage = {
      kind: 'native-secure-store',
      clear: vi.fn(),
      load: vi.fn(),
      save,
    };

    await expect(
      completeOidcMobileSession({
        bootstrap,
        callback: { code, nonce, status: 'code_received', verifier },
        clientId: configuration.clientId,
        idTokenVerifier,
        now,
        redirectUri: configuration.redirectUri,
        sessionIdRandomBytes: async (length) => new Uint8Array(length).fill(0xab),
        storage,
        tokenEndpoint: endpoint,
      }),
    ).resolves.toMatchObject({
      session: {
        accessToken,
        provider: 'google',
        roles: ['creator'],
        selectedMode: 'creator',
        sessionPublicId: `ses_${'ab'.repeat(32)}`,
      },
      status: 'authenticated',
    });
    expect(tokenFetch).toHaveBeenCalledTimes(1);
    expect(jwksFetch).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(save.mock.calls)).not.toContain(accessToken);
    expect(JSON.stringify(save.mock.calls)).not.toContain(signed);
  });

  it('fails before fetch for mismatched client, redirect, malformed code/verifier, or refresh proof', async () => {
    const fetch = vi.fn(async () => jsonResponse(tokenResponse()));
    const endpoint = new HttpsOidcTokenEndpoint(configuration, { fetch });
    const exchangeCases = [
      {
        clientId: '00000000-0000-4000-8000-000000000099',
        code,
        redirectUri: configuration.redirectUri,
        verifier,
      },
      {
        clientId: configuration.clientId,
        code,
        redirectUri: 'localmissions://wrong/callback',
        verifier,
      },
      {
        clientId: configuration.clientId,
        code: 'short',
        redirectUri: configuration.redirectUri,
        verifier,
      },
      {
        clientId: configuration.clientId,
        code,
        redirectUri: configuration.redirectUri,
        verifier: 'short',
      },
    ];
    for (const input of exchangeCases) {
      await expect(endpoint.exchangeCode(input)).rejects.toEqual(
        new OidcSessionExchangeError('OIDC_EXCHANGE_FAILED'),
      );
    }
    await expect(
      endpoint.refresh({ clientId: configuration.clientId, refreshCredential: 'short' }),
    ).rejects.toEqual(new OidcSessionExchangeError('OIDC_REFRESH_FAILED'));
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      'provider error body',
      () => jsonResponse({ error: 'private-provider-marker' }, { status: 400 }),
    ],
    ['redirect', () => jsonResponse(tokenResponse(), { status: 302 })],
    ['followed redirect', () => followedJsonResponse(tokenResponse())],
    ['wrong content type', () => jsonResponse(tokenResponse(), { contentType: 'text/html' })],
    [
      'malformed JSON',
      () => new Response('{', { headers: { 'content-type': 'application/json' }, status: 200 }),
    ],
    ['oversized declaration', () => jsonResponse(tokenResponse(), { declaredLength: '65537' })],
    ['oversized streamed body', () => jsonResponse({ padding: 'x'.repeat(2_000) })],
    [
      'missing initial refresh credential',
      () => jsonResponse(tokenResponse({ refresh_token: undefined })),
    ],
    ['wrong token type', () => jsonResponse(tokenResponse({ token_type: 'mac' }))],
    ['string expiration', () => jsonResponse(tokenResponse({ expires_in: '3600' }))],
  ])('returns one generic exchange failure for %s', async (_label, response) => {
    const privateMarker = 'private-provider-marker';
    const fetch = vi.fn(async () => response());
    const endpoint = new HttpsOidcTokenEndpoint(configuration, {
      fetch,
      maxResponseBytes: 1_024,
    });
    let error: unknown;
    try {
      await endpoint.exchangeCode({
        clientId: configuration.clientId,
        code,
        redirectUri: configuration.redirectUri,
        verifier,
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toEqual(new OidcSessionExchangeError('OIDC_EXCHANGE_FAILED'));
    expect(String(error)).not.toContain(privateMarker);
    expect(JSON.stringify(error)).not.toContain(privateMarker);
  });

  it('aborts a stalled exchange and exposes no network failure detail', async () => {
    vi.useFakeTimers();
    const privateMarker = 'private-network-timeout-marker';
    const fetch = vi.fn(
      async (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(new Error(privateMarker)), {
            once: true,
          });
        }),
    );
    const endpoint = new HttpsOidcTokenEndpoint(configuration, {
      fetch,
      timeoutMilliseconds: 100,
    });
    const attempt = endpoint.exchangeCode({
      clientId: configuration.clientId,
      code,
      redirectUri: configuration.redirectUri,
      verifier,
    });
    const handled = attempt.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(100);
    const error = await handled;
    expect(error).toEqual(new OidcSessionExchangeError('OIDC_EXCHANGE_FAILED'));
    expect(String(error)).not.toContain(privateMarker);
  });

  it('maps refresh provider details to the refresh-specific generic failure', async () => {
    const privateMarker = 'private-refresh-provider-marker';
    const fetch = vi.fn(async (_url: string, _options: RequestInit) =>
      jsonResponse({ error: privateMarker }, { status: 400 }),
    );
    const endpoint = new HttpsOidcTokenEndpoint(configuration, { fetch });
    let error: unknown;
    try {
      await endpoint.refresh({
        clientId: configuration.clientId,
        refreshCredential: oldRefreshCredential,
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toEqual(new OidcSessionExchangeError('OIDC_REFRESH_FAILED'));
    expect(String(error)).not.toContain(privateMarker);
    expect(JSON.stringify(error)).not.toContain(privateMarker);
  });

  it('rejects an unsafe constructor configuration without making a request', () => {
    const fetch = vi.fn();
    expect(
      () =>
        new HttpsOidcTokenEndpoint(
          {
            ...configuration,
            tokenEndpoint: configuration.tokenEndpoint.replace('https:', 'http:'),
          },
          { fetch },
        ),
    ).toThrow(OidcBoundaryError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('mobile OIDC bounded JWKS transport', () => {
  it('fetches the exact JWKS without credentials, caches it, and reloads for key rotation', async () => {
    let fetchCount = 0;
    const fetch = vi.fn(async (_url: string, options: RequestInit) => {
      fetchCount += 1;
      expect(options).toMatchObject({
        cache: 'no-store',
        credentials: 'omit',
        method: 'GET',
        redirect: 'manual',
        referrerPolicy: 'no-referrer',
      });
      const headers = new Headers(options.headers);
      expect(headers.get('accept')).toBe('application/json');
      expect(headers.has('authorization')).toBe(false);
      return jsonResponse({
        keys: fetchCount === 1 ? [firstPublicJwk] : [firstPublicJwk, secondPublicJwk],
      });
    });
    const resolver = createMobileOidcJwksResolver(configuration, {
      cooldownMilliseconds: 0,
      fetch,
    });
    const verifierBoundary = new SignedOidcIdTokenVerifier(
      { clientId: configuration.clientId, issuer: configuration.issuer },
      resolver,
    );
    const first = await signedIdToken();
    await expect(
      verifierBoundary.verify({ expectedNonce: nonce, idToken: first, now }),
    ).resolves.toMatchObject({ subject: 'synthetic-mobile-subject-001' });
    await expect(
      verifierBoundary.verify({ expectedNonce: nonce, idToken: first, now }),
    ).resolves.toMatchObject({ subject: 'synthetic-mobile-subject-001' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe(configuration.jwksUri);

    const rotated = await signedIdToken({
      key: secondPrivateKey,
      keyId: 'mobile-key-two',
      subject: 'synthetic-mobile-subject-002',
    });
    await expect(
      verifierBoundary.verify({ expectedNonce: nonce, idToken: rotated, now }),
    ).resolves.toMatchObject({ subject: 'synthetic-mobile-subject-002' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['provider error', () => jsonResponse({ error: 'private-jwks-marker' }, { status: 503 })],
    ['redirect', () => jsonResponse({ keys: [firstPublicJwk] }, { status: 302 })],
    [
      'wrong content type',
      () => jsonResponse({ keys: [firstPublicJwk] }, { contentType: 'text/plain' }),
    ],
    [
      'malformed JSON',
      () => new Response('{', { headers: { 'content-type': 'application/json' }, status: 200 }),
    ],
    ['empty set', () => jsonResponse({ keys: [] })],
    [
      'too many keys',
      () => jsonResponse({ keys: Array.from({ length: 21 }, () => firstPublicJwk) }),
    ],
    ['oversized body', () => jsonResponse({ keys: [firstPublicJwk], padding: 'x'.repeat(2_000) })],
  ])('maps %s to one ID-token verification failure', async (_label, response) => {
    const fetch = vi.fn(async () => response());
    const resolver = createMobileOidcJwksResolver(configuration, {
      fetch,
      maxResponseBytes: 1_024,
    });
    const verifierBoundary = new SignedOidcIdTokenVerifier(
      { clientId: configuration.clientId, issuer: configuration.issuer },
      resolver,
    );
    const signed = await signedIdToken();
    const privateMarker = 'private-jwks-marker';
    let error: unknown;
    try {
      await verifierBoundary.verify({ expectedNonce: nonce, idToken: signed, now });
    } catch (caught) {
      error = caught;
    }
    expect(error).toEqual(new OidcSessionExchangeError('OIDC_ID_TOKEN_INVALID'));
    expect(String(error)).not.toContain(privateMarker);
    expect(JSON.stringify(error)).not.toContain(privateMarker);
  });

  it('enforces the JWKS timeout and keeps the network detail generic', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      async (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener(
            'abort',
            () => reject(new Error('private-jwks-timeout-marker')),
            { once: true },
          );
        }),
    );
    const resolver = createMobileOidcJwksResolver(configuration, {
      fetch,
      timeoutMilliseconds: 100,
    });
    const verifierBoundary = new SignedOidcIdTokenVerifier(
      { clientId: configuration.clientId, issuer: configuration.issuer },
      resolver,
    );
    const signed = await signedIdToken();
    const attempt = verifierBoundary.verify({ expectedNonce: nonce, idToken: signed, now });
    const handled = attempt.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(100);
    const error = await handled;
    expect(error).toEqual(new OidcSessionExchangeError('OIDC_ID_TOKEN_INVALID'));
    expect(String(error)).not.toContain('private-jwks-timeout-marker');
  });

  it('rejects unsafe JWKS configuration and option bounds before fetch', () => {
    const fetch = vi.fn();
    expect(() =>
      createMobileOidcJwksResolver(
        { ...configuration, jwksUri: configuration.jwksUri.replace('https:', 'http:') },
        { fetch },
      ),
    ).toThrow(OidcBoundaryError);
    expect(() =>
      createMobileOidcJwksResolver(configuration, {
        fetch,
        maxResponseBytes: 100,
      }),
    ).toThrow(OidcNetworkBoundaryError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
