import { describe, expect, it } from 'vitest';

import { healthStatusSchema } from './index.js';

describe('healthStatusSchema', () => {
  it('accepts a valid local health payload', () => {
    expect(
      healthStatusSchema.parse({
        environment: 'local',
        service: 'local-missions-api',
        status: 'ok',
        version: '0.1.0',
      }),
    ).toBeTruthy();
  });

  it('rejects an unknown environment', () => {
    expect(() =>
      healthStatusSchema.parse({
        environment: 'live-ish',
        service: 'local-missions-api',
        status: 'ok',
        version: '0.1.0',
      }),
    ).toThrow();
  });
});
