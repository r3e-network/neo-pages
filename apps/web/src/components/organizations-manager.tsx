'use client';

import React, { useEffect, useState } from 'react';

import { OrganizationActivityFeed } from './organization-activity-feed';
import { OrganizationProjectsList } from './organization-projects-list';
import { OrganizationUsageSummaryCard } from './organization-usage-summary-card';
import { OrganizationWebhookDeliveriesFeed } from './organization-webhook-deliveries-feed';
import { OrganizationWebhooksManager } from './organization-webhooks-manager';

interface OrganizationProjectItem {
  id: string;
  name: string;
  repoFullName: string;
  framework: string | null;
  deploymentUrl: string | null;
  status: string;
  latestStatus: string;
  latestCommitMessage: string | null;
}

interface OrganizationMemberItem {
  memberId: string;
  githubLogin: string | null;
  role: 'owner' | 'member';
  createdAt: string;
}

interface OrganizationInviteItem {
  id: string;
  email: string;
  role: 'member';
  status: 'pending' | 'accepted' | 'revoked';
  inviteUrl: string;
  inviteToken: string;
  createdAt: string;
  respondedAt: string | null;
}

interface OrganizationActivityItem {
  id: string;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface OrganizationWebhookItem {
  id: string;
  targetUrl: string;
  hasSecret: boolean;
  payloadFormat: 'json' | 'slack';
  events: string[];
  createdAt: string;
  updatedAt: string;
}

interface OrganizationWebhookDeliveryItem {
  id: string;
  targetUrl: string;
  eventType: string;
  status: string;
  attemptCount: number;
  lastResponseStatus: number | null;
  lastError: string | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  deadLetteredAt: string | null;
  createdAt: string;
}

interface OrganizationEnvGroupItem {
  id: string;
  key: string;
  environment: 'all' | 'production' | 'preview';
  maskedValue: string;
}

interface OrganizationEnvGroup {
  id: string;
  name: string;
  description: string | null;
  items: OrganizationEnvGroupItem[];
}

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'member';
  planTier: 'free' | 'pro' | 'enterprise' | 'custom';
  monthlyBandwidthLimitBytes: number;
  monthlyRequestLimit: number;
  requirePromotionApproval: boolean;
  protectedBranches: string[];
  usage: {
    projectCount: number;
    liveProjectCount: number;
    requestCount: number;
    bandwidthBytes: number;
  };
  projects: OrganizationProjectItem[];
  members: OrganizationMemberItem[];
  invites: OrganizationInviteItem[];
  activity: OrganizationActivityItem[];
  webhooks: OrganizationWebhookItem[];
  webhookDeliveries: OrganizationWebhookDeliveryItem[];
  envGroups: OrganizationEnvGroup[];
}

interface OrganizationsManagerProps {
  initialOrganizations: OrganizationItem[];
}

interface OrganizationDraftState {
  memberGitHubLogin: string;
  inviteEmail: string;
  groupName: string;
  groupDescription: string;
  activeGroupId: string | null;
  key: string;
  value: string;
  environment: 'all' | 'production' | 'preview';
}

const emptyDraft: OrganizationDraftState = {
  memberGitHubLogin: '',
  inviteEmail: '',
  groupName: '',
  groupDescription: '',
  activeGroupId: null,
  key: '',
  value: '',
  environment: 'all'
};

function maskValue(value: string) {
  return value.length <= 3 ? '•'.repeat(value.length) : `${value.slice(0, 2)}${'•'.repeat(value.length - 2)}`;
}

