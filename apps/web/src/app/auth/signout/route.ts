import { NextResponse } from 'next/server';

import { createRouteHandlerSupabaseClient } from '../../../lib/supabase-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createRouteHandlerSupabaseClient();
  await supabase?.auth.signOut();
  return NextResponse.redirect(new URL('/', url.origin));
}
