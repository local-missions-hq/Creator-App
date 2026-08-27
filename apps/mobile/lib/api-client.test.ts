import { describe, expect, it } from 'vitest';

import { createMobileApiClient } from './api-client';

describe('createMobileApiClient', () => {
  it('uses the shared generated production API contract', () => {
    expect(() => createMobileApiClient('http://127.0.0.1:4000')).not.toThrow();
    expect(() => createMobileApiClient('http://remote.example.test')).toThrow(/HTTPS/);
  });
});
