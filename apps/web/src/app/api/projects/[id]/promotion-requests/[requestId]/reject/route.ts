import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../../../lib/env';
import { reviewPromotionRequest } from '../../../../../../../lib/release-policies';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';

export async function POST(request: Request, context: { params: Promise<{ id: string; requestId: string }> }) {
  const { id, requestId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { reviewComment?: string };
    const reviewed = await reviewPromotionRequest(id, requestId, user?.id, 'rejected', body.reviewComment);
    return NextResponse.json({ ok: true, request: reviewed });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to reject promotion request' },
      { status: 400 }
    );
  }
}
