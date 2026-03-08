import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';
import { listProjectUsageSummary, updateProjectQuotaPolicy } from '../../../../../lib/usage';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const usage = await listProjectUsageSummary(id, user?.id);
  return NextResponse.json({ ok: true, usage });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { planTier?: string; monthlyBandwidthLimitBytes?: number; monthlyRequestLimit?: number; useOrganizationQuotas?: boolean };
    const usage = await updateProjectQuotaPolicy(id, user?.id, {
      planTier: body.planTier ?? 'free',
      monthlyBandwidthLimitBytes: body.monthlyBandwidthLimitBytes,
      monthlyRequestLimit: body.monthlyRequestLimit,
      useOrganizationQuotas: body.useOrganizationQuotas
    });
    return NextResponse.json({ ok: true, usage });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to update quota policy' },
      { status: 400 }
    );
  }
}
