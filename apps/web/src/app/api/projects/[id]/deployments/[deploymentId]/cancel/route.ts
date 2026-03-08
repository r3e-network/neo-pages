import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../../../lib/env';
import { cancelProjectDeployment } from '../../../../../../../lib/deployment-cancellation';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';
import { resolveProjectApiToken, tokenHasScope } from '../../../../../../../lib/project-api-tokens';

export async function POST(request: Request, context: { params: Promise<{ id: string; deploymentId: string }> }) {
  const { id, deploymentId } = await context.params;
  const user = await getOptionalAuthenticatedUser();
  const token = await resolveProjectApiToken(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.headers.get('x-neopages-project-token'));

  if (hasSupabasePublicConfig() && !user && !token) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  if (token && (token.projectId !== id || !tokenHasScope(token.scopes, 'deployments:write'))) {
    return NextResponse.json({ ok: false, error: 'Project token lacks deployments:write scope' }, { status: 403 });
  }

  try {
    const result = await cancelProjectDeployment(id, deploymentId, user?.id ?? token?.ownerId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to cancel deployment' }, { status: 400 });
  }
}
