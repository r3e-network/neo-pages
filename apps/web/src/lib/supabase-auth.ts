import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { getPublicSupabaseConfig, hasSupabasePublicConfig } from './env';

export function createBrowserSupabaseClient() {
  const config = getPublicSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  return createBrowserClient(config.url, config.anonKey);
}

export async function createServerSupabaseClient() {
  const config = getPublicSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      }
    }
  });
}

export async function createRouteHandlerSupabaseClient() {
  const config = getPublicSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}

export async function getOptionalAuthenticatedUser(): Promise<User | null> {
  if (!hasSupabasePublicConfig()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function updateSupabaseSession(request: NextRequest) {
  if (!hasSupabasePublicConfig()) {
    return NextResponse.next();
  }

  const config = getPublicSupabaseConfig();
  const response = NextResponse.next();

  const supabase = createServerClient(config.url!, config.anonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getUser();
  return response;
}
