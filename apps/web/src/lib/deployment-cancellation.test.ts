import { describe, expect, it } from 'vitest';

import { canCancelDeployment, resolveProjectStatusAfterCancellation } from './deployment-state';

describe('canCancelDeployment', () => {
  it('allows queued and in-flight deployments to be cancelled', () => {
    expect(canCancelDeployment('queued')).toBe(true);
    expect(canCancelDeployment('building')).toBe(true);
    expect(canCancelDeployment('uploading')).toBe(true);
  });

  it('blocks cancellation for terminal deployments', () => {
    expect(canCancelDeployment('deployed')).toBe(false);
    expect(canCancelDeployment('failed')).toBe(false);
    expect(canCancelDeployment('cancelled')).toBe(false);
  });
});

describe('resolveProjectStatusAfterCancellation', () => {
  it('returns deployed when the project still has a live container', () => {
    expect(resolveProjectStatusAfterCancellation('container-1')).toBe('deployed');
  });

  it('returns draft when there is no live deployment yet', () => {
    expect(resolveProjectStatusAfterCancellation(null)).toBe('draft');
  });
});
