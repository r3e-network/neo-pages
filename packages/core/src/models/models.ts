import { z } from 'zod';
import { planTierSchema, type PlanTier } from '../billing/plan-tiers';

export const projectStatuses = ['draft', 'queued', 'building', 'uploading', 'deployed', 'failed'] as const;
export const deploymentStatuses = ['queued', 'building', 'uploading', 'deployed', 'failed', 'cancelled'] as const;
export const deploymentEnvironments = ['production', 'preview'] as const;
export const promotionRequestStatuses = ['pending', 'approved', 'rejected'] as const;

export type ProjectStatus = (typeof projectStatuses)[number];
export type DeploymentStatus = (typeof deploymentStatuses)[number];
export type DeploymentEnvironment = (typeof deploymentEnvironments)[number];
export type PromotionRequestStatus = (typeof promotionRequestStatuses)[number];

export const projectStatusSchema = z.enum(projectStatuses);
export const deploymentStatusSchema = z.enum(deploymentStatuses);
export const deploymentEnvironmentSchema = z.enum(deploymentEnvironments);
export const promotionRequestStatusSchema = z.enum(promotionRequestStatuses);

export const createProjectSchema = z.object({
  name: z.string().min(2).max(60),
  repoFullName: z.string().min(3),
  repoUrl: z.string().url().optional(),
  organizationId: z.string().uuid().optional(),
  defaultBranch: z.string().min(1).default('main'),
  rootDirectory: z.string().default('.'),
  outputDirectory: z.string().optional(),
  installCommand: z.string().optional(),
  buildCommand: z.string().optional(),
  framework: z.enum(['vite', 'next-static', 'cra', 'astro', 'nuxt', 'svelte', 'gatsby', 'static']).optional(),
  subdomain: z.string().optional()
});

export const triggerDeploymentSchema = z.object({
  projectId: z.string().uuid(),
  commitSha: z.string().min(7).optional(),
  commitMessage: z.string().max(500).optional(),
  branch: z.string().min(1).optional()
});

