import { NextResponse } from 'next/server';

import { isGitHubAppEnabled } from '../../../../../lib/env';
import { listGitHubInstallationsWithRepositories, refreshGitHubInstallationCaches } from '../../../../../lib/github';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function POST(request: Request) {
  if (!isGitHubAppEnabled()) {
    return NextResponse.json({ ok: true, configured: false, installations: [] });
  }

  const user = await getOptionalAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false, configured: true, error: 'Authentication required' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { force?: boolean };

  try {
    const summary = await refreshGitHubInstallationCaches(user.id, Boolean(body.force));
    const installations = await listGitHubInstallationsWithRepositories(user.id);
    return NextResponse.json({ ok: true, configured: true, summary, installations });
  } catch (error) {
    return NextResponse.json(
      { ok: false, configured: true, error: error instanceof Error ? error.message : 'Failed to refresh GitHub repository cache' },
      { status: 500 }
    );
  }
}
