import { notFound, redirect } from 'next/navigation';

import { ProjectActivityFeed } from '../../../components/project-activity-feed';
import { ProjectApiTokensManager } from '../../../components/project-api-tokens-manager';
import { ProjectCollaboratorInvitesManager } from '../../../components/project-collaborator-invites-manager';
import { ProjectCollaboratorsManager } from '../../../components/project-collaborators-manager';
import { ProjectDeploymentArtifactsBrowser } from '../../../components/project-deployment-artifacts-browser';
import { ProjectDeploymentsLive } from '../../../components/project-deployments-live';
import { ProjectDeployHooksManager } from '../../../components/project-deploy-hooks-manager';
import { ProjectDeploySchedulesManager } from '../../../components/project-deploy-schedules-manager';
import { ProjectDomainsManager } from '../../../components/project-domains-manager';
import { ProjectEnvGroupsManager } from '../../../components/project-env-groups-manager';
import { ProjectEnvVarsManager } from '../../../components/project-env-vars-manager';
import { ProjectGasSponsorshipCard } from '../../../components/project-gas-sponsorship-card';
import { ProjectManualDeployCard } from '../../../components/project-manual-deploy-card';
import { ProjectPromotionRequestsManager } from '../../../components/project-promotion-requests-manager';
import { ProjectQuotaManager } from '../../../components/project-quota-manager';
import { ProjectReleasePolicyManager } from '../../../components/project-release-policy-manager';
import { ProjectUsageSummaryCard } from '../../../components/project-usage-summary-card';
import { ProjectWebhookDeliveriesFeed } from '../../../components/project-webhook-deliveries-feed';
import { ProjectWebhooksManager } from '../../../components/project-webhooks-manager';
import { StatusPill } from '../../../components/status-pill';
import { hasSupabasePublicConfig } from '../../../lib/env';
import { getProjectDetails } from '../../../lib/projects-service';
import { getOptionalAuthenticatedUser } from '../../../lib/supabase-auth';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOptionalAuthenticatedUser();
  const details = await getProjectDetails(id, user?.id);
  const rootDomain = process.env.NEOPAGES_ROOT_DOMAIN ?? 'neopages.dev';

  if (!details) {
    if (hasSupabasePublicConfig() && !user) {
      redirect('/dashboard?auth=required');
    }

    notFound();
  }

  const { project, organization, deployments, domains, envVars, envGroups, usage, webhooks, webhookDeliveries, releasePolicy, promotionRequests, collaborators, collaboratorInvites, apiTokens, deployHooks, schedules, accessRole, activity, gasSponsorship } = details;

  return (
    <main className="stack">
      <section className="project-header card">
        <div className="project-header__meta">
          <div>
            <p className="eyebrow">Project</p>
            <h1>{project.name}</h1>
          </div>
          <StatusPill status={project.status} />
        </div>

        <div className="project-meta">
          <span>{project.repo_full_name}</span>
          <span>{project.subdomain}.{rootDomain}</span>
          <span>{project.output_directory ?? 'auto output'}</span>
          <span>{accessRole}</span>
        </div>

        <p>
          {project.deployment_url ? (
            <a href={project.deployment_url} target="_blank" rel="noreferrer">
              Open latest deployment
            </a>
          ) : (
            <span className="muted">No successful deployment yet.</span>
          )}
        </p>
      </section>

      <ProjectManualDeployCard projectId={project.id} defaultBranch={project.default_branch} accessRole={accessRole} />
      <ProjectDeploymentsLive projectId={project.id} initialDeployments={deployments} requireApproval={releasePolicy.requirePromotionApproval} />
      <ProjectDeploymentArtifactsBrowser projectId={project.id} deployments={deployments.map((deployment) => ({ id: deployment.id, commitMessage: deployment.commit_message, environment: deployment.environment, branch: deployment.branch, status: deployment.status }))} />
      <ProjectDomainsManager projectId={project.id} initialDomains={domains} />
      <ProjectEnvVarsManager projectId={project.id} initialEnvVars={envVars} />
      <ProjectEnvGroupsManager projectId={project.id} accessRole={accessRole} organization={organization} initialGroups={envGroups} />
      <ProjectApiTokensManager projectId={project.id} initialTokens={apiTokens} accessRole={accessRole} />
      <ProjectDeployHooksManager projectId={project.id} initialHooks={deployHooks} accessRole={accessRole} />
      <ProjectDeploySchedulesManager projectId={project.id} defaultBranch={project.default_branch} accessRole={accessRole} initialSchedules={schedules} />
      <ProjectUsageSummaryCard usage={usage} />
      <ProjectQuotaManager projectId={project.id} accessRole={accessRole} organization={organization} initialUsage={usage} />
      <ProjectGasSponsorshipCard projectId={project.id} initialSponsorship={gasSponsorship} accessRole={accessRole} />
      <ProjectWebhooksManager projectId={project.id} initialEndpoints={webhooks} />
      <ProjectWebhookDeliveriesFeed initialDeliveries={webhookDeliveries} />
      <ProjectCollaboratorsManager projectId={project.id} initialCollaborators={collaborators} accessRole={accessRole} />
      <ProjectCollaboratorInvitesManager projectId={project.id} initialInvites={collaboratorInvites} accessRole={accessRole} />
      <ProjectReleasePolicyManager projectId={project.id} accessRole={accessRole} organization={organization} initialPolicy={releasePolicy} />
      <ProjectPromotionRequestsManager projectId={project.id} initialRequests={promotionRequests} />
      <ProjectActivityFeed initialActivity={activity} />
    </main>
  );
}
