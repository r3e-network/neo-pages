import { describe, expect, it } from 'vitest';

import { buildRepositoryCacheMutation, groupCachedRepositoriesByInstallation, isRepositoryCacheStale } from './github-cache';

describe('buildRepositoryCacheMutation', () => {
  it('builds upserts and stale repository ids for one installation', () => {
    const result = buildRepositoryCacheMutation({
      ownerId: 'user-1',
      installationId: 17,
      existingRepositoryIds: [1, 3],
      repositories: [
        {
          id: 1,
          name: 'repo-one',
          fullName: 'neo/repo-one',
          defaultBranch: 'main',
          cloneUrl: 'https://github.com/neo/repo-one.git',
          htmlUrl: 'https://github.com/neo/repo-one',
          private: false
        },
        {
          id: 2,
          name: 'repo-two',
          fullName: 'neo/repo-two',
          defaultBranch: 'develop',
          cloneUrl: 'https://github.com/neo/repo-two.git',
          htmlUrl: 'https://github.com/neo/repo-two',
          private: true
        }
      ]
    });

    expect(result.upserts).toHaveLength(2);
    expect(result.upserts[1]).toMatchObject({
      owner_id: 'user-1',
      installation_id: 17,
      repository_id: 2,
      full_name: 'neo/repo-two',
      default_branch: 'develop',
      private: true
    });
    expect(result.staleRepositoryIds).toEqual([3]);
  });
});

describe('groupCachedRepositoriesByInstallation', () => {
  it('groups cached repository rows under their installation ids', () => {
    const grouped = groupCachedRepositoriesByInstallation([
      {
        installation_id: 17,
        owner_id: 'user-1',
        repository_id: 1,
        full_name: 'neo/repo-one',
        name: 'repo-one',
        default_branch: 'main',
        clone_url: 'https://github.com/neo/repo-one.git',
        html_url: 'https://github.com/neo/repo-one',
        private: false
      },
      {
        installation_id: 18,
        owner_id: 'user-1',
        repository_id: 9,
        full_name: 'neo/repo-nine',
        name: 'repo-nine',
        default_branch: 'main',
        clone_url: 'https://github.com/neo/repo-nine.git',
        html_url: 'https://github.com/neo/repo-nine',
        private: true
      }
    ]);

    expect(grouped.get(17)?.[0]).toMatchObject({ fullName: 'neo/repo-one' });
    expect(grouped.get(18)?.[0]).toMatchObject({ private: true, id: 9 });
  });
});

describe('isRepositoryCacheStale', () => {
  it('treats missing sync timestamps as stale', () => {
    expect(isRepositoryCacheStale(null, 1_700_000_000_000, 300_000)).toBe(true);
  });

  it('treats recently synced caches as fresh', () => {
    expect(isRepositoryCacheStale('2026-03-07T01:40:00.000Z', Date.parse('2026-03-07T01:43:00.000Z'), 300_000)).toBe(false);
  });

  it('treats old sync timestamps as stale', () => {
    expect(isRepositoryCacheStale('2026-03-07T01:30:00.000Z', Date.parse('2026-03-07T01:43:00.000Z'), 300_000)).toBe(true);
  });
});
