import type { NextRequest } from 'next/server';

import { updateSupabaseSession } from './lib/supabase-auth';

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
