import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { createOrganizationWebhookEndpoint, listOrganizationWebhookEndpoints } from '../../../../../lib/organization-webhooks';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const endpoints = await listOrganizationWebhookEndpoints(id, user?.id);
  return NextResponse.json({ ok: true, endpoints });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { targetUrl?: string; secret?: string; payloadFormat?: string; events?: string[] };
    const endpoint = await createOrganizationWebhookEndpoint(id, user?.id, {
      targetUrl: body.targetUrl ?? '',
      secret: body.secret,
      payloadFormat: body.payloadFormat,
      events: body.events ?? []
    });
    return NextResponse.json({ ok: true, endpoint }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create organization webhook endpoint' }, { status: 400 });
  }
}
