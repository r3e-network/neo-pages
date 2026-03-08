import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../lib/env';
import { updateOrganizationGovernance } from '../../../../lib/organizations';
import { getOptionalAuthenticatedUser } from '../../../../lib/supabase-auth';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      planTier?: 'free' | 'pro' | 'enterprise' | 'custom';
      monthlyBandwidthLimitBytes?: number;
      monthlyRequestLimit?: number;
      requirePromotionApproval?: boolean;
      protectedBranches?: string[];
    };
    const organization = await updateOrganizationGovernance(id, user?.id, {
      planTier: body.planTier ?? 'free',
      monthlyBandwidthLimitBytes: Number(body.monthlyBandwidthLimitBytes ?? 10 * 1024 * 1024 * 1024),
      monthlyRequestLimit: Number(body.monthlyRequestLimit ?? 100_000),
      requirePromotionApproval: Boolean(body.requirePromotionApproval),
      protectedBranches: body.protectedBranches ?? ['main']
    });
    return NextResponse.json({ ok: true, organization });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to update organization' }, { status: 400 });
  }
}