export function OrganizationsManager({ initialOrganizations }: OrganizationsManagerProps) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, OrganizationDraftState>>({});

  useEffect(() => {
    setOrganizations(initialOrganizations);
  }, [initialOrganizations]);

  function getDraft(organizationId: string) {
    return drafts[organizationId] ?? emptyDraft;
  }

  function updateDraft(organizationId: string, patch: Partial<OrganizationDraftState>) {
    setDrafts((current) => ({
      ...current,
      [organizationId]: {
        ...(current[organizationId] ?? emptyDraft),
        ...patch
      }
    }));
  }

  async function createOrg(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey('create-org');
    setMessage(null);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      });
      const payload = (await response.json()) as { organization?: Omit<OrganizationItem, 'envGroups' | 'members' | 'invites'>; error?: string };

      if (!response.ok || !payload.organization) {
        setMessage(payload.error ?? 'Failed to create organization');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) => [...current, { ...payload.organization!, usage: { projectCount: 0, liveProjectCount: 0, requestCount: 0, bandwidthBytes: 0 }, projects: [], envGroups: [], members: [], invites: [], activity: [], webhooks: [], webhookDeliveries: [] }]);
      setName('');
      setSlug('');
      setMessage('Organization created.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to create organization');
      setBusyKey(null);
    }
  }

  async function saveGovernance(organization: OrganizationItem) {
    setBusyKey(`save-org-${organization.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier: organization.planTier,
          monthlyBandwidthLimitBytes: organization.monthlyBandwidthLimitBytes,
          monthlyRequestLimit: organization.monthlyRequestLimit,
          requirePromotionApproval: organization.requirePromotionApproval,
          protectedBranches: organization.protectedBranches
        })
      });
      const payload = (await response.json()) as { organization?: Omit<OrganizationItem, 'envGroups' | 'members' | 'invites'>; error?: string };

      if (!response.ok || !payload.organization) {
        setMessage(payload.error ?? 'Failed to update organization');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) =>
        current.map((item) =>
          item.id === organization.id
            ? {
                ...item,
                ...payload.organization!
              }
            : item
        )
      );
      setMessage('Organization governance updated.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to update organization');
      setBusyKey(null);
    }
  }

  async function addMember(organizationId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = getDraft(organizationId);
    setBusyKey(`add-member-${organizationId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubLogin: draft.memberGitHubLogin })
      });
      const payload = (await response.json()) as { member?: OrganizationMemberItem; error?: string };

      if (!response.ok || !payload.member) {
        setMessage(payload.error ?? 'Failed to add organization member');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                members: [...organization.members.filter((member) => member.memberId !== payload.member!.memberId), payload.member!]
              }
            : organization
        )
      );
      updateDraft(organizationId, { memberGitHubLogin: '' });
      setMessage('Organization member added.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to add organization member');
      setBusyKey(null);
    }
  }

  async function removeMember(organizationId: string, memberId: string) {
    setBusyKey(`remove-member-${organizationId}-${memberId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to remove organization member');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? { ...organization, members: organization.members.filter((member) => member.memberId !== memberId) }
            : organization
        )
      );
      setMessage('Organization member removed.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to remove organization member');
      setBusyKey(null);
    }
  }

  async function createInvite(organizationId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = getDraft(organizationId);
    setBusyKey(`create-invite-${organizationId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: draft.inviteEmail })
      });
      const payload = (await response.json()) as { invite?: OrganizationInviteItem; error?: string };

      if (!response.ok || !payload.invite) {
        setMessage(payload.error ?? 'Failed to create organization invite');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? { ...organization, invites: [payload.invite!, ...organization.invites] }
            : organization
        )
      );
      updateDraft(organizationId, { inviteEmail: '' });
      setMessage('Organization invite created.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to create organization invite');
      setBusyKey(null);
    }
  }

  async function revokeInvite(organizationId: string, inviteId: string) {
    setBusyKey(`revoke-invite-${organizationId}-${inviteId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invites/${inviteId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to revoke organization invite');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                invites: organization.invites.map((invite) =>
                  invite.id === inviteId ? { ...invite, status: 'revoked' } : invite
                )
              }
            : organization
        )
      );
      setMessage('Organization invite revoked.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to revoke organization invite');
      setBusyKey(null);
    }
  }

  async function createEnvGroup(organizationId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = getDraft(organizationId);
    setBusyKey(`create-group-${organizationId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/env-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draft.groupName, description: draft.groupDescription })
      });
      const payload = (await response.json()) as { group?: OrganizationEnvGroup; error?: string };

      if (!response.ok || !payload.group) {
        setMessage(payload.error ?? 'Failed to create organization environment group');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? { ...organization, envGroups: [payload.group!, ...organization.envGroups] }
            : organization
        )
      );
      updateDraft(organizationId, { groupName: '', groupDescription: '' });
      setMessage('Organization environment group created.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to create organization environment group');
      setBusyKey(null);
    }
  }

  async function saveEnvGroupItem(organizationId: string, groupId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = getDraft(organizationId);
    setBusyKey(`save-item-${organizationId}-${groupId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/env-groups/${groupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: draft.key, value: draft.value, environment: draft.environment })
      });
      const payload = (await response.json().catch(() => ({}))) as { group?: OrganizationEnvGroup; error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to save organization environment variable');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                envGroups: organization.envGroups.map((group) =>
                  group.id === groupId
                    ? payload.group ?? {
                        ...group,
                        items: [
                          {
                            id: `${groupId}-${draft.key}-${draft.environment}`,
                            key: draft.key.trim().toUpperCase(),
                            environment: draft.environment,
                            maskedValue: maskValue(draft.value)
                          },
                          ...group.items.filter((item) => !(item.key === draft.key.trim().toUpperCase() && item.environment === draft.environment))
                        ]
                      }
                    : group
                )
              }
            : organization
        )
      );

      updateDraft(organizationId, { key: '', value: '', environment: 'all' });
      setMessage('Organization environment variable saved.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to save organization environment variable');
      setBusyKey(null);
    }
  }

  async function deleteEnvGroup(organizationId: string, groupId: string) {
    setBusyKey(`delete-group-${organizationId}-${groupId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/env-groups/${groupId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to delete organization environment group');
        setBusyKey(null);
        return;
      }

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? { ...organization, envGroups: organization.envGroups.filter((group) => group.id !== groupId) }
            : organization
        )
      );
      updateDraft(organizationId, { activeGroupId: null, key: '', value: '', environment: 'all' });
      setMessage('Organization environment group deleted.');
      setBusyKey(null);
    } catch {
      setMessage('Failed to delete organization environment group');
      setBusyKey(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Organizations</p>
          <h2>Shared ownership</h2>
        </div>
      </div>
      <form className="form-grid" onSubmit={createOrg}>
        <div>
          <label htmlFor="org-name">Name</label>
          <input id="org-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Neo Labs" required />
        </div>
        <div>
          <label htmlFor="org-slug">Slug</label>
          <input id="org-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="neo-labs" />
        </div>
        <div className="form-grid__footer">
          <button className="button" type="submit" disabled={busyKey === 'create-org'}>{busyKey === 'create-org' ? 'Creating…' : 'Create organization'}</button>
          {message ? <p className="muted">{message}</p> : null}
        </div>
      </form>
      <div className="deployment-list">
        {organizations.map((organization) => {
          const draft = getDraft(organization.id);
          const canManageOrg = organization.role === 'owner';

          return (
            <article key={organization.id} className="card stack">
              <div>
                <h3>{organization.name}</h3>
                <p className="muted">{organization.slug} · {organization.role}</p>
              </div>
              {canManageOrg ? (
                <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void saveGovernance(organization); }}>
                  <div>
                    <label htmlFor={`org-tier-${organization.id}`}>Plan tier</label>
                    <select id={`org-tier-${organization.id}`} value={organization.planTier} onChange={(event) => setOrganizations((current) => current.map((item) => item.id === organization.id ? { ...item, planTier: event.target.value as OrganizationItem['planTier'] } : item))}>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`org-bandwidth-${organization.id}`}>Bandwidth limit</label>
                    <input id={`org-bandwidth-${organization.id}`} value={String(organization.monthlyBandwidthLimitBytes)} onChange={(event) => setOrganizations((current) => current.map((item) => item.id === organization.id ? { ...item, monthlyBandwidthLimitBytes: Number(event.target.value) || 0 } : item))} />
                  </div>
                  <div>
                    <label htmlFor={`org-requests-${organization.id}`}>Request limit</label>
                    <input id={`org-requests-${organization.id}`} value={String(organization.monthlyRequestLimit)} onChange={(event) => setOrganizations((current) => current.map((item) => item.id === organization.id ? { ...item, monthlyRequestLimit: Number(event.target.value) || 0 } : item))} />
                  </div>
                  <label className="muted">
                    <input type="checkbox" checked={organization.requirePromotionApproval} onChange={(event) => setOrganizations((current) => current.map((item) => item.id === organization.id ? { ...item, requirePromotionApproval: event.target.checked } : item))} /> Require promotion approval by default
                  </label>
                  <div>
                    <label htmlFor={`org-branches-${organization.id}`}>Protected branches</label>
                    <input id={`org-branches-${organization.id}`} value={organization.protectedBranches.join(', ')} onChange={(event) => setOrganizations((current) => current.map((item) => item.id === organization.id ? { ...item, protectedBranches: event.target.value.split(',').map((branch) => branch.trim()).filter(Boolean) } : item))} />
                  </div>
                  <div className="form-grid__footer">
                    <button className="button" type="submit" disabled={busyKey === `save-org-${organization.id}`}>{busyKey === `save-org-${organization.id}` ? 'Saving…' : 'Save organization policy'}</button>
                  </div>
                </form>
              ) : (
                <p className="muted">Inherited tier: {organization.planTier}</p>
              )}

              <OrganizationUsageSummaryCard usage={organization.usage} />

              <OrganizationProjectsList organizationId={organization.id} projects={organization.projects} />

              <section className="stack">
                <div>
                  <p className="eyebrow">Members</p>
                  <h3>Shared access for org-owned projects</h3>
                </div>
                {canManageOrg ? (
                  <form className="form-grid" onSubmit={(event) => void addMember(organization.id, event)}>
                    <div>
                      <label htmlFor={`org-member-login-${organization.id}`}>GitHub login</label>
                      <input id={`org-member-login-${organization.id}`} value={draft.memberGitHubLogin} onChange={(event) => updateDraft(organization.id, { memberGitHubLogin: event.target.value })} placeholder="octocat" required />
                    </div>
                    <div className="form-grid__footer">
                      <button className="button" type="submit" disabled={busyKey === `add-member-${organization.id}`}>{busyKey === `add-member-${organization.id}` ? 'Adding…' : 'Add member'}</button>
                    </div>
                  </form>
                ) : (
                  <p className="muted">Only organization owners can manage members.</p>
                )}
                <div className="deployment-list">
                  {organization.members.map((member) => (
                    <article key={member.memberId} className="card project-card">
                      <div className="project-card__header">
                        <div>
                          <h3>{member.githubLogin ?? member.memberId}</h3>
                          <p className="muted">{member.role}</p>
                        </div>
                        {canManageOrg && member.role !== 'owner' ? (
                          <button className="link-button" type="button" onClick={() => void removeMember(organization.id, member.memberId)} disabled={busyKey === `remove-member-${organization.id}-${member.memberId}`}>
                            {busyKey === `remove-member-${organization.id}-${member.memberId}` ? 'Removing…' : 'Remove'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {organization.members.length === 0 ? <p className="muted">No members yet.</p> : null}
                </div>
              </section>

              <section className="stack">
                <div>
                  <p className="eyebrow">Invitations</p>
                  <h3>Email invites</h3>
                </div>
                {canManageOrg ? (
                  <form className="form-grid" onSubmit={(event) => void createInvite(organization.id, event)}>
                    <div>
                      <label htmlFor={`org-invite-email-${organization.id}`}>Email</label>
                      <input id={`org-invite-email-${organization.id}`} type="email" value={draft.inviteEmail} onChange={(event) => updateDraft(organization.id, { inviteEmail: event.target.value })} placeholder="teammate@example.com" required />
                    </div>
                    <div className="form-grid__footer">
                      <button className="button" type="submit" disabled={busyKey === `create-invite-${organization.id}`}>{busyKey === `create-invite-${organization.id}` ? 'Sending…' : 'Create invite'}</button>
                    </div>
                  </form>
                ) : (
                  <p className="muted">Only organization owners can manage invitations.</p>
                )}
                <div className="deployment-list">
                  {organization.invites.map((invite) => (
                    <article key={invite.id} className="card project-card">
                      <div className="project-card__header">
                        <div>
                          <h3>{invite.email}</h3>
                          <p className="muted">{invite.role} · {invite.status}</p>
                          <p className="muted"><a href={invite.inviteUrl} target="_blank" rel="noreferrer">{invite.inviteUrl}</a></p>
                        </div>
                        {canManageOrg && invite.status === 'pending' ? (
                          <button className="link-button" type="button" onClick={() => void revokeInvite(organization.id, invite.id)} disabled={busyKey === `revoke-invite-${organization.id}-${invite.id}`}>
                            {busyKey === `revoke-invite-${organization.id}-${invite.id}` ? 'Revoking…' : 'Revoke'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {organization.invites.length === 0 ? <p className="muted">No pending organization invites.</p> : null}
                </div>
              </section>

              <OrganizationActivityFeed initialActivity={organization.activity} />

              <OrganizationWebhooksManager organizationId={organization.id} initialEndpoints={organization.webhooks} canManage={canManageOrg} />

              <OrganizationWebhookDeliveriesFeed initialDeliveries={organization.webhookDeliveries} />

              <section className="stack">
                <div>
                  <p className="eyebrow">Organization env groups</p>
                  <h3>Reusable defaults for all org-owned projects</h3>
                  <p className="muted">Define shared variables once here, then attach the group inside any project owned by {organization.name}.</p>
                </div>

                {canManageOrg ? (
                  <form className="form-grid" onSubmit={(event) => void createEnvGroup(organization.id, event)}>
                    <div>
                      <label htmlFor={`org-group-name-${organization.id}`}>Group name</label>
                      <input id={`org-group-name-${organization.id}`} value={draft.groupName} onChange={(event) => updateDraft(organization.id, { groupName: event.target.value })} placeholder="Shared Endpoints" required />
                    </div>
                    <div>
                      <label htmlFor={`org-group-description-${organization.id}`}>Description</label>
                      <input id={`org-group-description-${organization.id}`} value={draft.groupDescription} onChange={(event) => updateDraft(organization.id, { groupDescription: event.target.value })} placeholder="Reusable defaults" />
                    </div>
                    <div className="form-grid__footer">
                      <button className="button" type="submit" disabled={busyKey === `create-group-${organization.id}`}>{busyKey === `create-group-${organization.id}` ? 'Creating…' : 'Create org group'}</button>
                    </div>
                  </form>
                ) : (
                  <p className="muted">Only organization owners can edit shared environment groups.</p>
                )}

                <div className="deployment-list">
                  {organization.envGroups.map((group) => (
                    <article key={group.id} className="card stack">
                      <div className="project-card__header">
                        <div>
                          <h3>{group.name}</h3>
                          {group.description ? <p className="muted">{group.description}</p> : null}
                          <p className="muted">Attach from a project page when you want these defaults live.</p>
                        </div>
                        {canManageOrg ? (
                          <button className="link-button" type="button" onClick={() => void deleteEnvGroup(organization.id, group.id)} disabled={busyKey === `delete-group-${organization.id}-${group.id}`}>
                            {busyKey === `delete-group-${organization.id}-${group.id}` ? 'Deleting…' : 'Delete'}
                          </button>
                        ) : null}
                      </div>

                      <div className="deployment-list">
                        {group.items.map((item) => (
                          <article key={item.id} className="card project-card">
                            <div>
                              <h3>{item.key}</h3>
                              <p className="muted">{item.environment} · {item.maskedValue}</p>
                            </div>
                          </article>
                        ))}
                        {group.items.length === 0 ? <p className="muted">No variables in this group yet.</p> : null}
                      </div>

                      {canManageOrg ? (
                        <form className="form-grid" onSubmit={(event) => void saveEnvGroupItem(organization.id, group.id, event)}>
                          <div className="form-grid__footer">
                            <button className="link-button" type="button" onClick={() => updateDraft(organization.id, { activeGroupId: draft.activeGroupId === group.id ? null : group.id })}>
                              {draft.activeGroupId === group.id ? 'Hide editor' : 'Edit this group'}
                            </button>
                            {draft.activeGroupId === group.id ? <span className="muted">Editing enabled below</span> : null}
                          </div>
                          {draft.activeGroupId === group.id ? (
                            <>
                              <div>
                                <label htmlFor={`org-group-item-key-${organization.id}-${group.id}`}>Key</label>
                                <input id={`org-group-item-key-${organization.id}-${group.id}`} value={draft.key} onChange={(event) => updateDraft(organization.id, { key: event.target.value })} placeholder="API_URL" required />
                              </div>
                              <div>
                                <label htmlFor={`org-group-item-value-${organization.id}-${group.id}`}>Value</label>
                                <input id={`org-group-item-value-${organization.id}-${group.id}`} value={draft.value} onChange={(event) => updateDraft(organization.id, { value: event.target.value })} placeholder="https://api.example.com" required />
                              </div>
                              <div>
                                <label htmlFor={`org-group-item-environment-${organization.id}-${group.id}`}>Environment</label>
                                <select id={`org-group-item-environment-${organization.id}-${group.id}`} value={draft.environment} onChange={(event) => updateDraft(organization.id, { environment: event.target.value as OrganizationDraftState['environment'] })}>
                                  <option value="all">All</option>
                                  <option value="production">Production only</option>
                                  <option value="preview">Preview only</option>
                                </select>
                              </div>
                              <div className="form-grid__footer">
                                <button className="button" type="submit" disabled={busyKey === `save-item-${organization.id}-${group.id}`}>{busyKey === `save-item-${organization.id}-${group.id}` ? 'Saving…' : 'Save org variable'}</button>
                              </div>
                            </>
                          ) : null}
                        </form>
                      ) : null}
                    </article>
                  ))}
                  {organization.envGroups.length === 0 ? <p className="muted">No organization env groups yet.</p> : null}
                </div>
              </section>
            </article>
          );
        })}
        {organizations.length === 0 ? <p className="muted">No organizations yet.</p> : null}
      </div>
    </section>
  );
}
