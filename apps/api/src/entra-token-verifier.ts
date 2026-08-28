import { isIP } from 'node:net';

import {
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
  type FetchImplementation,
  type JWTVerifyGetKey,
} from 'jose';

export type EntraVerifierConfiguration = {
  audience: string;
  issuer: string;
  jwksUri: string;
  requiredScope: string;
  tenantId: string;
};

export type VerifiedEntraAccessToken = {
  issuer: string;
  scopes: string[];
  subject: string;
  tenantId: string;
  tokenVersion: '2.0';
};

type RemoteResolverOptions = {
  cacheMaxAgeMs?: number;
  cooldownDurationMs?: number;
  fetch?: FetchImplementation;
  timeoutDurationMs?: number;
};

export class EntraVerifierConfigurationError extends Error {
  constructor() {
    super('External identity verification is not configured safely.');
  }
}

export class EntraTokenVerificationError extends Error {
  constructor() {
    super('Authentication is required.');
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const scopePattern = /^[A-Za-z0-9._:-]{1,120}$/;
const subjectPattern = /^[A-Za-z0-9._:@~-]{1,256}$/;
const tokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function trustedHttpsUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EntraVerifierConfigurationError();
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.port ||
    !url.hostname ||
    url.hostname === 'localhost' ||
    isIP(url.hostname) !== 0
  ) {
    throw new EntraVerifierConfigurationError();
  }
  return url;
}

function validateConfiguration(configuration: EntraVerifierConfiguration) {
  const issuer = trustedHttpsUrl(configuration.issuer);
  const jwks = trustedHttpsUrl(configuration.jwksUri);
  if (
    !uuidPattern.test(configuration.audience) ||
    !uuidPattern.test(configuration.tenantId) ||
    configuration.requiredScope !== 'access_as_user' ||
    issuer.hostname !== jwks.hostname ||
    !issuer.pathname.split('/').includes(configuration.tenantId) ||
    !issuer.pathname.endsWith('/v2.0') ||
    !jwks.pathname.endsWith('/discovery/v2.0/keys')
  ) {
    throw new EntraVerifierConfigurationError();
  }
}

export function readEntraVerifierConfiguration(
  environment: Record<string, string | undefined>,
): { available: false } | { available: true; configuration: EntraVerifierConfiguration } {
  const values = {
    audience: environment.ENTRA_API_AUDIENCE?.trim(),
    issuer: environment.ENTRA_ISSUER?.trim(),
    jwksUri: environment.ENTRA_JWKS_URI?.trim(),
    requiredScope: environment.ENTRA_REQUIRED_SCOPE?.trim(),
    tenantId: environment.ENTRA_TENANT_ID?.trim(),
  };
  if (Object.values(values).every((value) => !value)) return { available: false };
  if (Object.values(values).some((value) => !value)) {
    throw new EntraVerifierConfigurationError();
  }
  const configuration: EntraVerifierConfiguration = {
    audience: values.audience!,
    issuer: values.issuer!,
    jwksUri: values.jwksUri!,
    requiredScope: values.requiredScope!,
    tenantId: values.tenantId!,
  };
  validateConfiguration(configuration);
  return { available: true, configuration };
}

export function createRemoteEntraKeyResolver(
  configuration: EntraVerifierConfiguration,
  options: RemoteResolverOptions = {},
) {
  validateConfiguration(configuration);
  return createRemoteJWKSet(new URL(configuration.jwksUri), {
    cacheMaxAge: options.cacheMaxAgeMs ?? 10 * 60 * 1000,
    cooldownDuration: options.cooldownDurationMs ?? 30 * 1000,
    timeoutDuration: options.timeoutDurationMs ?? 3 * 1000,
    ...(options.fetch ? { [customFetch]: options.fetch } : {}),
  });
}

export class EntraAccessTokenVerifier {
  constructor(
    private readonly configuration: EntraVerifierConfiguration,
    private readonly keyResolver: JWTVerifyGetKey,
  ) {
    validateConfiguration(configuration);
  }

  async verify(token: string, now = new Date()): Promise<VerifiedEntraAccessToken> {
    if (token.length < 100 || token.length > 16_384 || !tokenPattern.test(token)) {
      throw new EntraTokenVerificationError();
    }
    try {
      const { payload, protectedHeader } = await jwtVerify(token, this.keyResolver, {
        algorithms: ['RS256'],
        audience: this.configuration.audience,
        clockTolerance: 30,
        currentDate: now,
        issuer: this.configuration.issuer,
        requiredClaims: ['exp', 'iat', 'iss', 'nbf', 'scp', 'sub', 'tid', 'ver'],
        typ: 'JWT',
      });
      if (
        protectedHeader.alg !== 'RS256' ||
        protectedHeader.jku !== undefined ||
        protectedHeader.jwk !== undefined ||
        protectedHeader.x5u !== undefined ||
        protectedHeader.x5c !== undefined ||
        typeof protectedHeader.kid !== 'string' ||
        protectedHeader.kid.length < 1 ||
        protectedHeader.kid.length > 160 ||
        typeof payload.sub !== 'string' ||
        !subjectPattern.test(payload.sub) ||
        payload.tid !== this.configuration.tenantId ||
        payload.ver !== '2.0' ||
        typeof payload.scp !== 'string' ||
        payload.scp.length > 2_048 ||
        typeof payload.iat !== 'number' ||
        !Number.isSafeInteger(payload.iat) ||
        typeof payload.nbf !== 'number' ||
        !Number.isSafeInteger(payload.nbf) ||
        typeof payload.exp !== 'number' ||
        !Number.isSafeInteger(payload.exp) ||
        payload.iat > Math.floor(now.getTime() / 1000) + 30 ||
        payload.nbf > payload.exp ||
        payload.exp <= payload.iat ||
        payload.exp - payload.iat > 24 * 60 * 60
      ) {
        throw new EntraTokenVerificationError();
      }
      const scopes = payload.scp.split(' ').filter(Boolean);
      if (
        scopes.length === 0 ||
        new Set(scopes).size !== scopes.length ||
        scopes.some((scope) => !scopePattern.test(scope)) ||
        !scopes.includes(this.configuration.requiredScope)
      ) {
        throw new EntraTokenVerificationError();
      }
      return {
        issuer: this.configuration.issuer,
        scopes,
        subject: payload.sub,
        tenantId: this.configuration.tenantId,
        tokenVersion: '2.0',
      };
    } catch (error) {
      if (error instanceof EntraTokenVerificationError) throw error;
      throw new EntraTokenVerificationError();
    }
  }
}
