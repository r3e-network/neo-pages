import { NextResponse } from 'next/server';

import { createProjectEnvGroup, listProjectEnvGroups } from '../../../../../lib/project-env-groups';
import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const groups = await listProjectEnvGroups(id, user?.id);
  return NextResponse.json({ ok: true, groups });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { name?: string; description?: string | null; scope?: 'personal' | 'organization' };
    const group = await createProjectEnvGroup(id, user?.id, {
      name: body.name ?? '',
      description: body.description,
      scope: body.scope ?? 'personal'
    });
    return NextResponse.json({ ok: true, group }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create environment group' }, { status: 400 });
  }
}
