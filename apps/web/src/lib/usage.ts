import type { ProjectRecord } from '@neopages/core';
import { planTierSchema, resolvePlanTierQuota, type PlanTier } from '@neopages/core';
import { getProjectAccess } from './collaborators';
import { getOrganizationById } from './organizations';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectUsageSummary {
  requestCount: number;
  bandwidthBytes: number;
  planTier: PlanTier;
  monthlyBandwidthLimitBytes: number;
  monthlyRequestLimit: number;
  useOrganizationQuotas: boolean;
}

function defaultUsageSummary(): ProjectUsageSummary {
  return {
    requestCount: 0,
    bandwidthBytes: 0,
    planTier: 'free',
    monthlyBandwidthLimitBytes: 10 * 1024 * 1024 * 1024,
    monthlyRequestLimit: 100_000,
    useOrganizationQuotas: false
  };
}

export function resolveEffectiveProjectQuotaSummary(input: {
  requestCount: number;
  bandwidthBytes: number;
  project: {
    useOrganizationQuotas: boolean;
    planTier: PlanTier;
    monthlyBandwidthLimitBytes: number;
    monthlyRequestLimit: number;
  };
  organization: {
    planTier: PlanTier;
    monthlyBandwidthLimitBytes: number;
    monthlyRequestLimit: number;
  } | null;
}): ProjectUsageSummary {
  const useOrganizationQuotas = input.project.useOrganizationQuotas && Boolean(input.organization);
  return {
    requestCount: input.requestCount,
    bandwidthBytes: input.bandwidthBytes,
    useOrganizationQuotas,
    planTier: useOrganizationQuotas ? input.organization!.planTier : input.project.planTier,
    monthlyBandwidthLimitBytes: useOrganizationQuotas ? input.organization!.monthlyBandwidthLimitBytes : input.project.monthlyBandwidthLimitBytes,
    monthlyRequestLimit: useOrganizationQuotas ? input.organization!.monthlyRequestLimit : input.project.monthlyRequestLimit
  };
}

export function formatBandwidth(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function isBandwidthLimitExceeded(usedBytes: number, limitBytes: number): boolean {
  return usedBytes >= limitBytes;
}

export function isRequestLimitExceeded(requestCount: number, requestLimit: number): boolean {
  return requestCount >= requestLimit;
}

export async function listProjectUsageSummary(projectId: string, actorId?: string): Promise<ProjectUsageSummary> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access) {
    return defaultUsageSummary();
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return defaultUsageSummary();
  }

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, use_organization_quotas, plan_tier, monthly_bandwidth_limit_bytes, monthly_request_limit')
    .eq('id', projectId)
    .eq('owner_id', access.ownerId)
    .maybeSingle();

  if (projectError || !projectData) {
    return defaultUsageSummary();
  }

  const project = projectData as Pick<ProjectRecord, 'id' | 'organization_id' | 'use_organization_quotas' | 'plan_tier' | 'monthly_bandwidth_limit_bytes' | 'monthly_request_limit'>;

  const { data: usageData, error: usageError } = await supabase
    .from('project_usage_current_month')
    .select('*')
    .eq('project_id', project.id)
    .limit(1)
    .maybeSingle();

  if (usageError) {
    throw new Error(usageError.message);
  }

  const organization = project.use_organization_quotas && project.organization_id ? await getOrganizationById(project.organization_id) : null;

  return resolveEffectiveProjectQuotaSummary({
    requestCount: Number((usageData as { request_count?: number } | null)?.request_count ?? 0),
    bandwidthBytes: Number((usageData as { bandwidth_bytes?: number } | null)?.bandwidth_bytes ?? 0),
    project: {
      useOrganizationQuotas: project.use_organization_quotas,
      planTier: project.plan_tier,
      monthlyBandwidthLimitBytes: project.monthly_bandwidth_limit_bytes,
      monthlyRequestLimit: project.monthly_request_limit
    },
    organization: organization
      ? {
          planTier: organization.plan_tier,
          monthlyBandwidthLimitBytes: organization.monthly_bandwidth_limit_bytes,
          monthlyRequestLimit: organization.monthly_request_limit
        }
      : null
  });
}

export async function recordProjectUsage(input: { projectId: string; bytes: number; requestCount?: number }) {
  const requestCount = input.requestCount ?? 1;
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return;
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, owner_id')
    .eq('id', input.projectId)
    .maybeSingle();

  if (projectError || !project) {
    return;
  }

  const usageDate = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from('project_usage_daily')
    .select('*')
    .eq('project_id', input.projectId)
    .eq('usage_date', usageDate)
    .maybeSingle();

  const nextRequestCount = Number((existing as { request_count?: number } | null)?.request_count ?? 0) + requestCount;
  const nextBandwidthBytes = Number((existing as { bandwidth_bytes?: number } | null)?.bandwidth_bytes ?? 0) + input.bytes;

  const { error } = await supabase.from('project_usage_daily').upsert(
    {
      project_id: input.projectId,
      owner_id: (project as { owner_id: string }).owner_id,
      usage_date: usageDate,
      request_count: nextRequestCount,
      bandwidth_bytes: nextBandwidthBytes
    },
    { onConflict: 'project_id,usage_date' }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProjectQuotaPolicy(
  projectId: string,
  actorId: string | undefined,
  input: { planTier: string; monthlyBandwidthLimitBytes?: number; monthlyRequestLimit?: number; useOrganizationQuotas?: boolean }
): Promise<ProjectUsageSummary> {
  if (!actorId) {
    throw new Error('Authentication required');
  }

  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only project owners can manage quota policy');
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .eq('owner_id', access.ownerId)
    .maybeSingle();

  if (projectError || !projectData) {
    throw new Error('Project not found');
  }

  const organizationId = (projectData as { organization_id?: string | null }).organization_id ?? null;

  if (input.useOrganizationQuotas) {
    if (!organizationId) {
      throw new Error('This project does not belong to an organization');
    }

    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    const { error } = await supabase
      .from('projects')
      .update({
        use_organization_quotas: true,
        plan_tier: organization.plan_tier,
        monthly_bandwidth_limit_bytes: organization.monthly_bandwidth_limit_bytes,
        monthly_request_limit: organization.monthly_request_limit
      })
      .eq('id', projectId)
      .eq('owner_id', access.ownerId);

    if (error) {
      throw new Error(error.message);
    }

    await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId, eventType: 'quota_policy.updated', summary: `Inherited quota policy from ${organization.name}`, metadata: { organizationId } });
    return listProjectUsageSummary(projectId, actorId);
  }

  const planTier = planTierSchema.parse(input.planTier);
  const preset = resolvePlanTierQuota(planTier, {
    monthlyBandwidthLimitBytes: input.monthlyBandwidthLimitBytes,
    monthlyRequestLimit: input.monthlyRequestLimit
  });

  const { error } = await supabase
    .from('projects')
    .update({
      use_organization_quotas: false,
      plan_tier: planTier,
      monthly_bandwidth_limit_bytes: preset.monthlyBandwidthLimitBytes,
      monthly_request_limit: preset.monthlyRequestLimit
    })
    .eq('id', projectId)
    .eq('owner_id', access.ownerId);

  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId, eventType: 'quota_policy.updated', summary: `Updated plan tier to ${planTier}`, metadata: { ...preset, useOrganizationQuotas: false } });
  return listProjectUsageSummary(projectId, actorId);
}
