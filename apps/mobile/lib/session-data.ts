import type { LocalMissionsApiClient, operations } from '@local-missions/api-client';

import { createMobileApiClient } from './api-client';
import type {
  MobileSessionBootstrap,
  MobileSessionBootstrapBoundary,
} from './oidc-session-exchange';

type ServerSessionBootstrap =
  operations['SessionController_bootstrap']['responses'][200]['content']['application/json'];

function mobileProjection(value: ServerSessionBootstrap): MobileSessionBootstrap {
  const workspaces = value.workspaces.map((workspace) => ({
    name: workspace.name,
    publicId: workspace.publicId,
    role: workspace.role === 'owner' ? ('business_owner' as const) : ('business_manager' as const),
  }));
  return {
    accountStatus: value.accountStatus,
    expiresAt: value.expiresAt,
    provider: value.provider,
    roles: value.roles,
    sessionPublicId: value.sessionPublicId,
    userPublicId: value.userPublicId,
    workspaces,
  };
}

function bearerHeaders(accessToken: string): { Authorization: string } {
  if (!/^[A-Za-z0-9._~-]{32,8000}$/.test(accessToken)) {
    throw new Error('Session bootstrap requires a verified provider access token.');
  }
  return { Authorization: `Bearer ${accessToken}` };
}

export function createMobileSessionDataAdapter(
  client: LocalMissionsApiClient = createMobileApiClient(),
): MobileSessionBootstrapBoundary {
  return {
    async bootstrap(input) {
      const response = await client.POST('/v1/session/bootstrap', {
        body: { sessionPublicId: input.sessionPublicId },
        headers: bearerHeaders(input.accessToken),
      });
      if (!response.data) throw new Error('The secure app session could not be started.');
      return mobileProjection(response.data);
    },
    async refresh(input) {
      const response = await client.POST('/v1/session/refresh', {
        body: { sessionPublicId: input.sessionPublicId },
        headers: bearerHeaders(input.accessToken),
      });
      if (!response.data) throw new Error('The secure app session could not be refreshed.');
      return mobileProjection(response.data);
    },
  };
}
