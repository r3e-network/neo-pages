import { NextResponse } from 'next/server';

import { getGitHubAppInstallUrl } from '../../../../lib/github';
import { hasSupabasePublicConfig } from '../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../lib/supabase-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetId = Number.parseInt(url.searchParams.get('target_id') ?? '', 10);
  const user = await getOptionalAuthenticatedUser();

  if (!user && hasSupabasePublicConfig()) {
    return NextResponse.redirect(new URL('/api/auth/github?next=/dashboard?github_app=install-after-login', url.origin));
  }

  const installUrl = getGitHubAppInstallUrl(Number.isFinite(targetId) ? targetId : undefined);

  if (!installUrl) {
    return NextResponse.json({ ok: false, error: 'GitHub App is not configured' }, { status: 400 });
  }

  return NextResponse.redirect(installUrl);
}
