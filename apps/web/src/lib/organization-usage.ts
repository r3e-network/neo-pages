import { getOrganizationRole } from './organizations';
import { createAdminSupabaseClient } from './supabase';

export interface OrganizationUsageSummary {
  projectCount: number;
  liveProjectCount: number;
  requestCount: number;
  bandwidthBytes: number;
}

function emptyOrganizationUsageSummary(): OrganizationUsageSummary {
  return {
    projectCount: 0,
    liveProjectCount: 0,
    requestCount: 0,
    bandwidthBytes: 0
  };
}

export function resolveOrganizationUsageSummary(input: {
  projectCount: number;
  liveProjectCount: number;
  usageRows: Array<{ requestCount: number; bandwidthBytes: number }>;
}): OrganizationUsageSummary {
  return {
    projectCount: input.projectCount,
    liveProjectCount: input.liveProjectCount,
    requestCount: input.usageRows.reduce((sum, row) => sum + row.requestCount, 0),
    bandwidthBytes: input.usageRows.reduce((sum, row) => sum + row.bandwidthBytes, 0)
  };
}

export async function listOrganizationUsageSummary(organizationId: string, actorId?: string): Promise<OrganizationUsageSummary> {
  const role = await getOrganizationRole(organizationId, actorId);
  if (!role) {
    return emptyOrganizationUsageSummary();
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return emptyOrganizationUsageSummary();
  }

  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('id, status')
    .eq('organization_id', organizationId);

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const projects = (projectsData ?? []) as Array<{ id: string; status: string }>;
  const projectIds = projects.map((project) => project.id);

  if (projectIds.length === 0) {
    return emptyOrganizationUsageSummary();
  }

  const { data: usageData, error: usageError } = await supabase
    .from('project_usage_current_month')
    .select('project_id, request_count, bandwidth_bytes')
    .in('project_id', projectIds);

  if (usageError) {
    throw new Error(usageError.message);
  }

  return resolveOrganizationUsageSummary({
    projectCount: projects.length,
    liveProjectCount: projects.filter((project) => project.status === 'deployed').length,
    usageRows: ((usageData ?? []) as Array<{ request_count: number | null; bandwidth_bytes: number | null }>).map((row) => ({
      requestCount: Number(row.request_count ?? 0),
      bandwidthBytes: Number(row.bandwidth_bytes ?? 0)
    }))
  });
}
