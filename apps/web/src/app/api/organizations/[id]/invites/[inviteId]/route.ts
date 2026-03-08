import { NextResponse } from 'next/server';

import { revokeOrganizationInvite } from '../../../../../../lib/organization-invites';
import { hasSupabasePublicConfig } from '../../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../../lib/supabase-auth';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; inviteId: string }> }) {
  const { id, inviteId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await revokeOrganizationInvite(id, inviteId, user?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to revoke organization invite' }, { status: 400 });
  }
}
