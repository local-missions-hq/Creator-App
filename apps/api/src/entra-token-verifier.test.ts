import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  createRemoteEntraKeyResolver,
  EntraAccessTokenVerifier,
  EntraTokenVerificationError,
  EntraVerifierConfigurationError,
  readEntraVerifierConfiguration,
  type EntraVerifierConfiguration,
} from './entra-token-verifier.js';

const tenantId = '00000000-0000-4000-8000-000000000001';
const audience = '00000000-0000-4000-8000-000000000002';
const issuer = `https://tenant.synthetic.invalid/${tenantId}/v2.0`;
const configuration: EntraVerifierConfiguration = {
  audience,
  issuer,
  jwksUri: `https://tenant.synthetic.invalid/${tenantId}/discovery/v2.0/keys`,
  requiredScope: 'access_as_user',
  tenantId,
};
const now = new Date('2026-08-28T14:00:00.000Z');
const nowSeconds = Math.floor(now.getTime() / 1000);

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
    kid: 'key-one',
    use: 'sig',
  };
  const second = await generateKeyPair('RS256', { extractable: true });
  secondPrivateKey = second.privateKey;
  secondPublicJwk = {
    ...(await exportJWK(second.publicKey)),
    alg: 'RS256',
    kid: 'key-two',
    use: 'sig',
  };
});

function standardClaims(overrides: Record<string, unknown> = {}) {
  return {
    aud: audience,
    exp: nowSeconds + 3_600,
    iat: nowSeconds,
    iss: issuer,
    nbf: nowSeconds - 5,
    scp: 'openid access_as_user',
    sub: 'external-subject-001',
    tid: tenantId,
    ver: '2.0',
    ...overrides,
  };
}

async function token(input: { claims?: Record<string, unknown>; key?: CryptoKey; keyId?: string }) {
  return new SignJWT(standardClaims(input.claims))
    .setProtectedHeader({ alg: 'RS256', kid: input.keyId ?? 'key-one', typ: 'JWT' })
    .sign(input.key ?? firstPrivateKey);
}

function verifier(jwks: JWK[] = [firstPublicJwk]) {
  return new EntraAccessTokenVerifier(configuration, createLocalJWKSet({ keys: jwks }));
}

