export type CampaignAudienceMode = 'community' | 'mixed';

export type CampaignAudienceBudget = {
  communityRewardMinor: number;
  communitySlots: number;
  creatorRewardPoolMinor: number;
  platformFeeMinor: number;
  reachRewardMinor: number;
  reachSlots: number;
  totalDueMinor: number;
};

export function campaignAudienceBudget(
  mode: CampaignAudienceMode,
  levelTwoRewardMultiplierBps = 20_000,
): CampaignAudienceBudget {
  const communitySlots = mode === 'community' ? 10 : 8;
  const reachSlots = mode === 'community' ? 0 : 2;
  const communityRewardMinor = communitySlots * 5_000;
  const reachRewardMinor = reachSlots * Math.round((5_000 * levelTwoRewardMultiplierBps) / 10_000);
  const creatorRewardPoolMinor = communityRewardMinor + reachRewardMinor;
  const platformFeeMinor = Math.round(creatorRewardPoolMinor * 0.15);

  return {
    communityRewardMinor,
    communitySlots,
    creatorRewardPoolMinor,
    platformFeeMinor,
    reachRewardMinor,
    reachSlots,
    totalDueMinor: creatorRewardPoolMinor + platformFeeMinor,
  };
}
