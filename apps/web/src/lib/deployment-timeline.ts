export interface TimelineDeployment {
  id: string;
  status: string;
  environment: 'production' | 'preview';
  branch: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface DeploymentFilterState {
  environment: 'all' | 'production' | 'preview';
  status: 'all' | 'active' | 'deployed' | 'failed' | 'cancelled';
}

const activeStatuses = new Set(['queued', 'building', 'uploading']);

export function formatDeploymentDuration(startedAt: string | null, finishedAt: string | null, now = Date.now()): string | null {
  if (!startedAt) {
    return null;
  }

  const start = Date.parse(startedAt);
  const end = finishedAt ? Date.parse(finishedAt) : now;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

export function filterDeployments<T extends TimelineDeployment>(deployments: T[], filters: DeploymentFilterState): T[] {
  return deployments.filter((deployment) => {
    const environmentMatch = filters.environment === 'all' || deployment.environment === filters.environment;
    if (!environmentMatch) {
      return false;
    }

    if (filters.status === 'all') {
      return true;
    }

    if (filters.status === 'active') {
      return activeStatuses.has(deployment.status);
    }

    return deployment.status === filters.status;
  });
}
