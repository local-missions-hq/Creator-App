import { describe, expect, it } from 'vitest';

import { workerIdentity } from './worker.js';

describe('workerIdentity', () => {
  it('shows its local environment', () => {
    expect(workerIdentity('local')).toBe('local-missions-worker:local');
  });
});
