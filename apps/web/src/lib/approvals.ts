export function normalizeProtectedBranches(input: string | string[]): string[] {
  const values = Array.isArray(input) ? input : input.split(',');
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function evaluatePromotionGate(input: {
  deploymentBranch: string;
  protectedBranches: string[];
  requirePromotionApproval: boolean;
}) {
  const protectedBranches = normalizeProtectedBranches(input.protectedBranches);
  const allowed = protectedBranches.includes(input.deploymentBranch);

  if (!allowed) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Branch ${input.deploymentBranch} is not allowed to promote to production`
    };
  }

  return {
    allowed: true,
    requiresApproval: input.requirePromotionApproval,
    reason: null
  };
}
