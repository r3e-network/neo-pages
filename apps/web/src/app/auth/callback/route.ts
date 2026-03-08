import { NextResponse } from 'next/server';

import { sanitizeNextPath } from '../../../lib/auth';
import { createRouteHandlerSupabaseClient } from '../../../lib/supabase-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = sanitizeNextPath(url.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?auth=missing-code', url.origin));
  }

  const supabase = await createRouteHandlerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(new URL('/dashboard?auth=missing-config', url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/dashboard?auth=error', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
