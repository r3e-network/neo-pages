import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';
import { getProjectGasSponsorship, updateProjectGasSponsorship } from '../../../../../lib/gas-sponsorship';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const sponsorship = await getProjectGasSponsorship(id, user?.id);
  return NextResponse.json({ ok: true, sponsorship });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { isEnabled: boolean };
    const sponsorship = await updateProjectGasSponsorship(id, user?.id, body.isEnabled);
    return NextResponse.json({ ok: true, sponsorship });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to update gas sponsorship' },
      { status: 400 }
    );
  }
}
