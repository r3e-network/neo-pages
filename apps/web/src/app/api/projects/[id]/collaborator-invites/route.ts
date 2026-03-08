import { NextResponse } from 'next/server';

import { createProjectCollaboratorInvite, listProjectCollaboratorInvites } from '../../../../../lib/collaborator-invites';
import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const invites = await listProjectCollaboratorInvites(id, user?.id);
  return NextResponse.json({ ok: true, invites });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { email?: string; role?: string };
    const invite = await createProjectCollaboratorInvite(id, user?.id, { email: body.email ?? '', role: body.role ?? 'viewer' });
    return NextResponse.json({ ok: true, invite }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create collaborator invite' }, { status: 400 });
  }
}
