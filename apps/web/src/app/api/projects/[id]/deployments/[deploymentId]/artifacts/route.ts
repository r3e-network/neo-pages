import { NextResponse } from 'next/server';

import { listDeploymentArtifacts } from '../../../../../../../lib/artifacts';
import { hasSupabasePublicConfig } from '../../../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';
import { resolveProjectApiToken, tokenHasScope } from '../../../../../../../lib/project-api-tokens';

export async function GET(request: Request, context: { params: Promise<{ id: string; deploymentId: string }> }) {
  const { id, deploymentId } = await context.params;
  const user = await getOptionalAuthenticatedUser();
  const token = await resolveProjectApiToken(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.headers.get('x-neopages-project-token'));

  if (hasSupabasePublicConfig() && !user && !token) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  if (token && (token.projectId !== id || !tokenHasScope(token.scopes, 'deployments:read'))) {
    return NextResponse.json({ ok: false, error: 'Project token lacks deployments:read scope' }, { status: 403 });
  }

  const artifacts = await listDeploymentArtifacts(id, deploymentId, user?.id ?? token?.ownerId);
  return NextResponse.json({ ok: true, artifacts });
}
