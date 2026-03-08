export function hasActiveDeployment(deployments: Array<{ status: string }>): boolean {
  return deployments.some((deployment) => ['queued', 'building', 'uploading'].includes(deployment.status));
}

export function shouldPollDeploymentLogs(deployments: Array<{ status: string }>): boolean {
  return hasActiveDeployment(deployments);
}
