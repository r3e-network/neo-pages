export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  const vercelProdUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProdUrl) {
    return `https://${vercelProdUrl}`;
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return 'http://localhost:3000';
}

export function getPublicSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
}

export function getServerSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bootstrapOwnerId: process.env.NEOPAGES_BOOTSTRAP_OWNER_ID
  };
}

export function getGitHubAppConfig() {
  return {
    appId: process.env.GITHUB_APP_ID,
    appSlug: process.env.GITHUB_APP_SLUG,
    clientId: process.env.GITHUB_APP_CLIENT_ID,
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
    webhookSecret: process.env.GITHUB_APP_WEBHOOK_SECRET ?? process.env.GITHUB_WEBHOOK_SECRET
  };
}

export function hasSupabasePublicConfig() {
  const config = getPublicSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

export function hasSupabaseAdminConfig() {
  const config = getServerSupabaseConfig();
  return Boolean(config.url && config.serviceRoleKey);
}

export function isSupabaseWriteEnabled() {
  return hasSupabasePublicConfig();
}

export function isSupabaseReadEnabled() {
  return hasSupabasePublicConfig();
}

export function isGitHubAppEnabled() {
  const config = getGitHubAppConfig();
  return Boolean(config.appId && config.appSlug && config.clientId && config.clientSecret && config.privateKey);
}
