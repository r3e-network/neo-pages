import { describe, expect, it } from 'vitest';

import { getDeploymentReleaseAction, getLatestProductionDeploymentId } from './releases';

describe('getLatestProductionDeploymentId', () => {
  it('returns the newest successful production deployment id', () => {
    expect(
      getLatestProductionDeploymentId([
        { id: 'a', environment: 'production', status: 'deployed', container_id: 'cid-a', created_at: '2026-03-07T01:00:00.000Z' },
        { id: 'b', environment: 'preview', status: 'deployed', container_id: 'cid-b', created_at: '2026-03-07T02:00:00.000Z' },
        { id: 'c', environment: 'production', status: 'deployed', container_id: 'cid-c', created_at: '2026-03-07T03:00:00.000Z' }
      ])
    ).toBe('c');
  });
});

describe('getDeploymentReleaseAction', () => {
  it('offers promotion for successful preview deployments', () => {
    expect(
      getDeploymentReleaseAction(
        {
          id: 'preview-1',
          environment: 'preview',
          status: 'deployed',
          container_id: 'cid',
          created_at: '2026-03-07T03:00:00.000Z'
        },
        'prod-1'
      )
    ).toEqual({ type: 'promote', label: 'Promote to production' });
  });

  it('offers rollback for older successful production deployments', () => {
    expect(
      getDeploymentReleaseAction(
        {
          id: 'prod-0',
          environment: 'production',
          status: 'deployed',
          container_id: 'cid',
          created_at: '2026-03-07T01:00:00.000Z'
        },
        'prod-1'
      )
    ).toEqual({ type: 'rollback', label: 'Rollback to this deployment' });
  });

  it('hides actions for the current production deployment or unfinished deployments', () => {
    expect(
      getDeploymentReleaseAction(
        {
          id: 'prod-1',
          environment: 'production',
          status: 'deployed',
          container_id: 'cid',
          created_at: '2026-03-07T02:00:00.000Z'
        },
        'prod-1'
      )
    ).toBeNull();

    expect(
      getDeploymentReleaseAction(
        {
          id: 'preview-2',
          environment: 'preview',
          status: 'building',
          container_id: null,
          created_at: '2026-03-07T03:00:00.000Z'
        },
        'prod-1'
      )
    ).toBeNull();
  });
});
