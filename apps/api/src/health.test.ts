import { describe, expect, it } from 'vitest';

import { buildLegacyHealthStatus } from './health.js';

describe('buildLegacyHealthStatus', () => {
  it('returns a local non-secret status payload', () => {
    expect(buildLegacyHealthStatus()).toEqual({
      environment: 'local',
      service: 'local-missions-api',
      status: 'ok',
      version: '0.1.0',
    });
  });
});