describe('Entra access-token verifier boundary', () => {
  it('fails closed for absent, partial, unsafe, or cross-host configuration', () => {
    expect(readEntraVerifierConfiguration({})).toEqual({ available: false });
    expect(() => readEntraVerifierConfiguration({ ENTRA_TENANT_ID: tenantId })).toThrowError(
      EntraVerifierConfigurationError,
    );
    expect(() =>
      readEntraVerifierConfiguration({
        ENTRA_API_AUDIENCE: audience,
        ENTRA_ISSUER: issuer.replace('https:', 'http:'),
        ENTRA_JWKS_URI: configuration.jwksUri,
        ENTRA_REQUIRED_SCOPE: 'access_as_user',
        ENTRA_TENANT_ID: tenantId,
      }),
    ).toThrowError(EntraVerifierConfigurationError);
    expect(() =>
      readEntraVerifierConfiguration({
        ENTRA_API_AUDIENCE: audience,
        ENTRA_ISSUER: issuer,
        ENTRA_JWKS_URI: configuration.jwksUri.replace(
          'tenant.synthetic.invalid',
          'other.synthetic.invalid',
        ),
        ENTRA_REQUIRED_SCOPE: 'access_as_user',
        ENTRA_TENANT_ID: tenantId,
      }),
    ).toThrowError(EntraVerifierConfigurationError);
    expect(() =>
      readEntraVerifierConfiguration({
        ENTRA_API_AUDIENCE: audience,
        ENTRA_ISSUER: issuer,
        ENTRA_JWKS_URI: configuration.jwksUri,
        ENTRA_REQUIRED_SCOPE: 'User.Read',
        ENTRA_TENANT_ID: tenantId,
      }),
    ).toThrowError(EntraVerifierConfigurationError);
  });

  it('accepts complete trusted configuration and returns identity evidence without app roles', async () => {
    expect(
      readEntraVerifierConfiguration({
        ENTRA_API_AUDIENCE: audience,
        ENTRA_ISSUER: issuer,
        ENTRA_JWKS_URI: configuration.jwksUri,
        ENTRA_REQUIRED_SCOPE: 'access_as_user',
        ENTRA_TENANT_ID: tenantId,
      }),
    ).toEqual({ available: true, configuration });
    const signed = await token({ claims: { email: 'private@example.test', role: 'admin' } });
    const result = await verifier().verify(signed, now);
    expect(result).toEqual({
      issuer,
      scopes: ['openid', 'access_as_user'],
      subject: 'external-subject-001',
      tenantId,
      tokenVersion: '2.0',
    });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('role');
  });

  it.each([
    ['issuer', { iss: `${issuer}/wrong` }],
    ['audience', { aud: '00000000-0000-4000-8000-000000000003' }],
    ['tenant', { tid: '00000000-0000-4000-8000-000000000003' }],
    ['version', { ver: '1.0' }],
    ['scope', { scp: 'openid profile' }],
    ['duplicate scope', { scp: 'access_as_user access_as_user' }],
    ['expired time', { exp: nowSeconds - 1 }],
    ['future not-before', { nbf: nowSeconds + 120 }],
    ['future issued-at', { iat: nowSeconds + 120 }],
  ])('rejects a wrong %s with one bounded authentication error', async (_label, claims) => {
    const signed = await token({ claims });
    await expect(verifier().verify(signed, now)).rejects.toEqual(new EntraTokenVerificationError());
  });

  it('rejects algorithm confusion, a wrong signing key, unknown key, malformed token, and oversized token', async () => {
    const ellipticCurve = await generateKeyPair('ES256');
    const wrongAlgorithm = await new SignJWT(standardClaims())
      .setProtectedHeader({ alg: 'ES256', kid: 'key-one', typ: 'JWT' })
      .sign(ellipticCurve.privateKey);
    const attackerKeyLocation = await new SignJWT(standardClaims())
      .setProtectedHeader({
        alg: 'RS256',
        jku: 'https://attacker.invalid/keys',
        kid: 'key-one',
        typ: 'JWT',
      })
      .sign(firstPrivateKey);
    const wrongSignature = await token({ key: secondPrivateKey });
    const unknownKey = await token({ keyId: 'unknown-key' });
    await expect(verifier().verify(wrongAlgorithm, now)).rejects.toThrow(
      EntraTokenVerificationError,
    );
    await expect(verifier().verify(attackerKeyLocation, now)).rejects.toThrow(
      EntraTokenVerificationError,
    );
    await expect(verifier().verify(wrongSignature, now)).rejects.toThrow(
      EntraTokenVerificationError,
    );
    await expect(verifier().verify(unknownKey, now)).rejects.toThrow(EntraTokenVerificationError);
    await expect(verifier().verify('not-a-jwt', now)).rejects.toThrow(EntraTokenVerificationError);
    await expect(verifier().verify(`a.${'b'.repeat(16_500)}.c`, now)).rejects.toThrow(
      EntraTokenVerificationError,
    );
  });

  it('caches a trusted JWKS and reloads once for a rotated signing key', async () => {
    let fetchCount = 0;
    const resolver = createRemoteEntraKeyResolver(configuration, {
      cooldownDurationMs: 0,
      fetch: async (url, options) => {
        fetchCount += 1;
        expect(url).toBe(configuration.jwksUri);
        expect(options.redirect).toBe('manual');
        return new Response(
          JSON.stringify({
            keys: fetchCount === 1 ? [firstPublicJwk] : [firstPublicJwk, secondPublicJwk],
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        );
      },
    });
    const remoteVerifier = new EntraAccessTokenVerifier(configuration, resolver);
    const first = await token({});
    await expect(remoteVerifier.verify(first, now)).resolves.toMatchObject({
      subject: 'external-subject-001',
    });
    await expect(remoteVerifier.verify(first, now)).resolves.toMatchObject({
      subject: 'external-subject-001',
    });
    expect(fetchCount).toBe(1);

    const rotated = await token({ key: secondPrivateKey, keyId: 'key-two' });
    await expect(remoteVerifier.verify(rotated, now)).resolves.toMatchObject({
      subject: 'external-subject-001',
    });
    expect(fetchCount).toBe(2);
  });

  it('never exposes token claims, key IDs, or provider failures in verification errors', async () => {
    const privateMarker = 'private-provider-marker';
    const signed = await token({ claims: { private_marker: privateMarker }, keyId: 'unknown-key' });
    let error: unknown;
    try {
      await verifier().verify(signed, now);
    } catch (caught) {
      error = caught;
    }
    expect(error).toEqual(new EntraTokenVerificationError());
    expect(JSON.stringify(error)).not.toContain(privateMarker);
    expect(String(error)).not.toContain('unknown-key');
    expect(String(error)).not.toContain(signed);
  });
});
