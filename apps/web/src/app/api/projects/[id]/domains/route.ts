import { NextResponse } from 'next/server';

import { createProjectDomain, listProjectDomains } from '../../../../../lib/domains';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';
import { hasSupabasePublicConfig } from '../../../../../lib/env';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const domains = await listProjectDomains(id, user?.id);
  return NextResponse.json({ ok: true, domains });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { host?: string };
    const domain = await createProjectDomain(id, body.host ?? '', user?.id);
    return NextResponse.json({ ok: true, domain }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to create custom domain' },
      { status: 400 }
    );
  }
}
