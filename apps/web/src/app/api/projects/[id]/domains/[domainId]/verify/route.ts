import { NextResponse } from 'next/server';

import { verifyProjectDomain } from '../../../../../../../lib/domains';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';
import { hasSupabasePublicConfig } from '../../../../../../../lib/env';

export async function POST(_request: Request, context: { params: Promise<{ id: string; domainId: string }> }) {
  const { id, domainId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const domain = await verifyProjectDomain(id, domainId, user?.id);
    return NextResponse.json({ ok: true, domain });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to verify custom domain' },
      { status: 400 }
    );
  }
}
