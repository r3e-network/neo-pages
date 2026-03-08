import { describe, expect, it } from 'vitest';

import { resolveAppDataMode, sanitizeNextPath } from './auth';

describe('sanitizeNextPath', () => {
  it('keeps relative in-app paths', () => {
    expect(sanitizeNextPath('/dashboard?tab=github')).toBe('/dashboard?tab=github');
  });

  it('falls back to the dashboard for external URLs', () => {
    expect(sanitizeNextPath('https://evil.example/steal')).toBe('/dashboard');
  });
});

describe('resolveAppDataMode', () => {
  it('uses auth mode when Supabase public config is absent', () => {
    expect(resolveAppDataMode({ hasSupabasePublicConfig: false, hasUser: false })).toBe('auth');
  });

  it('requires sign-in when Supabase is configured but no user is present', () => {
    expect(resolveAppDataMode({ hasSupabasePublicConfig: true, hasUser: false })).toBe('auth');
  });

  it('uses live mode when Supabase is configured and the user is signed in', () => {
    expect(resolveAppDataMode({ hasSupabasePublicConfig: true, hasUser: true })).toBe('live');
  });
});
