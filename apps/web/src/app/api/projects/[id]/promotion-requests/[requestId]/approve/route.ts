import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../../../lib/env';
import { promoteDeployment } from '../../../../../../../lib/projects-service';
import { reviewPromotionRequest } from '../../../../../../../lib/release-policies';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';

export async function POST(request: Request, context: { params: Promise<{ id: string; requestId: string }> }) {
  const { id, requestId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { reviewComment?: string; deploymentId?: string };
    const reviewed = await reviewPromotionRequest(id, requestId, user?.id, 'approved', body.reviewComment);
    const deployment = await promoteDeployment(id, body.deploymentId ?? reviewed.deployment_id, user?.id);
    return NextResponse.json({ ok: true, request: reviewed, deployment });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to approve promotion request' },
      { status: 400 }
    );
  }
}
