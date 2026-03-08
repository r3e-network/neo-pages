import { NextResponse } from 'next/server';

import { getAppUrl, hasSupabasePublicConfig } from '../../../../lib/env';
import { sanitizeNextPath } from '../../../../lib/auth';
import { createRouteHandlerSupabaseClient } from '../../../../lib/supabase-auth';

export async function GET(request: Request) {
  if (!hasSupabasePublicConfig()) {
    return NextResponse.json({ ok: false, error: 'Supabase GitHub OAuth is not configured' }, { status: 400 });
  }

  const supabase = await createRouteHandlerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase client is not configured' }, { status: 400 });
  }

  const url = new URL(request.url);
  const next = sanitizeNextPath(url.searchParams.get('next'));
  const redirectTo = new URL('/auth/callback', getAppUrl());
  redirectTo.searchParams.set('next', next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: redirectTo.toString()
    }
  });

  if (error || !data.url) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Failed to start GitHub sign-in' }, { status: 400 });
  }

  return NextResponse.redirect(data.url);
}
