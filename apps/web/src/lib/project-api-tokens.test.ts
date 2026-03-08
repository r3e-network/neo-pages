import { describe, expect, it } from 'vitest';

import {
  buildProjectApiToken,
  hashProjectApiTokenSecret,
  normalizeProjectTokenScopes,
  projectTokenScopeSchema,
  tokenHasScope
} from './project-api-tokens';

describe('projectTokenScopeSchema', () => {
  it('parses supported scopes', () => {
    expect(projectTokenScopeSchema.parse('project:read')).toBe('project:read');
    expect(projectTokenScopeSchema.parse('deployments:read')).toBe('deployments:read');
    expect(projectTokenScopeSchema.parse('deployments:write')).toBe('deployments:write');
  });
});

describe('normalizeProjectTokenScopes', () => {
  it('deduplicates and validates scopes', () => {
    expect(normalizeProjectTokenScopes(['deployments:read', 'deployments:read', 'project:read'])).toEqual([
      'deployments:read',
      'project:read'
    ]);
  });
});

describe('buildProjectApiToken', () => {
  it('returns a public prefix and secret pair', () => {
    const token = buildProjectApiToken('abc123prefix', 'supersecret');
    expect(token).toBe('npt_abc123prefix.supersecret');
  });
});

describe('hashProjectApiTokenSecret', () => {
  it('hashes the token secret deterministically', () => {
    expect(hashProjectApiTokenSecret('supersecret')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashProjectApiTokenSecret('supersecret')).toBe(hashProjectApiTokenSecret('supersecret'));
  });
});

describe('tokenHasScope', () => {
  it('checks whether a token grants a required scope', () => {
    expect(tokenHasScope(['project:read', 'deployments:write'], 'deployments:write')).toBe(true);
    expect(tokenHasScope(['project:read'], 'deployments:write')).toBe(false);
  });
});
