import { describe, expect, it } from 'vitest';

import { evaluatePromotionGate, normalizeProtectedBranches } from './approvals';

describe('normalizeProtectedBranches', () => {
  it('normalizes comma-separated branches', () => {
    expect(normalizeProtectedBranches('main, release ,hotfix')).toEqual(['main', 'release', 'hotfix']);
  });
});

describe('evaluatePromotionGate', () => {
  it('allows promotion when approvals are disabled and branch is protected', () => {
    expect(
      evaluatePromotionGate({
        deploymentBranch: 'main',
        protectedBranches: ['main'],
        requirePromotionApproval: false
      })
    ).toEqual({ allowed: true, requiresApproval: false, reason: null });
  });

  it('requires approval when approvals are enabled', () => {
    expect(
      evaluatePromotionGate({
        deploymentBranch: 'feature/login',
        protectedBranches: ['main', 'feature/login'],
        requirePromotionApproval: true
      })
    ).toEqual({ allowed: true, requiresApproval: true, reason: null });
  });

  it('blocks promotion when branch is outside the protected allow-list', () => {
    expect(
      evaluatePromotionGate({
        deploymentBranch: 'feature/login',
        protectedBranches: ['main'],
        requirePromotionApproval: false
      })
    ).toEqual({
      allowed: false,
      requiresApproval: false,
      reason: 'Branch feature/login is not allowed to promote to production'
    });
  });
});
