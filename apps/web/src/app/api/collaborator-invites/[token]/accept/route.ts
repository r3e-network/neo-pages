import { NextResponse } from 'next/server';

import { acceptProjectCollaboratorInvite } from '../../../../../lib/collaborator-invites';
import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const accepted = await acceptProjectCollaboratorInvite({ token, actorId: user.id, actorEmail: user.email });
    return NextResponse.json({ ok: true, accepted });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to accept collaborator invite' }, { status: 400 });
  }
}
