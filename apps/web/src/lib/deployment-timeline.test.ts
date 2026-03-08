import { describe, expect, it } from 'vitest';

import { filterDeployments, formatDeploymentDuration } from './deployment-timeline';

const deployments = [
  {
    id: '1',
    status: 'deployed',
    environment: 'production' as const,
    branch: 'main',
    started_at: '2026-03-07T01:00:00.000Z',
    finished_at: '2026-03-07T01:02:05.000Z'
  },
  {
    id: '2',
    status: 'building',
    environment: 'preview' as const,
    branch: 'feature/login',
    started_at: '2026-03-07T02:00:00.000Z',
    finished_at: null
  },
  {
    id: '3',
    status: 'failed',
    environment: 'preview' as const,
    branch: 'fix/header',
    started_at: '2026-03-07T03:00:00.000Z',
    finished_at: '2026-03-07T03:00:20.000Z'
  }
];

describe('formatDeploymentDuration', () => {
  it('formats finished durations as minutes and seconds', () => {
    expect(formatDeploymentDuration('2026-03-07T01:00:00.000Z', '2026-03-07T01:02:05.000Z')).toBe('2m 5s');
  });

  it('formats in-flight durations against now', () => {
    expect(formatDeploymentDuration('2026-03-07T02:00:00.000Z', null, Date.parse('2026-03-07T02:00:12.000Z'))).toBe('12s');
  });

  it('returns null without a start time', () => {
    expect(formatDeploymentDuration(null, null)).toBeNull();
  });
});

describe('filterDeployments', () => {
  it('filters by environment', () => {
    expect(filterDeployments(deployments, { environment: 'preview', status: 'all' }).map((item) => item.id)).toEqual(['2', '3']);
  });

  it('filters by activity state', () => {
    expect(filterDeployments(deployments, { environment: 'all', status: 'active' }).map((item) => item.id)).toEqual(['2']);
  });

  it('filters by exact status', () => {
    expect(filterDeployments(deployments, { environment: 'all', status: 'failed' }).map((item) => item.id)).toEqual(['3']);
  });
});
