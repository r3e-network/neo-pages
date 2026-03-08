import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../../lib/env';
import { deleteProjectEnvVar } from '../../../../../../lib/project-env';
import { getOptionalAuthenticatedUser } from '../../../../../../lib/supabase-auth';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; envVarId: string }> }) {
  const { id, envVarId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await deleteProjectEnvVar(id, envVarId, user?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete environment variable' },
      { status: 400 }
    );
  }
}
