import { z } from 'zod';

export const planTiers = ['free', 'pro', 'enterprise', 'custom'] as const;
export type PlanTier = (typeof planTiers)[number];
export const planTierSchema = z.enum(planTiers);

const presets: Record<Exclude<PlanTier, 'custom'>, { monthlyBandwidthLimitBytes: number; monthlyRequestLimit: number }> = {
  free: {
    monthlyBandwidthLimitBytes: 10 * 1024 * 1024 * 1024,
    monthlyRequestLimit: 100_000
  },
  pro: {
    monthlyBandwidthLimitBytes: 100 * 1024 * 1024 * 1024,
    monthlyRequestLimit: 1_000_000
  },
  enterprise: {
    monthlyBandwidthLimitBytes: 1024 * 1024 * 1024 * 1024,
    monthlyRequestLimit: 10_000_000
  }
};

export function resolvePlanTierQuota(
  tier: PlanTier,
  overrides?: { monthlyBandwidthLimitBytes?: number; monthlyRequestLimit?: number }
) {
  if (tier === 'custom') {
    return {
      monthlyBandwidthLimitBytes: overrides?.monthlyBandwidthLimitBytes ?? presets.free.monthlyBandwidthLimitBytes,
      monthlyRequestLimit: overrides?.monthlyRequestLimit ?? presets.free.monthlyRequestLimit
    };
  }

  return presets[tier];
}
