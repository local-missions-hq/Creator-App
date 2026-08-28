import {
  createRemoteJWKSet,
  customFetch,
  type FetchImplementation,
  type JWTVerifyGetKey,
} from 'jose';

import { validateOidcConfiguration, type OidcConfiguration } from './oidc-client';
import {
  OidcSessionExchangeError,
  type OidcTokenEndpoint,
  type OidcTokenSet,
} from './oidc-session-exchange';

export type OidcFetch = (url: string, options: RequestInit) => Promise<Response>;

export type OidcTokenTransportOptions = {
  fetch?: OidcFetch;
  maxResponseBytes?: number;
  timeoutMilliseconds?: number;
};

export type OidcJwksTransportOptions = {
  cacheMaxAgeMilliseconds?: number;
  cooldownMilliseconds?: number;
  fetch?: OidcFetch;
  maxResponseBytes?: number;
  timeoutMilliseconds?: number;
};

export class OidcNetworkBoundaryError extends Error {
  constructor() {
    super('The secure sign-in service is unavailable.');
  }
}

const proofPattern = /^[A-Za-z0-9._~-]{32,8000}$/;
const codePattern = /^[\x21-\x7e]{8,4000}$/;
const verifierPattern = /^[A-Za-z0-9_-]{43,128}$/;
const jsonContentTypePattern = /^application\/json(?:\s*;\s*charset=utf-8)?$/i;

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const selected = value ?? fallback;
  if (!Number.isInteger(selected) || selected < minimum || selected > maximum) {
    throw new OidcNetworkBoundaryError();
  }
  return selected;
}

function defaultFetch(url: string, options: RequestInit): Promise<Response> {
  return globalThis.fetch(url, options);
}

async function readBoundedText(response: Response, maximumBytes: number): Promise<string> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maximumBytes) {
      throw new OidcNetworkBoundaryError();
    }
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maximumBytes) {
      throw new OidcNetworkBoundaryError();
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > maximumBytes) throw new OidcNetworkBoundaryError();
      chunks.push(result.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    throw new OidcNetworkBoundaryError();
  }
}

async function readExactJsonResponse(input: {
  expectedUrl: string;
  maximumBytes: number;
  response: Response;
}): Promise<{ parsed: unknown; text: string }> {
  const { response } = input;
  if (
    response.status !== 200 ||
    response.redirected ||
    response.type === 'opaqueredirect' ||
    (response.url !== '' && response.url !== input.expectedUrl) ||
    !jsonContentTypePattern.test(response.headers.get('content-type')?.trim() ?? '')
  ) {
    throw new OidcNetworkBoundaryError();
  }
  const text = await readBoundedText(response, input.maximumBytes);
  try {
    return { parsed: JSON.parse(text), text };
  } catch {
    throw new OidcNetworkBoundaryError();
  }
}

function tokenSetFromJson(value: unknown, requireIdentityAndRefresh: boolean): OidcTokenSet {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new OidcNetworkBoundaryError();
  }
  const record = value as Record<string, unknown>;
  if (
    record.token_type !== 'Bearer' ||
    typeof record.access_token !== 'string' ||
    !proofPattern.test(record.access_token) ||
    !Number.isInteger(record.expires_in) ||
    (record.expires_in as number) < 60 ||
    (record.expires_in as number) > 86_400 ||
    (requireIdentityAndRefresh &&
      (typeof record.id_token !== 'string' || !proofPattern.test(record.id_token))) ||
    (requireIdentityAndRefresh &&
      (typeof record.refresh_token !== 'string' || !proofPattern.test(record.refresh_token))) ||
    (record.id_token !== undefined &&
      (typeof record.id_token !== 'string' || !proofPattern.test(record.id_token))) ||
    (record.refresh_token !== undefined &&
      (typeof record.refresh_token !== 'string' || !proofPattern.test(record.refresh_token)))
  ) {
    throw new OidcNetworkBoundaryError();
  }
  return {
    accessToken: record.access_token,
    expiresInSeconds: record.expires_in as number,
    tokenType: 'Bearer',
    ...(typeof record.id_token === 'string' ? { idToken: record.id_token } : {}),
    ...(typeof record.refresh_token === 'string'
      ? { refreshCredential: record.refresh_token }
      : {}),
  };
}

export class HttpsOidcTokenEndpoint implements OidcTokenEndpoint {
  private readonly configuration: OidcConfiguration;
  private readonly fetch: OidcFetch;
  private readonly maximumBytes: number;
  private readonly timeoutMilliseconds: number;

