import { randomUUID } from 'node:crypto';

import type { DeploymentRecord, ProjectRecord } from '@neopages/core';
import { buildDeploymentUrl, buildPreviewSubdomain, buildProjectWebhookPayload, createProjectSchema, isProductionBranch, slugifySubdomain } from '@neopages/core';
import { evaluatePromotionGate } from './approvals';
import { resolveAppDataMode, type AppDataMode } from './auth';
import { listProjectCollaboratorInvites } from './collaborator-invites';
import { getProjectAccess, listAccessibleProjectRoles, listProjectCollaborators, type ProjectRole } from './collaborators';
import { listProjectDomains } from './domains';
import { hasSupabasePublicConfig, isGitHubAppEnabled } from './env';
import { getProjectGasSponsorship } from './gas-sponsorship';
import { resolveGitHubRepositoryContext } from './github';
import { getOrganizationById, getOrganizationRole, resolveInheritedProjectGovernance } from './organizations';
import { listProjectActivity, recordProjectActivity } from './project-activity';
import { listProjectApiTokens } from './project-api-tokens';
import { listProjectDeployHooks } from './project-deploy-hooks';
import { listProjectEnvVars } from './project-env';
import { listProjectEnvGroups } from './project-env-groups';
import { listProjectDeploySchedules } from './project-schedules';
import { deliverProjectWebhooks, listProjectWebhookDeliveries, listProjectWebhookEndpoints } from './project-webhooks';
import { createPromotionRequest, getProjectReleasePolicy, listPromotionRequests } from './release-policies';
import { createAdminSupabaseClient } from './supabase';
import { listProjectUsageSummary } from './usage';

export interface ProjectSummary extends ProjectRecord {
  latestDeployment: DeploymentRecord | null;
  accessRole: ProjectRole;
}

export interface DashboardSnapshot {
  projects: ProjectSummary[];
  deploymentCount: number;
  deployedCount: number;
  queuedCount: number;
  mode: AppDataMode;
}

