export function canCancelDeployment(status: string): boolean {
  return ['queued', 'building', 'uploading'].includes(status);
}

export function resolveProjectStatusAfterCancellation(currentContainerId: string | null): 'draft' | 'deployed' {
  return currentContainerId ? 'deployed' : 'draft';
}
