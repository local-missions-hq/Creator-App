import { describe, expect, it, vi } from 'vitest';

import { createMobileSessionDataAdapter } from './session-data';

const accessToken = 'provider-access-token-synthetic-000000000001';
const sessionPublicId = `ses_${'a'.repeat(64)}`;
const projection = {
  accountStatus: 'active' as const,
  expiresAt: '2026-09-27T14:00:00.000Z',
  provider: 'apple' as const,
  roles: ['creator', 'business_owner'] as const,
  sessionPublicId,
  userPublicId: 'usr_synthetic_session_adapter_001',
  workspaces: [
    {
      name: 'Demo Family Fun Center',
      publicId: 'biz_synthetic_orlando_001',
      role: 'owner' as const,
    },
  ],
};

describe('mobile Local Missions session adapter', () => {
  it('bootstraps through the generated client and keeps provider evidence out of the projection', async () => {
    const post = vi.fn().mockResolvedValue({ data: projection });
    const adapter = createMobileSessionDataAdapter({ POST: post } as never);

    const result = await adapter.bootstrap({ accessToken, sessionPublicId });

    expect(post).toHaveBeenCalledWith('/v1/session/bootstrap', {
      body: { sessionPublicId },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(result).toMatchObject({
      roles: ['creator', 'business_owner'],
      workspaces: [
        {
          name: 'Demo Family Fun Center',
          publicId: 'biz_synthetic_orlando_001',
          role: 'business_owner',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(accessToken);
    expect(result).not.toHaveProperty('workspacePublicId');
  });

  it('refreshes only the requested Local Missions session and rejects malformed access tokens', async () => {
    const post = vi.fn().mockResolvedValue({ data: projection });
    const adapter = createMobileSessionDataAdapter({ POST: post } as never);

    await adapter.refresh({ accessToken, sessionPublicId });
    expect(post).toHaveBeenCalledWith('/v1/session/refresh', {
      body: { sessionPublicId },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await expect(adapter.bootstrap({ accessToken: 'too-short', sessionPublicId })).rejects.toThrow(
      /verified provider access token/,
    );
  });
});
