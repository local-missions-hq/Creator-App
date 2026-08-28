import { describe, expect, it, vi } from 'vitest';

import { createMobileAccountDataAdapter } from './account-data';

describe('mobile account data adapter', () => {
  it('shows safe provider and session metadata without calling an identity provider locally', async () => {
    const get = vi.fn();
    const result = await createMobileAccountDataAdapter({
      client: { GET: get } as never,
      mode: 'local-preview',
    }).getAccountOverview();

    expect(result.source).toBe('local-preview');
    expect(result.data.identities.map((identity) => identity.provider)).toEqual([
      'apple',
      'google',
    ]);
    expect(result.data.sessions).toHaveLength(1);
    expect(result.data).not.toHaveProperty('email');
    expect(result.data.identities[0]).not.toHaveProperty('subject');
    expect(get).not.toHaveBeenCalled();
  });

  it('requires authentication and uses the generated account endpoint in API mode', async () => {
    await expect(
      createMobileAccountDataAdapter({
        client: { GET: vi.fn() } as never,
        mode: 'api',
      }).getAccountOverview(),
    ).rejects.toThrow(/authenticated session token/);

    const get = vi.fn().mockResolvedValue({ data: { identities: [], sessions: [] } });
    await createMobileAccountDataAdapter({
      accessToken: 'test-token-not-a-secret',
      client: { GET: get } as never,
      mode: 'api',
    }).getAccountOverview();
    expect(get).toHaveBeenCalledWith('/v1/account', {
      headers: { Authorization: 'Bearer test-token-not-a-secret' },
    });
  });

  it('never persists account mutations in local preview', async () => {
    const post = vi.fn();
    const remove = vi.fn();
    const adapter = createMobileAccountDataAdapter({
      client: { DELETE: remove, POST: post } as never,
      mode: 'local-preview',
    });

    await expect(adapter.revokeSession('ses_synthetic_creator_001')).rejects.toThrow(
      /never persists/,
    );
    await expect(
      adapter.createAccountRequest({
        publicId: 'acr_export_synthetic_001',
        sessionPublicId: 'ses_synthetic_creator_001',
        type: 'export',
      }),
    ).rejects.toThrow(/never persists/);
    await expect(adapter.unlinkIdentity('google', 'rag_synthetic_unlink_001')).rejects.toThrow(
      /never persists/,
    );
    expect(post).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('uses generated mutation routes and bearer authorization in API mode', async () => {
    const post = vi.fn().mockResolvedValue({ data: { status: 'requested', type: 'export' } });
    const remove = vi.fn().mockResolvedValue({ data: { provider: 'google', status: 'revoked' } });
    const adapter = createMobileAccountDataAdapter({
      accessToken: 'test-token-not-a-secret',
      client: { DELETE: remove, POST: post } as never,
      mode: 'api',
    });
    await adapter.createAccountRequest({
      publicId: 'acr_export_synthetic_001',
      sessionPublicId: 'ses_synthetic_creator_001',
      type: 'export',
    });
    await adapter.unlinkIdentity('google', 'rag_synthetic_unlink_001');

    expect(post).toHaveBeenCalledWith('/v1/account/requests', {
      body: {
        publicId: 'acr_export_synthetic_001',
        sessionPublicId: 'ses_synthetic_creator_001',
        type: 'export',
      },
      headers: { Authorization: 'Bearer test-token-not-a-secret' },
    });
    expect(remove).toHaveBeenCalledWith('/v1/account/identities/{provider}', {
      body: { recentAuthGrantPublicId: 'rag_synthetic_unlink_001' },
      headers: { Authorization: 'Bearer test-token-not-a-secret' },
      params: { path: { provider: 'google' } },
    });
  });
});
