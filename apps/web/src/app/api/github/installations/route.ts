import { NextResponse } from 'next/server';

import { isGitHubAppEnabled } from '../../../../lib/env';
import { listGitHubInstallationsWithRepositories } from '../../../../lib/github';
import { getOptionalAuthenticatedUser } from '../../../../lib/supabase-auth';

export async function GET() {
  if (!isGitHubAppEnabled()) {
    return NextResponse.json({ ok: true, configured: false, installations: [] });
  }

  const user = await getOptionalAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false, configured: true, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const installations = await listGitHubInstallationsWithRepositories(user.id);
    return NextResponse.json({ ok: true, configured: true, installations });
  } catch (error) {
    return NextResponse.json(
      { ok: false, configured: true, error: error instanceof Error ? error.message : 'Failed to load GitHub App installations' },
      { status: 500 }
    );
  }
}
