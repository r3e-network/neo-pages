import { NextResponse } from 'next/server';

import { removeOrganizationMember } from '../../../../../../lib/organizations';
import { hasSupabasePublicConfig } from '../../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../../lib/supabase-auth';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await removeOrganizationMember(id, user?.id, memberId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to remove organization member' }, { status: 400 });
  }
}
