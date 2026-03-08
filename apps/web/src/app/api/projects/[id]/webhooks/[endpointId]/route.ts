import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../../lib/env';
import { deleteProjectWebhookEndpoint } from '../../../../../../lib/project-webhooks';
import { getOptionalAuthenticatedUser } from '../../../../../../lib/supabase-auth';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; endpointId: string }> }) {
  const { id, endpointId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await deleteProjectWebhookEndpoint(id, endpointId, user?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete project webhook endpoint' },
      { status: 400 }
    );
  }
}
