import { describe, expect, it } from 'vitest';

import { campaignRecordSchema, healthStatusSchema } from './index.js';

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

describe('campaignRecordSchema', () => {
  it('accepts integer-minor-unit money and the V1 pilot slot ceiling', () => {
    expect(
      campaignRecordSchema.parse({
        businessId: '10000000-0000-4000-8000-000000000001',
        creatorRewardPoolMinor: 50_000,
        currency: 'USD',
        id: '20000000-0000-4000-8000-000000000001',
        platformFeeMinor: 7_500,
        publicId: 'cmp_orlando_preview_001',
        slotCount: 10,
        status: 'draft',
        title: 'Family Adventure Preview',
        totalDueMinor: 57_500,
        version: 1,
      }),
    ).toBeTruthy();
  });

  it('rejects floating-point money and slot counts above the pilot ceiling', () => {
    expect(() =>
      campaignRecordSchema.parse({
        businessId: '10000000-0000-4000-8000-000000000001',
        creatorRewardPoolMinor: 50_000.5,
        currency: 'USD',
        id: '20000000-0000-4000-8000-000000000001',
        platformFeeMinor: 7_500,
        publicId: 'cmp_orlando_preview_001',
        slotCount: 21,
        status: 'draft',
        title: 'Family Adventure Preview',
        totalDueMinor: 57_500,
        version: 1,
      }),
    ).toThrow();
  });

  it('rejects a total that does not equal reward pool plus platform fee', () => {
    expect(() =>
      campaignRecordSchema.parse({
        businessId: '10000000-0000-4000-8000-000000000001',
        creatorRewardPoolMinor: 50_000,
        currency: 'USD',
        id: '20000000-0000-4000-8000-000000000001',
        platformFeeMinor: 7_500,
        publicId: 'cmp_orlando_preview_001',
        slotCount: 10,
        status: 'draft',
        title: 'Family Adventure Preview',
        totalDueMinor: 57_499,
        version: 1,
      }),
    ).toThrow(/Total due/);
  });
});
