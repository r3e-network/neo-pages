import { describe, expect, it } from 'vitest';

import { hasActiveDeployment, shouldPollDeploymentLogs } from './deployments';

describe('hasActiveDeployment', () => {
  it('returns true when a deployment is queued, building, or uploading', () => {
    expect(hasActiveDeployment([{ status: 'queued' }, { status: 'deployed' }])).toBe(true);
    expect(hasActiveDeployment([{ status: 'building' }])).toBe(true);
    expect(hasActiveDeployment([{ status: 'uploading' }])).toBe(true);
  });

  it('returns false when all deployments are terminal', () => {
    expect(hasActiveDeployment([{ status: 'deployed' }, { status: 'failed' }, { status: 'cancelled' }])).toBe(false);
  });
});

describe('shouldPollDeploymentLogs', () => {
  it('polls while there is an active deployment', () => {
    expect(shouldPollDeploymentLogs([{ status: 'building' }])).toBe(true);
  });

  it('stops polling once all deployments are terminal', () => {
    expect(shouldPollDeploymentLogs([{ status: 'deployed' }])).toBe(false);
  });
});
