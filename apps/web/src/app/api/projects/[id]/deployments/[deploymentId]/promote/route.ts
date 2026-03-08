import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../../../lib/env';
import { promoteDeployment } from '../../../../../../../lib/projects-service';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';

export async function POST(_request: Request, context: { params: Promise<{ id: string; deploymentId: string }> }) {
  const { id, deploymentId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const deployment = await promoteDeployment(id, deploymentId, user?.id);
    return NextResponse.json({ ok: true, deployment });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to promote deployment' },
      { status: 400 }
    );
  }
}
