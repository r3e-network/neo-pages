function isProductionBranch(branch: string, defaultBranch: string): boolean {
  return branch.trim().toLowerCase() === defaultBranch.trim().toLowerCase();
}

export function normalizeManualDeployBranch(input: string, defaultBranch: string): string {
  const normalized = input.trim();
  return normalized || defaultBranch;
}

export function describeManualDeploymentTarget(branch: string, defaultBranch: string): {
  environment: 'production' | 'preview';
  label: string;
} {
  if (isProductionBranch(branch, defaultBranch)) {
    return {
      environment: 'production',
      label: 'Redeploy production'
    };
  }

  return {
    environment: 'preview',
    label: 'Deploy preview'
  };
}
