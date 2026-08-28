import { describe, expect, it } from 'vitest';

import { campaignAudienceBudget } from './reach-preview';

describe('Reach campaign preview economics', () => {
  it('keeps the canonical ten-slot Community campaign at 500 dollars plus 15 percent', () => {
    expect(campaignAudienceBudget('community')).toEqual({
      communityRewardMinor: 50_000,
      communitySlots: 10,
      creatorRewardPoolMinor: 50_000,
      platformFeeMinor: 7_500,
      reachRewardMinor: 0,
      reachSlots: 0,
      totalDueMinor: 57_500,
    });
  });

  it('keeps at least 80 percent Community while pricing two Level 2 Reach slots visibly', () => {
    expect(campaignAudienceBudget('mixed')).toEqual({
      communityRewardMinor: 40_000,
      communitySlots: 8,
      creatorRewardPoolMinor: 60_000,
      platformFeeMinor: 9_000,
      reachRewardMinor: 20_000,
      reachSlots: 2,
      totalDueMinor: 69_000,
    });
  });
});
