import type { DeploymentPromotionRequestRecord, ProjectReleasePolicyRecord } from '@neopages/core';

import { normalizeProtectedBranches } from './approvals';
import { getProjectAccess } from './collaborators';
import { getOrganizationById } from './organizations';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectReleasePolicyView {
  requirePromotionApproval: boolean;
  protectedBranches: string[];
  useOrganizationReleasePolicy: boolean;
}

function defaultProjectReleasePolicy(): ProjectReleasePolicyView {
  return { requirePromotionApproval: false, protectedBranches: ['main'], useOrganizationReleasePolicy: false };
}

export function resolveEffectiveProjectReleasePolicy(input: {
  project: {
    useOrganizationReleasePolicy: boolean;
    requirePromotionApproval: boolean;
    protectedBranches: string[];
  };
  organization: {
    requirePromotionApproval: boolean;
    protectedBranches: string[];
  } | null;
}): ProjectReleasePolicyView {
  const useOrganizationReleasePolicy = input.project.useOrganizationReleasePolicy && Boolean(input.organization);
  return {
    useOrganizationReleasePolicy,
    requirePromotionApproval: useOrganizationReleasePolicy ? input.organization!.requirePromotionApproval : input.project.requirePromotionApproval,
    protectedBranches: useOrganizationReleasePolicy ? input.organization!.protectedBranches : input.project.protectedBranches
  };
}

export async function getProjectReleasePolicy(projectId: string, actorId?: string): Promise<ProjectReleasePolicyView> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access) {
    return defaultProjectReleasePolicy();
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return defaultProjectReleasePolicy();
  }

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('default_branch, organization_id, use_organization_release_policy')
    .eq('id', projectId)
    .eq('owner_id', access.ownerId)
    .maybeSingle();

  if (projectError || !projectData) {
    return defaultProjectReleasePolicy();
  }

  const project = projectData as { default_branch: string; organization_id: string | null; use_organization_release_policy: boolean };
  const { data, error } = await supabase.from('project_release_policies').select('*').eq('project_id', projectId).eq('owner_id', access.ownerId).maybeSingle();
  if (error) {
    return defaultProjectReleasePolicy();
  }

  const organization = project.use_organization_release_policy && project.organization_id ? await getOrganizationById(project.organization_id) : null;
  const record = data as ProjectReleasePolicyRecord | null;

  return resolveEffectiveProjectReleasePolicy({
    project: {
      useOrganizationReleasePolicy: project.use_organization_release_policy,
      requirePromotionApproval: record?.require_promotion_approval ?? false,
      protectedBranches: record?.protected_branches ?? [project.default_branch]
    },
    organization: organization
      ? {
          requirePromotionApproval: organization.require_promotion_approval,
          protectedBranches: organization.protected_branches
        }
      : null
  });
}

export async function upsertProjectReleasePolicy(
  projectId: string,
  actorId: string | undefined,
  input: { requirePromotionApproval: boolean; protectedBranches: string[] | string; useOrganizationReleasePolicy?: boolean }
): Promise<ProjectReleasePolicyView> {
  const protectedBranches = normalizeProtectedBranches(input.protectedBranches);
  if (!actorId) {
    throw new Error('Authentication required');
  }

  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only project owners can manage release policy');
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

  if (input.useOrganizationReleasePolicy) {
    if (!organizationId) {
      throw new Error('This project does not belong to an organization');
    }

    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    const { error } = await supabase
      .from('projects')
      .update({ use_organization_release_policy: true })
      .eq('id', projectId)
      .eq('owner_id', access.ownerId);

    if (error) {
      throw new Error(error.message);
    }

    await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId, eventType: 'release_policy.updated', summary: `Inherited release policy from ${organization.name}`, metadata: { organizationId } });
    return getProjectReleasePolicy(projectId, actorId);
  }

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({ use_organization_release_policy: false })
    .eq('id', projectId)
    .eq('owner_id', access.ownerId);

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message);
  }

  const { data, error } = await supabase
    .from('project_release_policies')
    .upsert({
      project_id: projectId,
      owner_id: access.ownerId,
      require_promotion_approval: input.requirePromotionApproval,
      protected_branches: protectedBranches
    }, { onConflict: 'project_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save release policy');
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId, eventType: 'release_policy.updated', summary: 'Updated release policy', metadata: { requirePromotionApproval: input.requirePromotionApproval, protectedBranches, useOrganizationReleasePolicy: false } });

  return {
    requirePromotionApproval: (data as ProjectReleasePolicyRecord).require_promotion_approval,
    protectedBranches: (data as ProjectReleasePolicyRecord).protected_branches,
    useOrganizationReleasePolicy: false
  };
}

export async function listPromotionRequests(projectId: string, ownerId?: string) {
  if (!ownerId) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('deployment_promotion_requests')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DeploymentPromotionRequestRecord[];
}

export async function createPromotionRequest(
  projectId: string,
  deploymentId: string,
  ownerId: string | undefined,
  requestComment?: string | null
): Promise<DeploymentPromotionRequestRecord> {
  if (!ownerId) {
    throw new Error('Authentication required');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase
    .from('deployment_promotion_requests')
    .insert({
      project_id: projectId,
      deployment_id: deploymentId,
      target_environment: 'production',
      status: 'pending',
      request_comment: requestComment ?? null,
      requested_by: ownerId
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create promotion request');
  }

  await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: 'promotion.requested', summary: `Requested promotion for deployment ${deploymentId}`, metadata: { deploymentId } });
  return data as DeploymentPromotionRequestRecord;
}

export async function reviewPromotionRequest(
  projectId: string,
  requestId: string,
  ownerId: string | undefined,
  decision: 'approved' | 'rejected',
  reviewComment?: string | null
): Promise<DeploymentPromotionRequestRecord> {
  if (!ownerId) {
    throw new Error('Authentication required');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase
    .from('deployment_promotion_requests')
    .update({ status: decision, reviewed_by: ownerId, review_comment: reviewComment ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to review promotion request');
  }

  await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: decision === 'approved' ? 'promotion.approved' : 'promotion.rejected', summary: `${decision === 'approved' ? 'Approved' : 'Rejected'} promotion request ${requestId}`, metadata: { requestId } });
  return data as DeploymentPromotionRequestRecord;
}
