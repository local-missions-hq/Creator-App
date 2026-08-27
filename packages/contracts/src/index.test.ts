import { describe, expect, it } from 'vitest';

import {
  businessMembershipRoleSchema,
  campaignRecordSchema,
  disputeReasonCodeSchema,
  disputeResolutionOutcomeSchema,
  financialActionIntentStatusSchema,
  financialActionIntentTypeSchema,
  healthStatusSchema,
  identityProviderSchema,
  ledgerEntryDirectionSchema,
  ledgerTransactionTypeSchema,
  paymentProviderObjectTypeSchema,
} from './index.js';

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

describe('shared identity and business membership contracts', () => {
  it('accepts only the four approved V1 sign-in providers', () => {
    expect(identityProviderSchema.options).toEqual([
      'apple',
      'google',
      'microsoft',
      'passwordless_email',
    ]);
    expect(() => identityProviderSchema.parse('facebook')).toThrow();
  });

  it('keeps Venue Staff distinct from owner and manager membership', () => {
    expect(businessMembershipRoleSchema.options).toEqual(['owner', 'manager', 'venue_staff']);
  });
});

describe('objective dispute and all-or-nothing outcome contracts', () => {
  it('rejects subjective review reasons and exposes only full reward or no-payout outcomes', () => {
    expect(() => disputeReasonCodeSchema.parse('subjective_style')).toThrow();
    expect(() => disputeReasonCodeSchema.parse('creator_appearance')).toThrow();
    expect(disputeResolutionOutcomeSchema.options).toEqual(['earned_full', 'no_payout']);
    expect(financialActionIntentTypeSchema.options).toEqual([
      'creator_payable_full',
      'slot_refund_full',
    ]);
  });

  it('keeps ledger actions balanced, provider-linked, and free of prorated outcomes', () => {
    expect(financialActionIntentStatusSchema.options).toEqual(['pending_ledger', 'posted']);
    expect(ledgerEntryDirectionSchema.options).toEqual(['debit', 'credit']);
    expect(ledgerTransactionTypeSchema.options).toEqual([
      'campaign_funding',
      'slot_completion',
      'slot_refund',
      'finance_adjustment',
    ]);
    expect(paymentProviderObjectTypeSchema.options).toContain('payment_intent');
    expect(ledgerTransactionTypeSchema.safeParse('partial_creator_payable').success).toBe(false);
    expect(ledgerTransactionTypeSchema.safeParse('stored_value_wallet').success).toBe(false);
  });
});
