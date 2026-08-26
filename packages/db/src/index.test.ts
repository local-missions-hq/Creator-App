import { describe, expect, it } from 'vitest';

import { initialSchemaTables } from './index.js';

describe('initial schema', () => {
  it('starts with append-only audit metadata', () => {
    expect(initialSchemaTables).toContain('audit_events');
  });
});
