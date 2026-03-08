// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

import { OrganizationWebhooksManager } from './organization-webhooks-manager';
import { ProjectApiTokensManager } from './project-api-tokens-manager';
import { ProjectCollaboratorInvitesManager } from './project-collaborator-invites-manager';
import { ProjectCollaboratorsManager } from './project-collaborators-manager';
import { ProjectDeployHooksManager } from './project-deploy-hooks-manager';
import { ProjectDeploySchedulesManager } from './project-deploy-schedules-manager';
import { ProjectDomainsManager } from './project-domains-manager';
import { ProjectEnvGroupsManager } from './project-env-groups-manager';
import { ProjectManualDeployCard } from './project-manual-deploy-card';
import { ProjectEnvVarsManager } from './project-env-vars-manager';
import { ProjectQuotaManager } from './project-quota-manager';
import { ProjectReleasePolicyManager } from './project-release-policy-manager';
import { ProjectWebhooksManager } from './project-webhooks-manager';

describe('project manager prop sync', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('syncs project API tokens when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectApiTokensManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialTokens: [{ id: 'token-1', label: 'CI token', tokenPrefix: 'npt_abc', scopes: ['project:read'], createdAt: '2026-03-07T00:00:00.000Z', lastUsedAt: null }]
      }));
    });
    expect(container.textContent).toContain('CI token');
    await act(async () => {
      root.render(React.createElement(ProjectApiTokensManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialTokens: [{ id: 'token-2', label: 'Deploy token', tokenPrefix: 'npt_def', scopes: ['deployments:write'], createdAt: '2026-03-08T00:00:00.000Z', lastUsedAt: null }]
      }));
    });
    expect(container.textContent).toContain('Deploy token');
    expect(container.textContent).not.toContain('CI token');
  });

  it('syncs deploy hooks when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectDeployHooksManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialHooks: [{ id: 'hook-1', label: 'Hook A', hookUrl: 'https://a.example.com', createdAt: '2026-03-07T00:00:00.000Z', lastTriggeredAt: null }]
      }));
    });
    expect(container.textContent).toContain('Hook A');
    await act(async () => {
      root.render(React.createElement(ProjectDeployHooksManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialHooks: [{ id: 'hook-2', label: 'Hook B', hookUrl: 'https://b.example.com', createdAt: '2026-03-08T00:00:00.000Z', lastTriggeredAt: null }]
      }));
    });
    expect(container.textContent).toContain('Hook B');
    expect(container.textContent).not.toContain('Hook A');
  });

  it('syncs deploy schedules when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectDeploySchedulesManager, {
        projectId: 'project-1',
        defaultBranch: 'main',
        accessRole: 'owner',
        initialSchedules: [{ id: 'schedule-1', label: 'Hourly', branch: 'main', cronExpression: '0 * * * *', timezone: 'UTC', active: true, nextRunAt: null, lastRunAt: null, createdAt: '2026-03-07T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('Hourly');
    await act(async () => {
      root.render(React.createElement(ProjectDeploySchedulesManager, {
        projectId: 'project-1',
        defaultBranch: 'main',
        accessRole: 'owner',
        initialSchedules: [{ id: 'schedule-2', label: 'Daily', branch: 'release', cronExpression: '0 0 * * *', timezone: 'UTC', active: true, nextRunAt: null, lastRunAt: null, createdAt: '2026-03-08T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('Daily');
    expect(container.textContent).not.toContain('Hourly');
  });

  it('syncs custom domains when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectDomainsManager, {
        projectId: 'project-1',
        initialDomains: [{ id: 'domain-1', host: 'app.example.com', verification_token: 'txt-a', verified_at: null, verification_error: null, verificationHostname: '_neopages.app.example.com', routingTarget: 'cname.neopages.dev', dnsConfigured: false }]
      }));
    });
    expect(container.textContent).toContain('app.example.com');
    await act(async () => {
      root.render(React.createElement(ProjectDomainsManager, {
        projectId: 'project-1',
        initialDomains: [{ id: 'domain-2', host: 'docs.example.com', verification_token: 'txt-b', verified_at: null, verification_error: null, verificationHostname: '_neopages.docs.example.com', routingTarget: 'cname.neopages.dev', dnsConfigured: false }]
      }));
    });
    expect(container.textContent).toContain('docs.example.com');
    expect(container.textContent).not.toContain('app.example.com');
  });

  it('syncs env vars when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectEnvVarsManager, {
        projectId: 'project-1',
        initialEnvVars: [{ id: 'env-1', key: 'API_URL', environment: 'all', maskedValue: 'ht••', createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('API_URL');
    await act(async () => {
      root.render(React.createElement(ProjectEnvVarsManager, {
        projectId: 'project-1',
        initialEnvVars: [{ id: 'env-2', key: 'NEXT_PUBLIC_THEME', environment: 'preview', maskedValue: 'da••', createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('NEXT_PUBLIC_THEME');
    expect(container.textContent).not.toContain('API_URL');
  });

  it('syncs collaborator list when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectCollaboratorsManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialCollaborators: [{ collaboratorId: 'user-1', githubLogin: 'octocat', role: 'viewer', createdAt: '2026-03-07T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('octocat');
    await act(async () => {
      root.render(React.createElement(ProjectCollaboratorsManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialCollaborators: [{ collaboratorId: 'user-2', githubLogin: 'alice', role: 'editor', createdAt: '2026-03-08T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('alice');
    expect(container.textContent).not.toContain('octocat');
  });

  it('syncs collaborator invites when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectCollaboratorInvitesManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialInvites: [{ id: 'invite-1', email: 'a@example.com', role: 'viewer', status: 'pending', inviteUrl: 'https://example.com/a', createdAt: '2026-03-07T00:00:00.000Z', respondedAt: null }]
      }));
    });
    expect(container.textContent).toContain('a@example.com');
    await act(async () => {
      root.render(React.createElement(ProjectCollaboratorInvitesManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialInvites: [{ id: 'invite-2', email: 'b@example.com', role: 'editor', status: 'pending', inviteUrl: 'https://example.com/b', createdAt: '2026-03-08T00:00:00.000Z', respondedAt: null }]
      }));
    });
    expect(container.textContent).toContain('b@example.com');
    expect(container.textContent).not.toContain('a@example.com');
  });

  it('syncs project webhooks when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectWebhooksManager, {
        projectId: 'project-1',
        initialEndpoints: [{ id: 'endpoint-1', targetUrl: 'https://hooks.example.com/a', hasSecret: false, payloadFormat: 'json', events: ['deployment.succeeded'], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('https://hooks.example.com/a');
    await act(async () => {
      root.render(React.createElement(ProjectWebhooksManager, {
        projectId: 'project-1',
        initialEndpoints: [{ id: 'endpoint-2', targetUrl: 'https://hooks.example.com/b', hasSecret: true, payloadFormat: 'slack', events: ['deployment.failed'], createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('https://hooks.example.com/b');
    expect(container.textContent).not.toContain('https://hooks.example.com/a');
  });

  it('syncs organization webhooks when props change', async () => {
    await act(async () => {
      root.render(React.createElement(OrganizationWebhooksManager, {
        organizationId: 'org-1',
        canManage: true,
        initialEndpoints: [{ id: 'endpoint-1', targetUrl: 'https://hooks.example.com/org-a', hasSecret: false, payloadFormat: 'json', events: ['organization.member.invited'], createdAt: '2026-03-07T00:00:00.000Z', updatedAt: '2026-03-07T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('https://hooks.example.com/org-a');
    await act(async () => {
      root.render(React.createElement(OrganizationWebhooksManager, {
        organizationId: 'org-1',
        canManage: true,
        initialEndpoints: [{ id: 'endpoint-2', targetUrl: 'https://hooks.example.com/org-b', hasSecret: true, payloadFormat: 'slack', events: ['organization.created'], createdAt: '2026-03-08T00:00:00.000Z', updatedAt: '2026-03-08T00:00:00.000Z' }]
      }));
    });
    expect(container.textContent).toContain('https://hooks.example.com/org-b');
    expect(container.textContent).not.toContain('https://hooks.example.com/org-a');
  });

  it('syncs quota form values when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectQuotaManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialUsage: { planTier: 'free', monthlyBandwidthLimitBytes: 1024, monthlyRequestLimit: 100, useOrganizationQuotas: false }
      }));
    });
    expect((container.querySelector('#plan-tier') as HTMLSelectElement).value).toBe('free');
    await act(async () => {
      root.render(React.createElement(ProjectQuotaManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialUsage: { planTier: 'enterprise', monthlyBandwidthLimitBytes: 8192, monthlyRequestLimit: 2000, useOrganizationQuotas: false }
      }));
    });
    expect((container.querySelector('#plan-tier') as HTMLSelectElement).value).toBe('enterprise');
    expect((container.querySelector('#bandwidth-limit') as HTMLInputElement).value).toBe('8192');
  });

  it('syncs release policy form values when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectReleasePolicyManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialPolicy: { requirePromotionApproval: true, protectedBranches: ['main'], useOrganizationReleasePolicy: false }
      }));
    });
    expect((container.querySelector('#protected-branches') as HTMLInputElement).value).toBe('main');
    await act(async () => {
      root.render(React.createElement(ProjectReleasePolicyManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialPolicy: { requirePromotionApproval: false, protectedBranches: ['release'], useOrganizationReleasePolicy: false }
      }));
    });
    expect((container.querySelector('#protected-branches') as HTMLInputElement).value).toBe('release');
  });

  it('syncs manual deploy branch when defaultBranch props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectManualDeployCard, {
        projectId: 'project-1',
        defaultBranch: 'main',
        accessRole: 'owner'
      }));
    });
    expect((container.querySelector('#manual-branch') as HTMLInputElement).value).toBe('main');
    expect(container.textContent).toContain('Redeploy production');

    await act(async () => {
      root.render(React.createElement(ProjectManualDeployCard, {
        projectId: 'project-1',
        defaultBranch: 'develop',
        accessRole: 'owner'
      }));
    });

    expect((container.querySelector('#manual-branch') as HTMLInputElement).value).toBe('develop');
    expect(container.textContent).toContain('Redeploy production');
  });

  it('syncs schedule draft branch when defaultBranch props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectDeploySchedulesManager, {
        projectId: 'project-1',
        defaultBranch: 'main',
        accessRole: 'owner',
        initialSchedules: []
      }));
    });
    expect((container.querySelector('#schedule-branch') as HTMLInputElement).value).toBe('main');

    await act(async () => {
      root.render(React.createElement(ProjectDeploySchedulesManager, {
        projectId: 'project-1',
        defaultBranch: 'develop',
        accessRole: 'owner',
        initialSchedules: []
      }));
    });

    expect((container.querySelector('#schedule-branch') as HTMLInputElement).value).toBe('develop');
  });

  it('syncs env-group scope when organization availability changes', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectEnvGroupsManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        organization: null,
        initialGroups: []
      }));
    });
    expect(container.querySelector('#group-scope')).toBeNull();

    await act(async () => {
      root.render(React.createElement(ProjectEnvGroupsManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        organization: { id: 'org-1', name: 'Neo Labs' },
        initialGroups: []
      }));
    });

    expect((container.querySelector('#group-scope') as HTMLSelectElement).value).toBe('organization');
  });

  it('syncs env groups when props change', async () => {
    await act(async () => {
      root.render(React.createElement(ProjectEnvGroupsManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialGroups: [{ id: 'group-1', name: 'Shared API', description: null, attached: true, scope: 'personal', organizationId: null, items: [] }]
      }));
    });
    expect(container.textContent).toContain('Shared API');
    await act(async () => {
      root.render(React.createElement(ProjectEnvGroupsManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        initialGroups: [{ id: 'group-2', name: 'Shared Auth', description: null, attached: false, scope: 'personal', organizationId: null, items: [] }]
      }));
    });
    expect(container.textContent).toContain('Shared Auth');
    expect(container.textContent).not.toContain('Shared API');
  });
});
