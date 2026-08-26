import { describe, expect, it } from 'vitest';

import { syntheticOrlandoCampaign } from './index.js';

describe('syntheticOrlandoCampaign', () => {
  it('reconciles the founder-approved 15 percent fee example', () => {
    expect(
      syntheticOrlandoCampaign.creatorRewardPoolCents + syntheticOrlandoCampaign.platformFeeCents,
    ).toBe(syntheticOrlandoCampaign.totalDueCents);
  });
});