export const builderStatusUpdateSchema = z.object({
  deploymentId: z.string().uuid(),
  status: deploymentStatusSchema,
  logs: z.string().optional(),
  containerId: z.string().optional(),
  deploymentUrl: z.string().url().optional()
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type TriggerDeploymentInput = z.infer<typeof triggerDeploymentSchema>;
export type BuilderStatusUpdateInput = z.infer<typeof builderStatusUpdateSchema>;

export interface ProjectRecord {
  id: string;
  name: string;
  repo_full_name: string;
  repo_url: string | null;
  subdomain: string;
  status: ProjectStatus;
  framework: string | null;
  root_directory: string;
  output_directory: string | null;
  install_command: string | null;
  build_command: string | null;
  default_branch: string;
  github_installation_id: number | null;
  github_repository_id: number | null;
  organization_id: string | null;
  use_organization_quotas: boolean;
  use_organization_release_policy: boolean;
  plan_tier: PlanTier;
  monthly_bandwidth_limit_bytes: number;
  monthly_request_limit: number;
  container_id: string | null;
  deployment_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeploymentRecord {
  id: string;
  project_id: string;
  status: DeploymentStatus;
  environment: DeploymentEnvironment;
  preview_alias: string | null;
  branch: string;
  commit_sha: string | null;
  commit_message: string | null;
  container_id: string | null;
  deployment_url: string | null;
  logs: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface DeploymentArtifactRecord {
  id: string;
  project_id: string;
  deployment_id: string;
  path: string;
  size_bytes: number;
  content_type: string | null;
  created_at: string;
}

export interface GitHubInstallationRecord {
  installation_id: number;
  owner_id: string | null;
  account_login: string;
  account_id: number | null;
  account_type: string | null;
  target_type: string | null;
  app_slug: string | null;
  repository_selection: string | null;
  permissions: Record<string, string> | null;
  repositories_synced_at: string | null;
  suspended_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubInstallationRepositoryRecord {
  installation_id: number;
  owner_id: string;
  repository_id: number;
  full_name: string;
  name: string;
  default_branch: string;
  clone_url: string;
  html_url: string;
  private: boolean;
  created_at: string;
  updated_at: string;
}

export interface DomainRecord {
  id: string;
  project_id: string;
  host: string;
  verification_token: string | null;
  verified_at: string | null;
  last_checked_at: string | null;
  verification_error: string | null;
  created_at: string;
}

export interface ProjectEnvVarRecord {
  id: string;
  project_id: string;
  owner_id: string;
  key: string;
  value: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWebhookEndpointRecord {
  id: string;
  project_id: string;
  owner_id: string;
  target_url: string;
  secret: string | null;
  payload_format: string;
  events: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectActivityEventRecord {
  id: string;
  project_id: string;
  owner_id: string;
  actor_id: string | null;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ProjectWebhookDeliveryRecord {
  id: string;
  project_id: string;
  owner_id: string;
  endpoint_id: string | null;
  target_url: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  status: string;
  attempt_count: number;
  last_response_status: number | null;
  last_response_body: string | null;
  last_error: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  dead_lettered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectUsageDailyRecord {
  project_id: string;
  owner_id: string;
  usage_date: string;
  request_count: number;
  bandwidth_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCollaboratorRecord {
  project_id: string;
  owner_id: string;
  collaborator_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCollaboratorInviteRecord {
  id: string;
  project_id: string;
  owner_id: string;
  email: string;
  role: string;
  invite_token: string;
  status: string;
  invited_by: string;
  accepted_by: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface ProjectApiTokenRecord {
  id: string;
  project_id: string;
  owner_id: string;
  label: string;
  token_prefix: string;
  token_hash: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDeployHookRecord {
  id: string;
  project_id: string;
  owner_id: string;
  label: string;
  secret: string;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDeployScheduleRecord {
  id: string;
  project_id: string;
  owner_id: string;
  label: string;
  branch: string;
  cron_expression: string;
  timezone: string;
  active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectEnvVarGroupRecord {
  id: string;
  owner_id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectEnvVarGroupItemRecord {
  id: string;
  group_id: string;
  owner_id: string;
  organization_id: string | null;
  key: string;
  value: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectEnvVarGroupLinkRecord {
  project_id: string;
  group_id: string;
  owner_id: string;
  created_at: string;
}

export interface OrganizationRecord {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  plan_tier: PlanTier;
  monthly_bandwidth_limit_bytes: number;
  monthly_request_limit: number;
  require_promotion_approval: boolean;
  protected_branches: string[];
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembershipRecord {
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberInviteRecord {
  id: string;
  organization_id: string;
  owner_id: string;
  email: string;
  role: string;
  invite_token: string;
  status: string;
  invited_by: string;
  accepted_by: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface OrganizationActivityEventRecord {
  id: string;
  organization_id: string;
  owner_id: string;
  actor_id: string | null;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface OrganizationWebhookEndpointRecord {
  id: string;
  organization_id: string;
  owner_id: string;
  target_url: string;
  secret: string | null;
  payload_format: string;
  events: string[];
  created_at: string;
  updated_at: string;
}

export interface OrganizationWebhookDeliveryRecord {
  id: string;
  organization_id: string;
  owner_id: string;
  endpoint_id: string | null;
  target_url: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  status: string;
  attempt_count: number;
  last_response_status: number | null;
  last_response_body: string | null;
  last_error: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  dead_lettered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectReleasePolicyRecord {
  project_id: string;
  owner_id: string;
  require_promotion_approval: boolean;
  protected_branches: string[];
  created_at: string;
  updated_at: string;
}

export interface DeploymentPromotionRequestRecord {
  id: string;
  project_id: string;
  deployment_id: string;
  target_environment: DeploymentEnvironment;
  status: PromotionRequestStatus;
  request_comment: string | null;
  requested_by: string;
  reviewed_by: string | null;
  review_comment: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface ProjectGasSponsorshipRecord {
  id: string;
  project_id: string;
  is_enabled: boolean;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectGasSponsorshipView {
  id: string;
  projectId: string;
  isEnabled: boolean;
  balance: number;
  createdAt: string;
  updatedAt: string;
}
