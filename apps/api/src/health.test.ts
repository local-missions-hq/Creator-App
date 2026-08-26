import { describe, expect, it } from 'vitest';

import { buildHealthStatus } from './health.js';

describe('buildHealthStatus', () => {
  it('returns a local non-secret status payload', () => {
    expect(buildHealthStatus('local')).toEqual({
      environment: 'local',
      service: 'local-missions-api',
      status: 'ok',
      version: '0.1.0',
    });
  });
});
