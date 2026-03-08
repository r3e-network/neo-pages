import { createClient } from '@supabase/supabase-js';

import { getServerSupabaseConfig } from './env';

export function createAdminSupabaseClient() {
  const config = getServerSupabaseConfig();

  if (!config.url || !config.serviceRoleKey) {
    return null;
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
