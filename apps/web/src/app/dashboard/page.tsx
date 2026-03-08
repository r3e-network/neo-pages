import { CreateProjectForm } from '../../components/create-project-form';
import { GitHubConnectButton } from '../../components/github-connect-button';
import { OrganizationsManager } from '../../components/organizations-manager';
import { MetricCard } from '../../components/metric-card';
import { ProjectCard } from '../../components/project-card';
import { resolveAppDataMode } from '../../lib/auth';
import { hasSupabasePublicConfig, isGitHubAppEnabled } from '../../lib/env';
import { listOrganizationInvites } from '../../lib/organization-invites';
import { listOrganizationWebhookDeliveries, listOrganizationWebhookEndpoints } from '../../lib/organization-webhooks';
import { buildOrganizationProjectIndex } from '../../lib/organization-projects';
import { listOrganizationActivity } from '../../lib/organization-activity';
import { listOrganizationUsageSummary } from '../../lib/organization-usage';
import { listOrganizationEnvGroups } from '../../lib/project-env-groups';
import { listOrganizationMembers, listUserOrganizations } from '../../lib/organizations';
import { listDashboardSnapshot } from '../../lib/projects-service';
import { getOptionalAuthenticatedUser } from '../../lib/supabase-auth';

function githubBanner(searchParams: Record<string, string | string[] | undefined>) {
  const state = typeof searchParams.github_app === 'string' ? searchParams.github_app : undefined;
  const installations = typeof searchParams.installations === 'string' ? searchParams.installations : undefined;
  const message = typeof searchParams.message === 'string' ? searchParams.message : undefined;
  const auth = typeof searchParams.auth === 'string' ? searchParams.auth : undefined;

  if (state === 'connected') {
    return `GitHub App connected. Synced ${installations ?? '0'} installation(s).`;
  }

  if (state === 'error') {
    return message ?? 'GitHub App sync failed.';
  }

  if (state === 'missing-code') {
    return 'GitHub App callback did not include an authorization code.';
  }

  if (state === 'auth-required') {
    return 'Sign in to NeoPages before attaching a GitHub App installation.';
  }

  if (state === 'install-after-login') {
    return 'You are signed in. Install the GitHub App now to sync repositories.';
  }

  if (auth === 'missing-code') {
    return 'GitHub sign-in callback did not include an authorization code.';
  }

  if (auth === 'error') {
    return 'Supabase GitHub sign-in failed. Please try again.';
  }

  return null;
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getOptionalAuthenticatedUser();
  const mode = resolveAppDataMode({ hasSupabasePublicConfig: hasSupabasePublicConfig(), hasUser: Boolean(user) });
  const snapshot = await listDashboardSnapshot(user?.id);
  const organizations = await listUserOrganizations(user?.id);
  const [organizationGroups, organizationMembers, organizationInvites, organizationActivity, organizationWebhooks, organizationWebhookDeliveries, organizationUsage] = await Promise.all([
    Promise.all(organizations.map((organization) => listOrganizationEnvGroups(organization.id, user?.id))),
    Promise.all(organizations.map((organization) => listOrganizationMembers(organization.id, user?.id))),
    Promise.all(organizations.map((organization) => listOrganizationInvites(organization.id, user?.id))),
    Promise.all(organizations.map((organization) => listOrganizationActivity(organization.id, user?.id))),
    Promise.all(organizations.map((organization) => listOrganizationWebhookEndpoints(organization.id, user?.id))),
    Promise.all(organizations.map((organization) => listOrganizationWebhookDeliveries(organization.id, user?.id))),
    Promise.all(organizations.map((organization) => listOrganizationUsageSummary(organization.id, user?.id)))
  ]);
  const projectIndex = buildOrganizationProjectIndex(snapshot.projects.map((project) => ({
    id: project.id,
    name: project.name,
    repoFullName: project.repo_full_name,
    framework: project.framework,
    organizationId: project.organization_id,
    deploymentUrl: project.latestDeployment?.deployment_url ?? project.deployment_url,
    status: project.status,
    latestStatus: project.latestDeployment?.status ?? project.status,
    latestCommitMessage: project.latestDeployment?.commit_message ?? null,
    latestCreatedAt: project.latestDeployment?.created_at ?? project.updated_at
  })));
  const resolvedSearchParams = (await searchParams) ?? {};
  const banner = githubBanner(resolvedSearchParams);
  const appEnabled = isGitHubAppEnabled();

  return (
    <main className="stack">
      <section className="page-header">
        <p className="eyebrow">Control plane</p>
        <h1>Deploy static apps to NeoFS with one control surface.</h1>
        <p>
          Mode: <strong>{snapshot.mode}</strong>. Connect GitHub, configure output folders, and let the builder publish to the storage layer.
        </p>
      </section>

      {banner ? (
        <section className="card">
          <p className="muted">{banner}</p>
        </section>
      ) : null}

      {mode === 'auth' ? (
        <section className="dashboard-grid">
          <article className="card">
            <p className="eyebrow">Authentication</p>
            <h2>Sign in before managing projects.</h2>
            <p className="muted">
              NeoPages now binds projects and GitHub App installations to the currently signed-in Supabase user instead of a shared bootstrap owner.
            </p>
            <GitHubConnectButton signedIn={false} appEnabled={appEnabled} />
          </article>
          <article className="card">
            <p className="eyebrow">Why this matters</p>
            <h2>Each user gets isolated projects and app installs.</h2>
            <p className="muted">
              After signing in, install the GitHub App once for your account or organization, then create projects from the synced repository list.
            </p>
          </article>
        </section>
      ) : (
        <>
          <section className="metrics">
            <MetricCard label="Projects" value={snapshot.projects.length} hint="Sites tracked in this workspace" />
            <MetricCard label="Deployments" value={snapshot.deploymentCount} hint="Total queued or finished builds" />
            <MetricCard label="Live" value={snapshot.deployedCount} hint="Projects serving a container right now" />
            <MetricCard label="In flight" value={snapshot.queuedCount} hint="Queued, building, or uploading" />
          </section>

          <section className="dashboard-grid">
            <CreateProjectForm />
            <article className="card">
              <p className="eyebrow">GitHub</p>
              <h2>Install once, deploy on every push.</h2>
              <p className="muted">
                NeoPages uses a GitHub App for repository access and webhook delivery, so new projects can reuse the same installation instead of creating per-repo webhooks.
              </p>
              <GitHubConnectButton signedIn={Boolean(user)} appEnabled={appEnabled} />
            </article>
          </section>

          <OrganizationsManager
            initialOrganizations={organizations.map((organization, index) => ({
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
              role: organization.role,
              planTier: organization.planTier,
              monthlyBandwidthLimitBytes: organization.monthlyBandwidthLimitBytes,
              monthlyRequestLimit: organization.monthlyRequestLimit,
              requirePromotionApproval: organization.requirePromotionApproval,
              protectedBranches: organization.protectedBranches,
              usage: organizationUsage[index] ?? { projectCount: 0, liveProjectCount: 0, requestCount: 0, bandwidthBytes: 0 },
              projects: projectIndex.get(organization.id) ?? [],
              members: organizationMembers[index] ?? [],
              invites: organizationInvites[index] ?? [],
              activity: organizationActivity[index] ?? [],
              webhooks: organizationWebhooks[index] ?? [],
              webhookDeliveries: organizationWebhookDeliveries[index] ?? [],
              envGroups: organizationGroups[index] ?? []
            }))}
          />

          <section className="stack">
            <div className="split-row">
              <div>
                <p className="eyebrow">Projects</p>
                <h2>Recent deployments</h2>
              </div>
            </div>

            <div className="dashboard-grid">
              {snapshot.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
