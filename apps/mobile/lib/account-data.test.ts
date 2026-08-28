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
});
