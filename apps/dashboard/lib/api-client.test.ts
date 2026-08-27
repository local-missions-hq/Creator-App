import { describe, expect, it } from 'vitest';

import { createDashboardApiClient } from './api-client';

describe('createDashboardApiClient', () => {
  it('uses the shared generated production API contract', () => {
    expect(() => createDashboardApiClient('https://api.example.test')).not.toThrow();
    expect(() => createDashboardApiClient('http://remote.example.test')).toThrow(/HTTPS/);
  });
});
