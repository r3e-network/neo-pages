import { describe, expect, it } from 'vitest';

import { mergeProjectBuildEnv, projectEnvScopeSchema } from './project-env-scope';

describe('projectEnvScopeSchema', () => {
  it('parses supported scopes', () => {
    expect(projectEnvScopeSchema.parse('all')).toBe('all');
    expect(projectEnvScopeSchema.parse('production')).toBe('production');
    expect(projectEnvScopeSchema.parse('preview')).toBe('preview');
  });
});

describe('mergeProjectBuildEnv', () => {
  it('merges all-scope vars with environment-specific overrides', () => {
    expect(
      mergeProjectBuildEnv(
        [
          { key: 'API_URL', value: 'https://api.example.com', environment: 'all' },
          { key: 'NEXT_PUBLIC_THEME', value: 'dark', environment: 'all' },
          { key: 'API_URL', value: 'https://preview-api.example.com', environment: 'preview' }
        ],
        'preview'
      )
    ).toEqual({
      API_URL: 'https://preview-api.example.com',
      NEXT_PUBLIC_THEME: 'dark'
    });
  });

  it('ignores preview-only vars for production deployments', () => {
    expect(
      mergeProjectBuildEnv(
        [
          { key: 'API_URL', value: 'https://api.example.com', environment: 'all' },
          { key: 'PREVIEW_ONLY', value: '1', environment: 'preview' }
        ],
        'production'
      )
    ).toEqual({ API_URL: 'https://api.example.com' });
  });
});
