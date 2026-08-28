import {
  createOidcAuthorizationRequest,
  type OidcConfiguration,
  type OidcProviderIntent,
} from './oidc-client';
import { expoOidcCryptoBoundary } from './oidc-runtime';
import { MemoryOidcTransactionStore } from './oidc-transaction-storage';

const syntheticConfiguration: OidcConfiguration = {
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

const previewStore = new MemoryOidcTransactionStore();

export async function createLocalOidcPreview(providerIntent: OidcProviderIntent) {
  const request = await createOidcAuthorizationRequest({
    configuration: syntheticConfiguration,
    crypto: expoOidcCryptoBoundary,
    providerIntent,
    purpose: 'sign_in',
  });
  await previewStore.save(request.transaction);
  return {
    expiresAt: request.transaction.expiresAt,
    providerIntent,
    status: 'ready' as const,
  };
}
