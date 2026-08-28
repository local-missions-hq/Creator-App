export type OidcProviderIntent = 'apple' | 'google' | 'microsoft' | 'passwordless_email';
export type OidcPurpose = 'identity_link' | 'recent_auth' | 'sign_in';

export type OidcConfiguration = {
  authorizationEndpoint: string;
  clientId: string;
  issuer: string;
  jwksUri: string;
  redirectUri: string;
  scopes: string[];
  tokenEndpoint: string;
};

export type OidcTransaction = {
  codeChallenge: string;
  codeVerifier: string;
  createdAt: string;
  expiresAt: string;
  nonce: string;
  providerIntent: OidcProviderIntent;
  purpose: OidcPurpose;
  redirectUri: string;
  state: string;
  version: 1;
};

export type OidcAuthorizationRequest = {
  authorizationUrl: string;
  transaction: OidcTransaction;
};

export type OidcCallbackResult =
  | { code: string; nonce: string; status: 'code_received'; verifier: string }
  | { reason: 'user_cancelled'; status: 'cancelled' }
  | { code: 'provider_error'; status: 'error' };

export type OidcCryptoBoundary = {
  randomBytes(length: number): Promise<Uint8Array>;
  sha256(value: string): Promise<Uint8Array>;
};

export interface OidcTransactionStore {
  clear(): Promise<void>;
  consume(state: string): Promise<OidcTransaction | null>;
  save(transaction: OidcTransaction): Promise<void>;
}

export class OidcBoundaryError extends Error {
  constructor(
    readonly code:
      | 'OIDC_CALLBACK_INVALID'
      | 'OIDC_CONFIG_INVALID'
      | 'OIDC_STATE_INVALID'
      | 'OIDC_TRANSACTION_EXPIRED',
  ) {
    super('The secure sign-in request could not be verified.');
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tenantPathPattern =
  /^\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const opaquePattern = /^[A-Za-z0-9_-]{43,128}$/;
const apiScopePattern =
  /^api:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/access_as_user$/i;

function base64Url(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const value = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    output += alphabet[(value >>> 18) & 63];
    output += alphabet[(value >>> 12) & 63];
    if (second !== undefined) output += alphabet[(value >>> 6) & 63];
    if (third !== undefined) output += alphabet[value & 63];
  }
  return output;
}

function canonicalRedirect(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'localmissions:' ||
    url.hostname !== 'auth' ||
    url.pathname !== '/callback' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new OidcBoundaryError('OIDC_CONFIG_INVALID');
  }
  return 'localmissions://auth/callback';
}

function trustedEndpoint(value: string, pathSuffix: string): URL {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.port ||
    !url.hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.includes(':') ||
    /^[0-9.]+$/u.test(hostname) ||
    !url.pathname.endsWith(pathSuffix)
  ) {
    throw new OidcBoundaryError('OIDC_CONFIG_INVALID');
  }
  return url;
}

export function readOidcConfiguration(
  environment: Record<string, string | undefined>,
): { available: false } | { available: true; configuration: OidcConfiguration } {
  const values = {
    authorizationEndpoint: environment.EXPO_PUBLIC_ENTRA_AUTHORIZATION_ENDPOINT?.trim(),
    clientId: environment.EXPO_PUBLIC_ENTRA_CLIENT_ID?.trim(),
    issuer: environment.EXPO_PUBLIC_ENTRA_ISSUER?.trim(),
    jwksUri: environment.EXPO_PUBLIC_ENTRA_JWKS_URI?.trim(),
    redirectUri: environment.EXPO_PUBLIC_ENTRA_REDIRECT_URI?.trim(),
    scope: environment.EXPO_PUBLIC_ENTRA_SCOPE?.trim(),
    tokenEndpoint: environment.EXPO_PUBLIC_ENTRA_TOKEN_ENDPOINT?.trim(),
  };
  if (Object.values(values).every((value) => !value)) return { available: false };
  if (Object.values(values).some((value) => !value)) {
    throw new OidcBoundaryError('OIDC_CONFIG_INVALID');
  }

  return {
    available: true,
    configuration: validateOidcConfiguration({
      authorizationEndpoint: values.authorizationEndpoint!,
      clientId: values.clientId!,
      issuer: values.issuer!,
      jwksUri: values.jwksUri!,
      redirectUri: values.redirectUri!,
      scopes: values.scope!.split(/\s+/u).filter(Boolean),
      tokenEndpoint: values.tokenEndpoint!,
    }),
  };
}

