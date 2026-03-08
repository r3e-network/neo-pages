import { NextResponse } from 'next/server';

import { syncGitHubInstallationsFromCode } from '../../../../lib/github';
import { getOptionalAuthenticatedUser } from '../../../../lib/supabase-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUrl = new URL('/dashboard', url.origin);
  const user = await getOptionalAuthenticatedUser();

  if (!user) {
    redirectUrl.searchParams.set('github_app', 'auth-required');
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.searchParams.set('github_app', 'missing-code');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const installations = await syncGitHubInstallationsFromCode(code, user.id);
    redirectUrl.searchParams.set('github_app', 'connected');
    redirectUrl.searchParams.set('installations', String(installations));
  } catch (error) {
    redirectUrl.searchParams.set('github_app', 'error');
    redirectUrl.searchParams.set('message', error instanceof Error ? error.message : 'GitHub App sync failed');
  }

  return NextResponse.redirect(redirectUrl);
}
