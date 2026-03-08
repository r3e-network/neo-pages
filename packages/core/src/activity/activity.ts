import { z } from 'zod';

export const projectActivityEvents = [
  'project.created',
  'deployment.queued',
  'deployment.started',
  'deployment.succeeded',
  'deployment.failed',
  'deployment.cancelled',
  'deployment.promoted',
  'env_var.saved',
  'env_var.deleted',
  'domain.added',
  'domain.verified',
  'webhook.created',
  'webhook.deleted',
  'quota_policy.updated',
  'release_policy.updated',
  'promotion.requested',
  'promotion.approved',
  'promotion.rejected',
  'collaborator.added',
  'collaborator.removed',
  'collaborator.invited',
  'collaborator.invite_revoked',
  'collaborator.invite_accepted',
  'schedule.created',
  'schedule.deleted',
  'schedule.triggered',
  'env_group.created',
  'env_group.item_saved',
  'env_group.attached',
  'env_group.detached',
  'api_token.created',
  'api_token.deleted',
  'deploy_hook.created',
  'deploy_hook.deleted',
  'deploy_hook.triggered',
  'gas_sponsorship.updated'
] as const;

export const organizationActivityEvents = [
  'organization.created',
  'organization.governance.updated',
  'organization.member.added',
  'organization.member.removed',
  'organization.member.invited',
  'organization.member.invite_revoked',
  'organization.member.invite_accepted',
  'organization.env_group.created',
  'organization.env_group.item_saved',
  'organization.env_group.deleted'
] as const;

export type ProjectActivityEvent = (typeof projectActivityEvents)[number];
export type OrganizationActivityEvent = (typeof organizationActivityEvents)[number];

export const projectActivityEventSchema = z.enum(projectActivityEvents);
export const organizationActivityEventSchema = z.enum(organizationActivityEvents);

const projectLabels: Record<ProjectActivityEvent, string> = {
  'project.created': 'Project created',
  'deployment.queued': 'Deployment queued',
  'deployment.started': 'Deployment started',
  'deployment.succeeded': 'Deployment succeeded',
  'deployment.failed': 'Deployment failed',
  'deployment.cancelled': 'Deployment cancelled',
  'deployment.promoted': 'Deployment promoted',
  'env_var.saved': 'Environment variable saved',
  'env_var.deleted': 'Environment variable deleted',
  'domain.added': 'Custom domain added',
  'domain.verified': 'Custom domain verified',
  'webhook.created': 'Webhook created',
  'webhook.deleted': 'Webhook removed',
  'quota_policy.updated': 'Quota policy updated',
  'release_policy.updated': 'Release policy updated',
  'promotion.requested': 'Promotion requested',
  'promotion.approved': 'Promotion approved',
  'promotion.rejected': 'Promotion rejected',
  'collaborator.added': 'Collaborator added',
  'collaborator.removed': 'Collaborator removed',
  'collaborator.invited': 'Collaborator invited',
  'collaborator.invite_revoked': 'Collaborator invitation revoked',
  'collaborator.invite_accepted': 'Collaborator invitation accepted',
  'schedule.created': 'Deploy schedule created',
  'schedule.deleted': 'Deploy schedule deleted',
  'schedule.triggered': 'Deploy schedule triggered',
  'env_group.created': 'Environment group created',
  'env_group.item_saved': 'Environment group variable saved',
  'env_group.attached': 'Environment group attached',
  'env_group.detached': 'Environment group detached',
  'api_token.created': 'API token created',
  'api_token.deleted': 'API token deleted',
  'deploy_hook.created': 'Deploy hook created',
  'deploy_hook.deleted': 'Deploy hook deleted',
  'deploy_hook.triggered': 'Deploy hook triggered',
  'gas_sponsorship.updated': 'Gas sponsorship updated'
};

const organizationLabels: Record<OrganizationActivityEvent, string> = {
  'organization.created': 'Organization created',
  'organization.governance.updated': 'Organization policy updated',
  'organization.member.added': 'Organization member added',
  'organization.member.removed': 'Organization member removed',
  'organization.member.invited': 'Organization member invited',
  'organization.member.invite_revoked': 'Organization invite revoked',
  'organization.member.invite_accepted': 'Organization invite accepted',
  'organization.env_group.created': 'Organization environment group created',
  'organization.env_group.item_saved': 'Organization environment group variable saved',
  'organization.env_group.deleted': 'Organization environment group deleted'
};

export function formatProjectActivityLabel(event: ProjectActivityEvent): string {
  return projectLabels[event];
}

export function formatOrganizationActivityLabel(event: OrganizationActivityEvent): string {
  return organizationLabels[event];
}
