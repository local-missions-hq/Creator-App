import { describe, expect, it } from 'vitest';

import { campaignStatusValues, initialSchemaTables } from './index.js';

describe('initial schema', () => {
  it('declares the first transactional campaign lifecycle tables', () => {
    expect(initialSchemaTables).toEqual([
      'businesses',
      'campaigns',
      'campaign_status_history',
      'audit_events',
      'idempotency_records',
    ]);
  });

  it('exposes only the bounded first campaign states', () => {
    expect(campaignStatusValues).toEqual([
      'draft',
      'submitted',
      'approved',
      'funded',
      'published',
      'canceled',
    ]);
  });
});
