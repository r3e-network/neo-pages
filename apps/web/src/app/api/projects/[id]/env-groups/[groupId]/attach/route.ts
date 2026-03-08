import { NextResponse } from 'next/server';

import { attachProjectEnvGroup, detachProjectEnvGroup } from '../../../../../../../lib/project-env-groups';
import { hasSupabasePublicConfig } from '../../../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';

export async function POST(_request: Request, context: { params: Promise<{ id: string; groupId: string }> }) {
  const { id, groupId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await attachProjectEnvGroup(id, groupId, user?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to attach group' }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; groupId: string }> }) {
  const { id, groupId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await detachProjectEnvGroup(id, groupId, user?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to detach group' }, { status: 400 });
  }
}
