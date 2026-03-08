import { NextResponse } from 'next/server';

import { createOrganization, listUserOrganizations } from '../../../lib/organizations';
import { hasSupabasePublicConfig } from '../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../lib/supabase-auth';

export async function GET() {
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const organizations = await listUserOrganizations(user?.id);
  return NextResponse.json({ ok: true, organizations });
}

export async function POST(request: Request) {
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { name?: string; slug?: string };
    const organization = await createOrganization(user?.id, { name: body.name ?? '', slug: body.slug });
    return NextResponse.json({ ok: true, organization }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create organization' }, { status: 400 });
  }
}
