import { describe, expect, it, vi } from 'vitest';

import { createMobileReachDataAdapter } from './reach-data';

describe('mobile Reach data adapter', () => {
  it('keeps local preview provider-free and explicitly disabled', async () => {
    const get = vi.fn();
    const adapter = createMobileReachDataAdapter({
      client: { GET: get } as never,
      mode: 'local-preview',
    });

    const creator = await adapter.getCreatorReach();
    const business = await adapter.getBusinessReachOptions();

    expect(creator.source).toBe('local-preview');
    expect(creator.data.communityAccessIndependent).toBe(true);
    expect(creator.data.platforms.every((item) => !item.connectionAvailable)).toBe(true);
    expect(business.data.communityMinimumPercent).toBe(80);
    expect(business.data.rawAudienceFiltersAllowed).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it('never silently falls back or mutates consent in local preview', async () => {
    const adapter = createMobileReachDataAdapter({ mode: 'local-preview' });
    await expect(adapter.grantConsent('instagram')).rejects.toThrow(/never records Reach consent/);
    await expect(adapter.revokeConsent('instagram')).rejects.toThrow(/never revokes/);
  });

  it('requires authentication and uses generated Reach endpoints in API mode', async () => {
    const unauthenticated = createMobileReachDataAdapter({
      client: { GET: vi.fn() } as never,
      mode: 'api',
    });
    await expect(unauthenticated.getCreatorReach()).rejects.toThrow(/authenticated session token/);

    const get = vi.fn().mockResolvedValue({ data: { platforms: [] } });
    const adapter = createMobileReachDataAdapter({
      accessToken: 'test-token-not-a-secret',
      client: { GET: get } as never,
      mode: 'api',
    });
    await adapter.getCreatorReach();
    expect(get).toHaveBeenCalledWith('/v1/creator/reach', {
      headers: { Authorization: 'Bearer test-token-not-a-secret' },
    });
  });
});
