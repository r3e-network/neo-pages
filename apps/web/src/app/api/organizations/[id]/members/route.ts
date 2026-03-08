import { NextResponse } from 'next/server';

import { addOrganizationMember, listOrganizationMembers } from '../../../../../lib/organizations';
import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const members = await listOrganizationMembers(id, user?.id);
  return NextResponse.json({ ok: true, members });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { githubLogin?: string };
    const member = await addOrganizationMember(id, user?.id, { githubLogin: body.githubLogin ?? '' });
    return NextResponse.json({ ok: true, member }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to add organization member' }, { status: 400 });
  }
}
