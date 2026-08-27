import { describe, expect, it, vi } from 'vitest';

import { createLocalMissionsApiClient } from './index.js';

describe('createLocalMissionsApiClient', () => {
  it('permits HTTPS and loopback HTTP but rejects remote plaintext transport', () => {
    expect(() =>
      createLocalMissionsApiClient({ baseUrl: 'https://api.example.test' }),
    ).not.toThrow();
    expect(() => createLocalMissionsApiClient({ baseUrl: 'http://127.0.0.1:4000' })).not.toThrow();
    expect(() => createLocalMissionsApiClient({ baseUrl: 'http://api.example.test' })).toThrow(
      /HTTPS/,
    );
  });

  it('uses the generated route contract with an injected fetch implementation', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ service: 'local-missions-api', status: 'ok', version: '0.1.0' }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      );
    const client = createLocalMissionsApiClient({
      baseUrl: 'http://localhost:4000',
      fetch: fetchMock,
    });

    const response = await client.GET('/health/live');

    expect(response.error).toBeUndefined();
    expect(response.data?.status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]?.[0];
    expect(request instanceof Request ? request.url : String(request)).toContain('/health/live');
  });
});
