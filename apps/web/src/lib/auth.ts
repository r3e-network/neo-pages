export type AppDataMode = 'auth' | 'live';

export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/')) {
    return '/dashboard';
  }

  return next;
}

export function resolveAppDataMode(input: { hasSupabasePublicConfig: boolean; hasUser: boolean }): AppDataMode {
  if (!input.hasSupabasePublicConfig) {
    return 'auth';
  }

  return input.hasUser ? 'live' : 'auth';
}