function attachLatestDeployment(projects: ProjectRecord[], deployments: DeploymentRecord[], roles: Map<string, ProjectRole>): ProjectSummary[] {
  return projects.map((project) => ({
    ...project,
    accessRole: roles.get(project.id) ?? 'owner',
    latestDeployment:
      deployments
        .filter((deployment) => deployment.project_id === project.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  }));
}

export async function listDashboardSnapshot(userId?: string): Promise<DashboardSnapshot> {
  const mode = resolveAppDataMode({ hasSupabasePublicConfig: hasSupabasePublicConfig(), hasUser: Boolean(userId) });
  if (!userId) {
    return {
      projects: [],
      deploymentCount: 0,
      deployedCount: 0,
      queuedCount: 0,
      mode
    };
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const accessRoles = await listAccessibleProjectRoles(userId);
  const projectIds = Array.from(accessRoles.keys());

  if (projectIds.length === 0) {
    return {
      projects: [],
      deploymentCount: 0,
      deployedCount: 0,
      queuedCount: 0,
      mode
    };
  }

  const [{ data: projectsData, error: projectsError }, { data: deploymentsData, error: deploymentsError }] = await Promise.all([
    supabase.from('projects').select('*').in('id', projectIds).order('created_at', { ascending: false }),
    supabase.from('deployments').select('*').in('project_id', projectIds).order('created_at', { ascending: false })
  ]);

  if (projectsError || deploymentsError) {
    throw new Error(projectsError?.message ?? deploymentsError?.message ?? 'Failed to load dashboard data');
  }

  const projects = (projectsData ?? []) as ProjectRecord[];
  const deployments = ((deploymentsData ?? []) as DeploymentRecord[]).map((deployment) => ({
    id: deployment.id,
    project_id: deployment.project_id,
    status: deployment.status,
    environment: deployment.environment,
    preview_alias: deployment.preview_alias,
    branch: deployment.branch,
    commit_sha: deployment.commit_sha,
    commit_message: deployment.commit_message,
    container_id: deployment.container_id,
    deployment_url: deployment.deployment_url,
    logs: deployment.logs,
    created_at: deployment.created_at,
    started_at: deployment.started_at,
    finished_at: deployment.finished_at
  }));
  const projectSummaries = attachLatestDeployment(projects, deployments, accessRoles);

  return {
    projects: projectSummaries,
    deploymentCount: deployments.length,
    deployedCount: projectSummaries.filter((project) => project.status === 'deployed').length,
    queuedCount: projectSummaries.filter((project) => ['queued', 'building', 'uploading'].includes(project.latestDeployment?.status ?? project.status)).length,
    mode
  };
}

export async function getProjectDetails(projectId: string, userId?: string) {
  if (!userId) {
    return null;
  }

  const access = await getProjectAccess(projectId, userId);
  if (!access) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !projectData) {
    return null;
  }

  const { data: deploymentData, error: deploymentError } = await supabase
    .from('deployments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (deploymentError) {
    return null;
  }

  const project = projectData as ProjectRecord;
  const organization = project.organization_id ? await getOrganizationById(project.organization_id) : null;

  return {
    project,
    organization: organization ? { id: organization.id, name: organization.name } : null,
    deployments: (deploymentData ?? []) as DeploymentRecord[],
    domains: await listProjectDomains(projectId, userId),
    envVars: await listProjectEnvVars(projectId, userId),
    envGroups: await listProjectEnvGroups(projectId, userId),
    usage: await listProjectUsageSummary(projectId, userId),
    webhooks: await listProjectWebhookEndpoints(projectId, userId),
    webhookDeliveries: await listProjectWebhookDeliveries(projectId, userId),
    releasePolicy: await getProjectReleasePolicy(projectId, userId),
    promotionRequests: await listPromotionRequests(projectId, userId),
    collaborators: await listProjectCollaborators(projectId, userId),
    collaboratorInvites: await listProjectCollaboratorInvites(projectId, userId),
    apiTokens: await listProjectApiTokens(projectId, userId),
    deployHooks: await listProjectDeployHooks(projectId, userId),
    schedules: await listProjectDeploySchedules(projectId, userId),
    accessRole: access.role,
    activity: await listProjectActivity(projectId, userId),
    gasSponsorship: await getProjectGasSponsorship(projectId, userId)
  };
}

export async function createProject(input: unknown, ownerId?: string) {
  const parsed = createProjectSchema.parse(input);
  if (!ownerId) {
    throw new Error('You must sign in before creating a project');
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const subdomain = parsed.subdomain ?? slugifySubdomain(parsed.name);
  const githubRepo = isGitHubAppEnabled() ? await resolveGitHubRepositoryContext(parsed.repoFullName, ownerId) : null;

  if (isGitHubAppEnabled() && !githubRepo) {
    throw new Error(`No GitHub App installation found for ${parsed.repoFullName}. Install the NeoPages GitHub App first.`);
  }

  const organizationId = typeof (parsed as { organizationId?: string }).organizationId === 'string' && (parsed as { organizationId?: string }).organizationId ? (parsed as { organizationId?: string }).organizationId : null;
  const organization = organizationId ? await getOrganizationById(organizationId) : null;
  const organizationRole = organizationId ? await getOrganizationRole(organizationId, ownerId) : null;

  if (organizationId && (!organization || !organizationRole)) {
    throw new Error('Organization not found or access denied');
  }

  const inherited = organization
    ? resolveInheritedProjectGovernance({
        project: {
          useOrganizationQuotas: true,
          useOrganizationReleasePolicy: true,
          planTier: 'free',
          monthlyBandwidthLimitBytes: 10 * 1024 * 1024 * 1024,
          monthlyRequestLimit: 100_000,
          requirePromotionApproval: false,
          protectedBranches: [parsed.defaultBranch]
        },
        organization: {
          planTier: organization.plan_tier,
          monthlyBandwidthLimitBytes: organization.monthly_bandwidth_limit_bytes,
          monthlyRequestLimit: organization.monthly_request_limit,
          requirePromotionApproval: organization.require_promotion_approval,
          protectedBranches: organization.protected_branches
        }
      })
    : null;

  const projectInsert = {
    owner_id: organization?.owner_id ?? ownerId,
    organization_id: organizationId,
    use_organization_quotas: Boolean(organization),
    use_organization_release_policy: Boolean(organization),
    name: parsed.name,
    repo_full_name: parsed.repoFullName,
    repo_url: parsed.repoUrl ?? githubRepo?.cloneUrl ?? `https://github.com/${parsed.repoFullName}.git`,
    subdomain,
    status: 'queued',
    framework: parsed.framework ?? null,
    root_directory: parsed.rootDirectory,
    output_directory: parsed.outputDirectory ?? null,
    install_command: parsed.installCommand ?? null,
    build_command: parsed.buildCommand ?? null,
    default_branch: githubRepo?.defaultBranch ?? parsed.defaultBranch,
    github_installation_id: githubRepo?.installationId ?? null,
    github_repository_id: githubRepo?.repositoryId ?? null,
    plan_tier: inherited?.planTier ?? 'free',
    monthly_bandwidth_limit_bytes: inherited?.monthlyBandwidthLimitBytes ?? 10 * 1024 * 1024 * 1024,
    monthly_request_limit: inherited?.monthlyRequestLimit ?? 100_000
  };

  const { data: project, error: projectError } = await supabase.from('projects').insert(projectInsert).select('*').single();
  if (projectError || !project) {
    throw new Error(projectError?.message ?? 'Failed to create project');
  }

  const deploymentInsert = {
    project_id: project.id,
    status: 'queued',
    environment: 'production',
    preview_alias: null,
    branch: project.default_branch,
    commit_sha: null,
    commit_message: 'Initial deployment queued from dashboard',
    logs: 'Queued from dashboard\n'
  };

  const { data: deployment, error: deploymentError } = await supabase
    .from('deployments')
    .insert(deploymentInsert)
    .select('*')
    .single();

  if (deploymentError || !deployment) {
    throw new Error(deploymentError?.message ?? 'Failed to queue deployment');
  }

  await recordProjectActivity({ projectId: project.id, ownerId, actorId: ownerId, eventType: 'project.created', summary: `Created project ${project.name}`, metadata: { repoFullName: project.repo_full_name } });
  await recordProjectActivity({ projectId: project.id, ownerId, actorId: ownerId, eventType: 'deployment.queued', summary: 'Queued initial production deployment', metadata: { deploymentId: deployment.id, environment: 'production', branch: project.default_branch } });

  return {
    project: project as ProjectRecord,
    deployment: deployment as DeploymentRecord
  };
}


export async function queueProjectDeployment(projectId: string, ownerId: string | undefined, input: { branch?: string; commitSha?: string; commitMessage?: string }) {
  if (!ownerId) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !project) {
    return null;
  }

  const typedProject = project as ProjectRecord & { owner_id: string };

  if (typedProject.owner_id !== ownerId) {
    return null;
  }

  const branch = input.branch ?? typedProject.default_branch;
  const environment = isProductionBranch(branch, typedProject.default_branch) ? 'production' : 'preview';
  const previewAlias = environment === 'preview' ? buildPreviewSubdomain(branch, typedProject.subdomain) : null;

  const deploymentInsert = {
    id: randomUUID(),
    project_id: typedProject.id,
    status: 'queued',
    environment,
    preview_alias: previewAlias,
    branch,
    commit_sha: input.commitSha ?? null,
    commit_message: input.commitMessage ?? `Queued manually for ${branch}`,
    logs: 'Queued from manual project trigger\n'
  };

  const { data: deployment, error: deploymentError } = await supabase
    .from('deployments')
    .insert(deploymentInsert)
    .select('*')
    .single();

  if (deploymentError || !deployment) {
    throw new Error(deploymentError?.message ?? 'Failed to create deployment');
  }

  if (environment === 'production') {
    await supabase.from('projects').update({ status: 'queued' }).eq('id', typedProject.id);
  }

  await recordProjectActivity({ projectId: typedProject.id, ownerId, actorId: ownerId, eventType: 'deployment.queued', summary: `Queued ${environment} deployment from ${branch}`, metadata: { deploymentId: deployment.id, environment, branch } });

  return deployment as DeploymentRecord;
}

export async function queueDeploymentForRepository(input: {
  repoFullName: string;
  branch: string;
  commitSha?: string;
  commitMessage?: string;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('repo_full_name', input.repoFullName)
    .limit(1)
    .maybeSingle();

  if (projectError || !project) {
    return null;
  }

  const environment = isProductionBranch(input.branch, project.default_branch) ? 'production' : 'preview';
  const previewAlias = environment === 'preview' ? buildPreviewSubdomain(input.branch, project.subdomain) : null;

  const deploymentInsert = {
    id: randomUUID(),
    project_id: project.id,
    status: 'queued',
    environment,
    preview_alias: previewAlias,
    branch: input.branch,
    commit_sha: input.commitSha ?? null,
    commit_message: input.commitMessage ?? null,
    logs: 'Queued from GitHub webhook\n'
  };

  const { data: deployment, error: deploymentError } = await supabase
    .from('deployments')
    .insert(deploymentInsert)
    .select('*')
    .single();

  if (deploymentError || !deployment) {
    throw new Error(deploymentError?.message ?? 'Failed to create deployment');
  }

  if (environment === 'production') {
    await supabase.from('projects').update({ status: 'queued' }).eq('id', project.id);
  }

  await recordProjectActivity({ projectId: project.id, ownerId: project.owner_id, actorId: project.owner_id, eventType: 'deployment.queued', summary: `Queued ${environment} deployment from ${input.branch}`, metadata: { deploymentId: deployment.id, environment, branch: input.branch } });

  return deployment as DeploymentRecord;
}

export async function promoteDeployment(projectId: string, deploymentId: string, ownerId?: string) {
  if (!ownerId) {
    throw new Error('Authentication required');
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (projectError || !projectData) {
    throw new Error('Project not found');
  }

  const project = projectData as ProjectRecord;

  const { data: sourceDeploymentData, error: sourceDeploymentError } = await supabase
    .from('deployments')
    .select('*')
    .eq('id', deploymentId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (sourceDeploymentError || !sourceDeploymentData) {
    throw new Error('Deployment not found');
  }

  const sourceDeployment = sourceDeploymentData as DeploymentRecord;
  if (sourceDeployment.status !== 'deployed' || !sourceDeployment.container_id) {
    throw new Error('Only successful deployments can be promoted');
  }

  const policy = await getProjectReleasePolicy(projectId, ownerId);
  const gate = evaluatePromotionGate({
    deploymentBranch: sourceDeployment.branch,
    protectedBranches: policy.protectedBranches.length > 0 ? policy.protectedBranches : [project.default_branch],
    requirePromotionApproval: policy.requirePromotionApproval
  });

  if (!gate.allowed) {
    throw new Error(gate.reason ?? 'Promotion is blocked by release policy');
  }

  if (gate.requiresApproval) {
    await createPromotionRequest(projectId, deploymentId, ownerId, `Promotion requested for ${sourceDeployment.branch}`);
    throw new Error('Promotion request created and is awaiting approval');
  }

  const productionUrl = buildDeploymentUrl(
    project.subdomain,
    process.env.NEOPAGES_ROOT_DOMAIN ?? 'neopages.dev',
    process.env.EDGE_PUBLIC_ORIGIN
  );
  const timestamp = new Date().toISOString();

  const promotedInsert = {
    id: randomUUID(),
    project_id: projectId,
    status: 'deployed',
    environment: 'production',
    preview_alias: null,
    branch: sourceDeployment.branch,
    commit_sha: sourceDeployment.commit_sha,
    commit_message:
      sourceDeployment.environment === 'preview'
        ? `Promoted ${sourceDeployment.branch} to production`
        : `Rolled back to ${sourceDeployment.commit_sha ?? sourceDeployment.branch}`,
    container_id: sourceDeployment.container_id,
    deployment_url: productionUrl,
    logs: `${sourceDeployment.logs ?? ''}\nReleased to production from ${sourceDeployment.id}\n`,
    created_at: timestamp,
    started_at: timestamp,
    finished_at: timestamp
  };

  const { data: promotedData, error: promotedError } = await supabase
    .from('deployments')
    .insert(promotedInsert)
    .select('*')
    .single();

  if (promotedError || !promotedData) {
    throw new Error(promotedError?.message ?? 'Failed to promote deployment');
  }

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      status: 'deployed',
      container_id: sourceDeployment.container_id,
      deployment_url: productionUrl,
      updated_at: timestamp
    })
    .eq('id', projectId);

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message);
  }

  const promotedDeployment = promotedData as DeploymentRecord;
  await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: 'deployment.promoted', summary: `Promoted deployment ${sourceDeployment.id} to production`, metadata: { deploymentId: promotedDeployment.id, sourceDeploymentId: sourceDeployment.id } });

  await deliverProjectWebhooks({
    event: 'deployment.promoted',
    projectId,
    payload: buildProjectWebhookPayload({
      event: 'deployment.promoted',
      project: {
        id: project.id,
        name: project.name,
        subdomain: project.subdomain,
        repoFullName: project.repo_full_name
      },
      deployment: {
        id: promotedDeployment.id,
        environment: promotedDeployment.environment,
        branch: promotedDeployment.branch,
        status: promotedDeployment.status,
        deploymentUrl: promotedDeployment.deployment_url,
        commitSha: promotedDeployment.commit_sha,
        previewAlias: promotedDeployment.preview_alias
      }
    })
  });

  return promotedDeployment;
}
