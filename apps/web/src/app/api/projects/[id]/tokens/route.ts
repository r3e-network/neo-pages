import { NextResponse } from 'next/server';

import { createProjectApiToken, listProjectApiTokens } from '../../../../../lib/project-api-tokens';
import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const tokens = await listProjectApiTokens(id, user?.id);
  return NextResponse.json({ ok: true, tokens });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { label?: string; scopes?: string[] };
    const token = await createProjectApiToken(id, user?.id, { label: body.label ?? '', scopes: body.scopes ?? [] });
    return NextResponse.json({ ok: true, token }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create project API token' }, { status: 400 });
  }
}
