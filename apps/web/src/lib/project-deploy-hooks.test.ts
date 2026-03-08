import { describe, expect, it } from 'vitest';

import {
  buildProjectDeployHookUrl,
  normalizeDeployHookLabel,
  signDeployHookPayload,
  verifyDeployHookSignature
} from './project-deploy-hooks';

describe('normalizeDeployHookLabel', () => {
  it('trims labels and rejects empty values', () => {
    expect(normalizeDeployHookLabel('  Production CI  ')).toBe('Production CI');
    expect(() => normalizeDeployHookLabel('   ')).toThrow();
  });
});

describe('buildProjectDeployHookUrl', () => {
  it('builds a deploy hook endpoint from the app URL and hook id', () => {
    expect(buildProjectDeployHookUrl('http://localhost:3000', 'hook-123')).toBe('http://localhost:3000/api/deploy-hooks/hook-123');
  });
});

describe('deploy hook signatures', () => {
  it('creates and verifies sha256 signatures for raw JSON payloads', () => {
    const payload = JSON.stringify({ branch: 'main' });
    const signature = signDeployHookPayload('super-secret', payload);

    expect(signature).toMatch(/^sha256=/);
    expect(verifyDeployHookSignature('super-secret', payload, signature)).toBe(true);
    expect(verifyDeployHookSignature('wrong-secret', payload, signature)).toBe(false);
  });
});
