import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getProjectReleasePolicy, upsertProjectReleasePolicy } from '../../../../../lib/release-policies';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const policy = await getProjectReleasePolicy(id, user?.id);
  return NextResponse.json({ ok: true, policy });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { requirePromotionApproval?: boolean; protectedBranches?: string[] | string; useOrganizationReleasePolicy?: boolean };
    const policy = await upsertProjectReleasePolicy(id, user?.id, {
      requirePromotionApproval: Boolean(body.requirePromotionApproval),
      protectedBranches: body.protectedBranches ?? ['main'],
      useOrganizationReleasePolicy: body.useOrganizationReleasePolicy
    });
    return NextResponse.json({ ok: true, policy });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to save release policy' },
      { status: 400 }
    );
  }
}
