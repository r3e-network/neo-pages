import { NextResponse } from 'next/server';

import { createProjectDeployHook, listProjectDeployHooks } from '../../../../../lib/project-deploy-hooks';
import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const hooks = await listProjectDeployHooks(id, user?.id);
  return NextResponse.json({ ok: true, hooks });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { label?: string };
    const hook = await createProjectDeployHook(id, user?.id, { label: body.label ?? '' });
    return NextResponse.json({ ok: true, hook }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create deploy hook' }, { status: 400 });
  }
}
