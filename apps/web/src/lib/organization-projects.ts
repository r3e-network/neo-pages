export interface OrganizationProjectSummary {
  id: string;
  name: string;
  repoFullName: string;
  framework: string | null;
  organizationId: string | null;
  deploymentUrl: string | null;
  status: string;
  latestStatus: string;
  latestCommitMessage: string | null;
  latestCreatedAt?: string | null;
}

export const organizationProjectStatusOptions = ['all', 'queued', 'building', 'uploading', 'deployed', 'failed'] as const;
export type OrganizationProjectFilterStatus = (typeof organizationProjectStatusOptions)[number];

export interface OrganizationProjectFilters {
  query: string;
  status: OrganizationProjectFilterStatus;
  sort: 'recent' | 'health' | 'name';
}

export type OrganizationProjectPreset = 'all' | 'failures' | 'live' | 'alphabetical';
export type OrganizationProjectPresetState = OrganizationProjectPreset | 'custom';

export function defaultOrganizationProjectFilters(): OrganizationProjectFilters {
  return {
    query: '',
    status: 'all',
    sort: 'recent'
  };
}

export function hasNonDefaultOrganizationProjectFilters(filters: OrganizationProjectFilters): boolean {
  const defaults = defaultOrganizationProjectFilters();
  return (
    filters.query.trim() !== defaults.query ||
    filters.status !== defaults.status ||
    filters.sort !== defaults.sort
  );
}

export function getOrganizationProjectPresetFilters(preset: OrganizationProjectPreset): OrganizationProjectFilters {
  switch (preset) {
    case 'failures':
      return { query: '', status: 'failed', sort: 'health' };
    case 'live':
      return { query: '', status: 'deployed', sort: 'recent' };
    case 'alphabetical':
      return { query: '', status: 'all', sort: 'name' };
    case 'all':
    default:
      return defaultOrganizationProjectFilters();
  }
}

export function getActiveOrganizationProjectPreset(filters: OrganizationProjectFilters): OrganizationProjectPresetState {
  const normalized: OrganizationProjectFilters = {
    query: filters.query.trim(),
    status: filters.status,
    sort: filters.sort
  };

  const presets: OrganizationProjectPreset[] = ['all', 'failures', 'live', 'alphabetical'];
  for (const preset of presets) {
    const candidate = getOrganizationProjectPresetFilters(preset);
    if (
      candidate.query === normalized.query &&
      candidate.status === normalized.status &&
      candidate.sort === normalized.sort
    ) {
      return preset;
    }
  }

  return 'custom';
}

export function getOrganizationProjectFiltersStorageKey(organizationId: string) {
  return `neopages:organization-projects:${organizationId}:filters`;
}

function isOrganizationProjectFilterStatus(value: unknown): value is OrganizationProjectFilterStatus {
  return typeof value === 'string' && organizationProjectStatusOptions.includes(value as OrganizationProjectFilterStatus);
}

export function parseOrganizationProjectFilters(raw: string | null | undefined): OrganizationProjectFilters {
  const defaults = defaultOrganizationProjectFilters();
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OrganizationProjectFilters>;
    const query = typeof parsed.query === 'string' ? parsed.query.trim() : defaults.query;
    const status = isOrganizationProjectFilterStatus(parsed.status) ? parsed.status : defaults.status;
    const sort = parsed.sort === 'recent' || parsed.sort === 'health' || parsed.sort === 'name' ? parsed.sort : defaults.sort;
    return { query, status, sort };
  } catch {
    return defaults;
  }
}

export function buildOrganizationProjectIndex(projects: OrganizationProjectSummary[]) {
  const grouped = new Map<string, OrganizationProjectSummary[]>();

  for (const project of projects) {
    if (!project.organizationId) {
      continue;
    }

    const current = grouped.get(project.organizationId) ?? [];
    current.push(project);
    grouped.set(project.organizationId, current);
  }

  return grouped;
}

function statusRank(status: string) {
  switch (status) {
    case 'failed':
      return 0;
    case 'building':
    case 'uploading':
      return 1;
    case 'queued':
      return 2;
    case 'deployed':
      return 3;
    default:
      return 4;
  }
}

export function filterOrganizationProjects<T extends { name: string; repoFullName: string; latestStatus: string; latestCreatedAt?: string | null }>(
  projects: T[],
  filters: OrganizationProjectFilters
) {
  const query = filters.query.trim().toLowerCase();

  const filtered = projects.filter((project) => {
    const matchesQuery =
      query.length === 0 ||
      project.name.toLowerCase().includes(query) ||
      project.repoFullName.toLowerCase().includes(query);
    const matchesStatus = filters.status === 'all' || project.latestStatus === filters.status;
    return matchesQuery && matchesStatus;
  });

  return [...filtered].sort((left, right) => {
    if (filters.sort === 'name') {
      return left.name.localeCompare(right.name);
    }

    if (filters.sort === 'health') {
      const rankDelta = statusRank(left.latestStatus) - statusRank(right.latestStatus);
      if (rankDelta !== 0) {
        return rankDelta;
      }
    }

    const leftTime = left.latestCreatedAt ? Date.parse(left.latestCreatedAt) : 0;
    const rightTime = right.latestCreatedAt ? Date.parse(right.latestCreatedAt) : 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.name.localeCompare(right.name);
  });
}
