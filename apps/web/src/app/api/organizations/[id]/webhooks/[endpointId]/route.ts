import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../../lib/env';
import { deleteOrganizationWebhookEndpoint } from '../../../../../../lib/organization-webhooks';
import { getOptionalAuthenticatedUser } from '../../../../../../lib/supabase-auth';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; endpointId: string }> }) {
  const { id, endpointId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await deleteOrganizationWebhookEndpoint(id, endpointId, user?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to delete organization webhook endpoint' }, { status: 400 });
  }
}
