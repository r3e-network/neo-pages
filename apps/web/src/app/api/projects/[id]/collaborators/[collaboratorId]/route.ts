import { NextResponse } from 'next/server';

import { removeProjectCollaborator } from '../../../../../../lib/collaborators';
import { hasSupabasePublicConfig } from '../../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../../lib/supabase-auth';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; collaboratorId: string }> }) {
  const { id, collaboratorId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await removeProjectCollaborator(id, user?.id, collaboratorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to remove collaborator' }, { status: 400 });
  }
}
