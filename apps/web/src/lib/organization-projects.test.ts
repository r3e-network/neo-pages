import { describe, expect, it } from 'vitest';

import {
  buildOrganizationProjectIndex,
  defaultOrganizationProjectFilters,
  filterOrganizationProjects,
  getActiveOrganizationProjectPreset,
  getOrganizationProjectFiltersStorageKey,
  getOrganizationProjectPresetFilters,
  hasNonDefaultOrganizationProjectFilters,
  parseOrganizationProjectFilters
} from './organization-projects';

describe('buildOrganizationProjectIndex', () => {
  it('groups org-owned projects by organization and keeps latest status metadata', () => {
    const grouped = buildOrganizationProjectIndex([
      {
        id: 'project-1',
        name: 'Arcade',
        repoFullName: 'neo/arcade',
        framework: 'nextjs',
        organizationId: 'org-1',
        deploymentUrl: 'https://arcade.neopages.dev',
        status: 'deployed',
        latestStatus: 'deployed',
        latestCommitMessage: 'ship it',
        latestCreatedAt: '2026-03-07T02:00:00.000Z'
      },
      {
        id: 'project-2',
        name: 'Docs',
        repoFullName: 'neo/docs',
        framework: null,
        organizationId: 'org-1',
        deploymentUrl: null,
        status: 'failed',
        latestStatus: 'failed',
        latestCommitMessage: null,
        latestCreatedAt: '2026-03-07T03:00:00.000Z'
      },
      {
        id: 'project-3',
        name: 'Solo',
        repoFullName: 'neo/solo',
        framework: 'react',
        organizationId: null,
        deploymentUrl: null,
        status: 'queued',
        latestStatus: 'queued',
        latestCommitMessage: null,
        latestCreatedAt: '2026-03-07T01:00:00.000Z'
      }
    ]);

    expect(grouped.get('org-1')).toHaveLength(2);
    expect(grouped.get('org-1')?.[0]).toMatchObject({ name: 'Arcade', latestStatus: 'deployed' });
    expect(grouped.get('org-1')?.[1]).toMatchObject({ name: 'Docs', latestStatus: 'failed' });
    expect(grouped.get('org-2')).toBeUndefined();
  });
});

describe('organization project filter persistence helpers', () => {
  it('provides stable defaults and storage keys', () => {
    expect(defaultOrganizationProjectFilters()).toEqual({ query: '', status: 'all', sort: 'recent' });
    expect(getOrganizationProjectFiltersStorageKey('org-1')).toBe('neopages:organization-projects:org-1:filters');
  });

  it('normalizes persisted filter payloads', () => {
    expect(parseOrganizationProjectFilters('{"query":" docs ","status":"failed","sort":"name"}')).toEqual({ query: 'docs', status: 'failed', sort: 'name' });
    expect(parseOrganizationProjectFilters('{"query":"","status":"bogus","sort":"recent"}')).toEqual({ query: '', status: 'all', sort: 'recent' });
    expect(parseOrganizationProjectFilters('{"query":5}')).toEqual({ query: '', status: 'all', sort: 'recent' });
    expect(parseOrganizationProjectFilters('not-json')).toEqual({ query: '', status: 'all', sort: 'recent' });
  });
});

describe('organization project presets', () => {
  it('maps presets onto expected filter combinations', () => {
    expect(getOrganizationProjectPresetFilters('all')).toEqual({ query: '', status: 'all', sort: 'recent' });
    expect(getOrganizationProjectPresetFilters('failures')).toEqual({ query: '', status: 'failed', sort: 'health' });
    expect(getOrganizationProjectPresetFilters('live')).toEqual({ query: '', status: 'deployed', sort: 'recent' });
    expect(getOrganizationProjectPresetFilters('alphabetical')).toEqual({ query: '', status: 'all', sort: 'name' });
  });
});

describe('organization active project preset', () => {
  it('returns the matching preset or custom', () => {
    expect(getActiveOrganizationProjectPreset({ query: '', status: 'all', sort: 'recent' })).toBe('all');
    expect(getActiveOrganizationProjectPreset({ query: '', status: 'failed', sort: 'health' })).toBe('failures');
    expect(getActiveOrganizationProjectPreset({ query: '', status: 'deployed', sort: 'recent' })).toBe('live');
    expect(getActiveOrganizationProjectPreset({ query: '', status: 'all', sort: 'name' })).toBe('alphabetical');
    expect(getActiveOrganizationProjectPreset({ query: 'docs', status: 'all', sort: 'recent' })).toBe('custom');
  });
});

describe('organization project filter reset helper', () => {
  it('detects whether filters diverge from the default preset', () => {
    expect(hasNonDefaultOrganizationProjectFilters({ query: '', status: 'all', sort: 'recent' })).toBe(false);
    expect(hasNonDefaultOrganizationProjectFilters({ query: 'docs', status: 'all', sort: 'recent' })).toBe(true);
    expect(hasNonDefaultOrganizationProjectFilters({ query: '', status: 'failed', sort: 'health' })).toBe(true);
  });
});

describe('filterOrganizationProjects', () => {
  const projects = [
    {
      id: 'project-1',
      name: 'Arcade',
      repoFullName: 'neo/arcade',
      framework: 'nextjs',
      organizationId: 'org-1',
      deploymentUrl: 'https://arcade.neopages.dev',
      status: 'deployed',
      latestStatus: 'deployed',
      latestCommitMessage: 'ship it',
      latestCreatedAt: '2026-03-07T02:00:00.000Z'
    },
    {
      id: 'project-2',
      name: 'Docs',
      repoFullName: 'neo/docs',
      framework: null,
      organizationId: 'org-1',
      deploymentUrl: null,
      status: 'failed',
      latestStatus: 'failed',
      latestCommitMessage: null,
      latestCreatedAt: '2026-03-07T03:00:00.000Z'
    }
  ];

  it('filters by text query across project name and repo', () => {
    expect(filterOrganizationProjects(projects, { query: 'arc', status: 'all', sort: 'recent' }).map((project) => project.name)).toEqual(['Arcade']);
    expect(filterOrganizationProjects(projects, { query: 'neo/docs', status: 'all', sort: 'recent' }).map((project) => project.name)).toEqual(['Docs']);
  });

  it('filters by latest status', () => {
    expect(filterOrganizationProjects(projects, { query: '', status: 'failed', sort: 'recent' }).map((project) => project.name)).toEqual(['Docs']);
    expect(filterOrganizationProjects(projects, { query: '', status: 'deployed', sort: 'recent' }).map((project) => project.name)).toEqual(['Arcade']);
  });

  it('sorts by recent, health, and name', () => {
    expect(filterOrganizationProjects(projects, { query: '', status: 'all', sort: 'recent' }).map((project) => project.name)).toEqual(['Docs', 'Arcade']);
    expect(filterOrganizationProjects(projects, { query: '', status: 'all', sort: 'health' }).map((project) => project.name)).toEqual(['Docs', 'Arcade']);
    expect(filterOrganizationProjects(projects, { query: '', status: 'all', sort: 'name' }).map((project) => project.name)).toEqual(['Arcade', 'Docs']);
  });
});
