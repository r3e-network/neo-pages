import { describe, expect, it } from 'vitest';

import { describeManualDeploymentTarget, normalizeManualDeployBranch } from './manual-deploy';

describe('normalizeManualDeployBranch', () => {
  it('falls back to the default branch when the input is empty', () => {
    expect(normalizeManualDeployBranch('   ', 'main')).toBe('main');
  });

  it('trims branch names', () => {
    expect(normalizeManualDeployBranch(' feature/login ', 'main')).toBe('feature/login');
  });
});

describe('describeManualDeploymentTarget', () => {
  it('treats the default branch as production', () => {
    expect(describeManualDeploymentTarget('main', 'main')).toEqual({
      environment: 'production',
      label: 'Redeploy production'
    });
  });

  it('treats non-default branches as previews', () => {
    expect(describeManualDeploymentTarget('feature/login', 'main')).toEqual({
      environment: 'preview',
      label: 'Deploy preview'
    });
  });
});
