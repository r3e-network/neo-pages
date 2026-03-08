export interface CachedGitHubRepositoryRow {
  installation_id: number;
  owner_id: string;
  repository_id: number;
  full_name: string;
  name: string;
  default_branch: string;
  clone_url: string;
  html_url: string;
  private: boolean;
}

export interface CacheableGitHubRepository {
  id: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  cloneUrl: string;
  htmlUrl: string;
  private: boolean;
}

export function buildRepositoryCacheMutation(input: {
  ownerId: string;
  installationId: number;
  existingRepositoryIds: number[];
  repositories: CacheableGitHubRepository[];
}) {
  const nextRepositoryIds = input.repositories.map((repository) => repository.id);

  return {
    upserts: input.repositories.map<CachedGitHubRepositoryRow>((repository) => ({
      owner_id: input.ownerId,
      installation_id: input.installationId,
      repository_id: repository.id,
      full_name: repository.fullName,
      name: repository.name,
      default_branch: repository.defaultBranch,
      clone_url: repository.cloneUrl,
      html_url: repository.htmlUrl,
      private: repository.private
    })),
    staleRepositoryIds: input.existingRepositoryIds.filter((repositoryId) => !nextRepositoryIds.includes(repositoryId))
  };
}

export function groupCachedRepositoriesByInstallation(rows: CachedGitHubRepositoryRow[]) {
  const grouped = new Map<number, CacheableGitHubRepository[]>();

  for (const row of rows) {
    const repositories = grouped.get(row.installation_id) ?? [];
    repositories.push({
      id: row.repository_id,
      name: row.name,
      fullName: row.full_name,
      defaultBranch: row.default_branch,
      cloneUrl: row.clone_url,
      htmlUrl: row.html_url,
      private: row.private
    });
    grouped.set(row.installation_id, repositories);
  }

  return grouped;
}

export function isRepositoryCacheStale(
  repositoriesSyncedAt: string | null,
  now = Date.now(),
  ttlMs = Number.parseInt(process.env.GITHUB_INSTALLATION_CACHE_TTL_MS ?? '300000', 10)
): boolean {
  if (!repositoriesSyncedAt) {
    return true;
  }

  const syncedAt = Date.parse(repositoriesSyncedAt);
  if (!Number.isFinite(syncedAt)) {
    return true;
  }

  return now - syncedAt > ttlMs;
}
