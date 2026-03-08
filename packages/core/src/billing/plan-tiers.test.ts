import { describe, expect, it } from 'vitest';

import { planTierSchema, resolvePlanTierQuota } from '../index';

describe('planTierSchema', () => {
  it('parses supported tiers', () => {
    expect(planTierSchema.parse('free')).toBe('free');
    expect(planTierSchema.parse('pro')).toBe('pro');
    expect(planTierSchema.parse('enterprise')).toBe('enterprise');
    expect(planTierSchema.parse('custom')).toBe('custom');
  });
});

describe('resolvePlanTierQuota', () => {
  it('returns sensible defaults for each built-in tier', () => {
    expect(resolvePlanTierQuota('free')).toMatchObject({ monthlyBandwidthLimitBytes: 10 * 1024 * 1024 * 1024, monthlyRequestLimit: 100000 });
    expect(resolvePlanTierQuota('pro')).toMatchObject({ monthlyRequestLimit: 1000000 });
    expect(resolvePlanTierQuota('enterprise')).toMatchObject({ monthlyRequestLimit: 10000000 });
  });

  it('allows custom tiers to override limits', () => {
    expect(resolvePlanTierQuota('custom', { monthlyBandwidthLimitBytes: 123, monthlyRequestLimit: 456 })).toEqual({ monthlyBandwidthLimitBytes: 123, monthlyRequestLimit: 456 });
  });
});
