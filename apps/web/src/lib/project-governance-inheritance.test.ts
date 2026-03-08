import { describe, expect, it } from 'vitest';

import { resolveEffectiveProjectQuotaSummary } from './usage';
import { resolveEffectiveProjectReleasePolicy } from './release-policies';

describe('resolveEffectiveProjectQuotaSummary', () => {
  it('uses organization quotas when inheritance is enabled', () => {
    expect(
      resolveEffectiveProjectQuotaSummary({
        requestCount: 12,
        bandwidthBytes: 345,
        project: {
          useOrganizationQuotas: true,
          planTier: 'free',
          monthlyBandwidthLimitBytes: 10,
          monthlyRequestLimit: 20
        },
        organization: {
          planTier: 'enterprise',
          monthlyBandwidthLimitBytes: 999,
          monthlyRequestLimit: 888
        }
      })
    ).toMatchObject({
      requestCount: 12,
      bandwidthBytes: 345,
      useOrganizationQuotas: true,
      planTier: 'enterprise',
      monthlyBandwidthLimitBytes: 999,
      monthlyRequestLimit: 888
    });
  });
});

describe('resolveEffectiveProjectReleasePolicy', () => {
  it('uses organization release policy when inheritance is enabled', () => {
    expect(
      resolveEffectiveProjectReleasePolicy({
        project: {
          useOrganizationReleasePolicy: true,
          requirePromotionApproval: false,
          protectedBranches: ['dev']
        },
        organization: {
          requirePromotionApproval: true,
          protectedBranches: ['main', 'release']
        }
      })
    ).toEqual({
      useOrganizationReleasePolicy: true,
      requirePromotionApproval: true,
      protectedBranches: ['main', 'release']
    });
  });
});
