import { describe, expect, it } from 'vitest';

import { maskEnvVarValue, normalizeEnvVarKey } from './project-env';

describe('normalizeEnvVarKey', () => {
  it('normalizes valid keys to uppercase snake case', () => {
    expect(normalizeEnvVarKey('next_public_api_url')).toBe('NEXT_PUBLIC_API_URL');
  });

  it('rejects invalid variable names', () => {
    expect(() => normalizeEnvVarKey('1BAD_KEY')).toThrow();
    expect(() => normalizeEnvVarKey('BAD-KEY')).toThrow();
  });
});

describe('maskEnvVarValue', () => {
  it('masks long secret values while preserving a short prefix', () => {
    expect(maskEnvVarValue('super-secret-token')).toBe('su••••••••••••••••');
  });

  it('fully masks very short values', () => {
    expect(maskEnvVarValue('abc')).toBe('•••');
  });
});
