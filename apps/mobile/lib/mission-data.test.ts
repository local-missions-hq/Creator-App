import { describe, expect, it, vi } from 'vitest';

import { createMobileMissionDataAdapter } from './mission-data';

describe('mobile mission data adapter', () => {
  it('uses an explicit local preview without making a provider or API call', async () => {
    const fetch = vi.fn();
    const adapter = createMobileMissionDataAdapter({
      client: { GET: fetch } as never,
      mode: 'local-preview',
    });

    const creator = await adapter.getCreatorMissions();
    const business = await adapter.getBusinessCampaigns();

    expect(creator.source).toBe('local-preview');
    expect(creator.data.data[0]?.title).toBe('Family Adventure Preview');
    expect(business.data.data[0]?.totalDueMinor).toBe(57_500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses API mode without an authenticated session token', async () => {
    const adapter = createMobileMissionDataAdapter({
      client: { GET: vi.fn() } as never,
      mode: 'api',
    });

    await expect(adapter.getCreatorMissions()).rejects.toThrow(/authenticated session token/);
  });

  it('passes bearer context to the generated API client in API mode', async () => {
    const response = {
      data: { data: [], page: { hasMore: false, limit: 20, nextCursor: null } },
    };
    const get = vi.fn().mockResolvedValue(response);
    const adapter = createMobileMissionDataAdapter({
      accessToken: 'test-token-not-a-secret',
      client: { GET: get } as never,
      mode: 'api',
    });

    await expect(adapter.getCreatorMissions()).resolves.toMatchObject({ source: 'api' });
    expect(get).toHaveBeenCalledWith('/v1/creator/missions', {
      headers: { Authorization: 'Bearer test-token-not-a-secret' },
      params: { query: { limit: 20 } },
    });
  });
});