export function validateOidcConfiguration(configuration: OidcConfiguration): OidcConfiguration {
  const authorizationEndpoint = trustedEndpoint(
    configuration.authorizationEndpoint,
    '/oauth2/v2.0/authorize',
  );
  const issuer = trustedEndpoint(configuration.issuer, '/v2.0');
  const jwksUri = trustedEndpoint(configuration.jwksUri, '/discovery/v2.0/keys');
  const tokenEndpoint = trustedEndpoint(configuration.tokenEndpoint, '/oauth2/v2.0/token');
  const tenantPrefixes = [
    authorizationEndpoint.pathname.slice(0, -'/oauth2/v2.0/authorize'.length),
    issuer.pathname.slice(0, -'/v2.0'.length),
    jwksUri.pathname.slice(0, -'/discovery/v2.0/keys'.length),
    tokenEndpoint.pathname.slice(0, -'/oauth2/v2.0/token'.length),
  ];
  if (
    authorizationEndpoint.origin !== issuer.origin ||
    authorizationEndpoint.origin !== jwksUri.origin ||
    authorizationEndpoint.origin !== tokenEndpoint.origin ||
    tenantPrefixes.some((prefix) => !prefix || prefix !== tenantPrefixes[0]) ||
    !tenantPathPattern.test(tenantPrefixes[0]!)
  ) {
    throw new OidcBoundaryError('OIDC_CONFIG_INVALID');
  }
  if (!uuidPattern.test(configuration.clientId)) {
    throw new OidcBoundaryError('OIDC_CONFIG_INVALID');
  }
  const scopes = configuration.scopes;
  if (
    scopes.length !== 4 ||
    new Set(scopes).size !== scopes.length ||
    !scopes.includes('openid') ||
    !scopes.includes('profile') ||
    !scopes.includes('offline_access') ||
    scopes.filter((scope) => apiScopePattern.test(scope)).length !== 1
  ) {
    throw new OidcBoundaryError('OIDC_CONFIG_INVALID');
  }
  return {
    authorizationEndpoint: authorizationEndpoint.toString(),
    clientId: configuration.clientId,
    issuer: issuer.toString(),
    jwksUri: jwksUri.toString(),
    redirectUri: canonicalRedirect(configuration.redirectUri),
    scopes: [...scopes],
    tokenEndpoint: tokenEndpoint.toString(),
  };
}

export async function createOidcAuthorizationRequest(input: {
  configuration: OidcConfiguration;
  crypto: OidcCryptoBoundary;
  now?: Date;
  providerIntent: OidcProviderIntent;
  purpose: OidcPurpose;
}): Promise<OidcAuthorizationRequest> {
  const now = input.now ?? new Date();
  const [verifierBytes, stateBytes, nonceBytes] = await Promise.all([
    input.crypto.randomBytes(32),
    input.crypto.randomBytes(32),
    input.crypto.randomBytes(32),
  ]);
  const codeVerifier = base64Url(verifierBytes);
  const state = base64Url(stateBytes);
  const nonce = base64Url(nonceBytes);
  const codeChallenge = base64Url(await input.crypto.sha256(codeVerifier));
  if (![codeVerifier, state, nonce, codeChallenge].every((value) => opaquePattern.test(value))) {
    throw new OidcBoundaryError('OIDC_CONFIG_INVALID');
  }
  const transaction: OidcTransaction = {
    codeChallenge,
    codeVerifier,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    nonce,
    providerIntent: input.providerIntent,
    purpose: input.purpose,
    redirectUri: input.configuration.redirectUri,
    state,
    version: 1,
  };
  const url = new URL(input.configuration.authorizationEndpoint);
  url.searchParams.set('client_id', input.configuration.clientId);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('redirect_uri', input.configuration.redirectUri);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', input.configuration.scopes.join(' '));
  url.searchParams.set('state', state);
  return { authorizationUrl: url.toString(), transaction };
}

function oneValue(url: URL, key: string): string | undefined {
  const values = url.searchParams.getAll(key);
  if (values.length > 1) throw new OidcBoundaryError('OIDC_CALLBACK_INVALID');
  return values[0];
}

export async function consumeOidcCallback(input: {
  callbackUrl: string;
  now?: Date;
  store: OidcTransactionStore;
}): Promise<OidcCallbackResult> {
  let callback: URL;
  try {
    callback = new URL(input.callbackUrl);
  } catch {
    throw new OidcBoundaryError('OIDC_CALLBACK_INVALID');
  }
  if (
    callback.protocol !== 'localmissions:' ||
    callback.hostname !== 'auth' ||
    callback.pathname !== '/callback' ||
    callback.username ||
    callback.password ||
    callback.hash
  ) {
    throw new OidcBoundaryError('OIDC_CALLBACK_INVALID');
  }
  const allowedParameters = new Set([
    'code',
    'correlation_id',
    'error',
    'error_codes',
    'error_description',
    'error_uri',
    'session_state',
    'state',
    'timestamp',
    'trace_id',
  ]);
  for (const key of callback.searchParams.keys()) {
    if (!allowedParameters.has(key)) throw new OidcBoundaryError('OIDC_CALLBACK_INVALID');
  }
  const state = oneValue(callback, 'state');
  if (!state || !opaquePattern.test(state)) throw new OidcBoundaryError('OIDC_STATE_INVALID');
  const transaction = await input.store.consume(state);
  if (!transaction) throw new OidcBoundaryError('OIDC_STATE_INVALID');
  if (transaction.redirectUri !== 'localmissions://auth/callback') {
    throw new OidcBoundaryError('OIDC_CALLBACK_INVALID');
  }
  if (Date.parse(transaction.expiresAt) <= (input.now ?? new Date()).getTime()) {
    throw new OidcBoundaryError('OIDC_TRANSACTION_EXPIRED');
  }
  const error = oneValue(callback, 'error');
  const code = oneValue(callback, 'code');
  if (error === 'access_denied' && !code) return { reason: 'user_cancelled', status: 'cancelled' };
  if (error && !code) return { code: 'provider_error', status: 'error' };
  if (!code || error || code.length < 8 || code.length > 4_000) {
    throw new OidcBoundaryError('OIDC_CALLBACK_INVALID');
  }
  return {
    code,
    nonce: transaction.nonce,
    status: 'code_received',
    verifier: transaction.codeVerifier,
  };
}
