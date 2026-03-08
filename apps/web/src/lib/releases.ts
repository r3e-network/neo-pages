export interface ReleaseCandidate {
  id: string;
  environment: 'production' | 'preview';
  status: string;
  container_id: string | null;
  created_at: string;
}

export function getLatestProductionDeploymentId(deployments: ReleaseCandidate[]): string | null {
  const production = deployments
    .filter((deployment) => deployment.environment === 'production' && deployment.status === 'deployed')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return production?.id ?? null;
}

export function getDeploymentReleaseAction(
  deployment: ReleaseCandidate,
  latestProductionDeploymentId: string | null
): { type: 'promote' | 'rollback'; label: string } | null {
  if (deployment.status !== 'deployed' || !deployment.container_id) {
    return null;
  }

  if (deployment.environment === 'preview') {
    return { type: 'promote', label: 'Promote to production' };
  }

  if (deployment.environment === 'production' && deployment.id !== latestProductionDeploymentId) {
    return { type: 'rollback', label: 'Rollback to this deployment' };
  }

  return null;
}
