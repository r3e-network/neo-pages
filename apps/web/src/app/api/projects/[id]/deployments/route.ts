import { NextResponse } from 'next/server';

import { getProjectDetails, queueDeploymentForRepository } from '../../../../../lib/projects-service';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';
import { resolveProjectApiToken, tokenHasScope } from '../../../../../lib/project-api-tokens';
import { hasSupabasePublicConfig } from '../../../../../lib/env';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();
  const token = await resolveProjectApiToken(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.headers.get('x-neopages-project-token'));

  if (hasSupabasePublicConfig() && !user && !token) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  if (token && (token.projectId !== id || !tokenHasScope(token.scopes, 'deployments:read'))) {
    return NextResponse.json({ ok: false, error: 'Project token lacks deployments:read scope' }, { status: 403 });
  }

  const details = await getProjectDetails(id, user?.id ?? token?.ownerId);
  if (!details) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    project: details.project,
    deployments: details.deployments
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();
  const token = await resolveProjectApiToken(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.headers.get('x-neopages-project-token'));

  if (hasSupabasePublicConfig() && !user && !token) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  if (token && (token.projectId !== id || !tokenHasScope(token.scopes, 'deployments:write'))) {
    return NextResponse.json({ ok: false, error: 'Project token lacks deployments:write scope' }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { branch?: string; commitSha?: string; commitMessage?: string };
    const details = await getProjectDetails(id, user?.id ?? token?.ownerId);
    if (!details) {
      return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
    }

    const deployment = await queueDeploymentForRepository({
      repoFullName: details.project.repo_full_name,
      branch: body.branch ?? details.project.default_branch,
      commitSha: body.commitSha,
      commitMessage: body.commitMessage ?? 'Queued from project API token'
    });

    if (!deployment) {
      return NextResponse.json({ ok: false, error: 'Failed to queue deployment' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, deployment }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to queue deployment' }, { status: 400 });
  }
}
