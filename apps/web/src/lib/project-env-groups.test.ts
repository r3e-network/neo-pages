import { describe, expect, it } from 'vitest';

import { mergeGroupedProjectEnv, normalizeEnvGroupName, resolveEnvGroupOwnership } from './project-env-groups';

describe('normalizeEnvGroupName', () => {
  it('trims names and rejects empty ones', () => {
    expect(normalizeEnvGroupName('  Shared API  ')).toBe('Shared API');
    expect(() => normalizeEnvGroupName('   ')).toThrow();
  });
});

describe('mergeGroupedProjectEnv', () => {
  it('applies group variables first, then project variables as overrides', () => {
    expect(
      mergeGroupedProjectEnv(
        [
          { key: 'API_URL', value: 'https://shared.example.com', environment: 'all' },
          { key: 'NEXT_PUBLIC_THEME', value: 'dark', environment: 'all' },
          { key: 'API_URL', value: 'https://preview-shared.example.com', environment: 'preview' }
        ],
        [
          { key: 'API_URL', value: 'https://project-preview.example.com', environment: 'preview' }
        ],
        'preview'
      )
    ).toEqual({
      API_URL: 'https://project-preview.example.com',
      NEXT_PUBLIC_THEME: 'dark'
    });
  });
});

describe('resolveEnvGroupOwnership', () => {
  it('allows org owners to create organization-scoped groups', () => {
    expect(
      resolveEnvGroupOwnership({
        requestedScope: 'organization',
        projectOrganizationId: 'org-1',
        actorId: 'user-1',
        effectiveOwnerId: 'user-1',
        organizationRole: 'owner'
      })
    ).toEqual({ ownerId: 'user-1', organizationId: 'org-1' });
  });

  it('falls back to personal ownership for personal scope', () => {
    expect(
      resolveEnvGroupOwnership({
        requestedScope: 'personal',
        projectOrganizationId: 'org-1',
        actorId: 'user-2',
        effectiveOwnerId: 'user-1',
        organizationRole: 'member'
      })
    ).toEqual({ ownerId: 'user-2', organizationId: null });
  });

  it('rejects org-scoped groups from non-owner members', () => {
    expect(() =>
      resolveEnvGroupOwnership({
        requestedScope: 'organization',
        projectOrganizationId: 'org-1',
        actorId: 'user-2',
        effectiveOwnerId: 'user-1',
        organizationRole: 'member'
      })
    ).toThrow();
  });
});