  constructor(configuration: OidcConfiguration, options: OidcTokenTransportOptions = {}) {
    this.configuration = validateOidcConfiguration(configuration);
    this.fetch = options.fetch ?? defaultFetch;
    this.maximumBytes = boundedInteger(options.maxResponseBytes, 64 * 1024, 1024, 256 * 1024);
    this.timeoutMilliseconds = boundedInteger(options.timeoutMilliseconds, 10_000, 100, 30_000);
  }

  async exchangeCode(input: {
    clientId: string;
    code: string;
    redirectUri: string;
    verifier: string;
  }): Promise<OidcTokenSet> {
    if (
      input.clientId !== this.configuration.clientId ||
      input.redirectUri !== this.configuration.redirectUri ||
      !codePattern.test(input.code) ||
      !verifierPattern.test(input.verifier)
    ) {
      throw new OidcSessionExchangeError('OIDC_EXCHANGE_FAILED');
    }
    return this.request(
      new URLSearchParams({
        client_id: input.clientId,
        code: input.code,
        code_verifier: input.verifier,
        grant_type: 'authorization_code',
        redirect_uri: input.redirectUri,
      }),
      true,
      'OIDC_EXCHANGE_FAILED',
    );
  }

  async refresh(input: { clientId: string; refreshCredential: string }): Promise<OidcTokenSet> {
    if (
      input.clientId !== this.configuration.clientId ||
      !proofPattern.test(input.refreshCredential)
    ) {
      throw new OidcSessionExchangeError('OIDC_REFRESH_FAILED');
    }
    return this.request(
      new URLSearchParams({
        client_id: input.clientId,
        grant_type: 'refresh_token',
        refresh_token: input.refreshCredential,
      }),
      false,
      'OIDC_REFRESH_FAILED',
    );
  }

  private async request(
    body: URLSearchParams,
    requireIdentityAndRefresh: boolean,
    failureCode: 'OIDC_EXCHANGE_FAILED' | 'OIDC_REFRESH_FAILED',
  ): Promise<OidcTokenSet> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMilliseconds);
    try {
      const response = await this.fetch(this.configuration.tokenEndpoint, {
        body: body.toString(),
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        method: 'POST',
        redirect: 'manual',
        referrerPolicy: 'no-referrer',
        signal: abortController.signal,
      });
      const { parsed } = await readExactJsonResponse({
        expectedUrl: this.configuration.tokenEndpoint,
        maximumBytes: this.maximumBytes,
        response,
      });
      return tokenSetFromJson(parsed, requireIdentityAndRefresh);
    } catch {
      throw new OidcSessionExchangeError(failureCode);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createMobileOidcJwksResolver(
  configuration: OidcConfiguration,
  options: OidcJwksTransportOptions = {},
): JWTVerifyGetKey {
  const validated = validateOidcConfiguration(configuration);
  const fetch = options.fetch ?? defaultFetch;
  const maximumBytes = boundedInteger(options.maxResponseBytes, 64 * 1024, 1024, 256 * 1024);
  const timeoutDuration = boundedInteger(options.timeoutMilliseconds, 3_000, 100, 10_000);
  const cacheMaxAge = boundedInteger(
    options.cacheMaxAgeMilliseconds,
    10 * 60 * 1000,
    60_000,
    60 * 60 * 1000,
  );
  const cooldownDuration = boundedInteger(options.cooldownMilliseconds, 30_000, 0, 10 * 60 * 1000);

  const boundedFetch: FetchImplementation = async (url, request) => {
    try {
      if (url !== validated.jwksUri || request.method !== 'GET' || request.redirect !== 'manual') {
        throw new OidcNetworkBoundaryError();
      }
      const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'omit',
        headers: { accept: 'application/json' },
        method: 'GET',
        redirect: 'manual',
        referrerPolicy: 'no-referrer',
        signal: request.signal,
      });
      const bounded = await readExactJsonResponse({
        expectedUrl: validated.jwksUri,
        maximumBytes,
        response,
      });
      if (
        !bounded.parsed ||
        typeof bounded.parsed !== 'object' ||
        Array.isArray(bounded.parsed) ||
        !Array.isArray((bounded.parsed as { keys?: unknown }).keys) ||
        (bounded.parsed as { keys: unknown[] }).keys.length < 1 ||
        (bounded.parsed as { keys: unknown[] }).keys.length > 20
      ) {
        throw new OidcNetworkBoundaryError();
      }
      return new Response(bounded.text, {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    } catch {
      throw new OidcNetworkBoundaryError();
    }
  };

  return createRemoteJWKSet(new URL(validated.jwksUri), {
    cacheMaxAge,
    cooldownDuration,
    timeoutDuration,
    [customFetch]: boundedFetch,
  });
}
