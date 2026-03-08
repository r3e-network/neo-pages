import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { createPromotionRequest, listPromotionRequests } from '../../../../../lib/release-policies';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const requests = await listPromotionRequests(id, user?.id);
  return NextResponse.json({ ok: true, requests });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { deploymentId?: string; requestComment?: string };
    const promotionRequest = await createPromotionRequest(id, body.deploymentId ?? '', user?.id, body.requestComment);
    return NextResponse.json({ ok: true, request: promotionRequest }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to create promotion request' },
      { status: 400 }
    );
  }
}
