'use client';

import React, { useEffect, useState } from 'react';

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  attached: boolean;
  scope: 'personal' | 'organization';
  organizationId: string | null;
  items: Array<{ id: string; key: string; environment: 'all' | 'production' | 'preview'; maskedValue: string }>;
}

interface ProjectEnvGroupsManagerProps {
  projectId: string;
  accessRole: 'owner' | 'editor' | 'viewer';
  organization?: { id: string; name: string } | null;
  initialGroups: GroupItem[];
}

function maskValue(value: string) {
  return value.length <= 3 ? '•'.repeat(value.length) : `${value.slice(0, 2)}${'•'.repeat(value.length - 2)}`;
}

export function ProjectEnvGroupsManager({ projectId, accessRole, organization = null, initialGroups }: ProjectEnvGroupsManagerProps) {
  const [groups, setGroups] = useState(initialGroups);

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'personal' | 'organization'>(organization ? 'organization' : 'personal');

  useEffect(() => {
    setScope(organization ? 'organization' : 'personal');
  }, [organization]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [environment, setEnvironment] = useState<'all' | 'production' | 'preview'>('all');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canManage = accessRole === 'owner' || accessRole === 'editor';
  const canCreateOrganizationScopedGroup = Boolean(organization) && accessRole === 'owner';

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('create-group');
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/env-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, scope: canCreateOrganizationScopedGroup ? scope : 'personal' })
      });
      const payload = (await response.json()) as { group?: GroupItem; error?: string };

      if (!response.ok || !payload.group) {
        setMessage(payload.error ?? 'Failed to create environment group');
        setBusyId(null);
        return;
      }

      setGroups((current) => [payload.group!, ...current]);
      setName('');
      setDescription('');
      setScope(organization ? 'organization' : 'personal');
      setMessage(payload.group.scope === 'organization' ? 'Organization environment group created and attached.' : 'Environment group created and attached.');
      setBusyId(null);
    } catch {
      setMessage('Failed to create environment group');
      setBusyId(null);
    }
  }

  async function toggleAttach(groupId: string, attached: boolean) {
    setBusyId(groupId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/env-groups/${groupId}/attach`, { method: attached ? 'DELETE' : 'POST' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to update environment group attachment');
        setBusyId(null);
        return;
      }

      setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, attached: !attached } : group)));
      setBusyId(null);
    } catch {
      setMessage('Failed to update environment group attachment');
      setBusyId(null);
    }
  }

  async function saveGroupItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeGroupId) {
      return;
    }
    setBusyId('save-item');
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/env-groups/${activeGroupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, environment })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to save group variable');
        setBusyId(null);
        return;
      }

      setGroups((current) =>
        current.map((group) =>
          group.id === activeGroupId
            ? {
                ...group,
                items: [
                  {
                    id: `${group.id}-${key.trim().toUpperCase()}-${environment}`,
                    key: key.trim().toUpperCase(),
                    environment,
                    maskedValue: maskValue(value)
                  },
                  ...group.items.filter((item) => !(item.key === key.trim().toUpperCase() && item.environment === environment))
                ]
              }
            : group
        )
      );
      setMessage('Saved group variable.');
      setKey('');
      setValue('');
      setEnvironment('all');
      setBusyId(null);
    } catch {
      setMessage('Failed to save group variable');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Environment groups</p>
          <h2>Reusable variable presets</h2>
          {organization ? <p className="muted">{organization.name} can publish shared defaults here. Project variables override environment groups when the same key exists.</p> : <p className="muted">Project variables override environment groups when the same key exists.</p>}
        </div>
      </div>
      {canManage ? (
        <form className="form-grid" onSubmit={createGroup}>
          <div>
            <label htmlFor="group-name">Group name</label>
            <input id="group-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Shared API endpoints" required />
          </div>
          <div>
            <label htmlFor="group-description">Description</label>
            <input id="group-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional note" />
          </div>
          {canCreateOrganizationScopedGroup ? (
            <div>
              <label htmlFor="group-scope">Scope</label>
              <select id="group-scope" value={scope} onChange={(event) => setScope(event.target.value as 'personal' | 'organization')}>
                <option value="organization">Organization group</option>
                <option value="personal">Personal group</option>
              </select>
            </div>
          ) : null}
          <div className="form-grid__footer">
            <button className="button" type="submit" disabled={busyId === 'create-group'}>{busyId === 'create-group' ? 'Creating…' : 'Create group'}</button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
        </form>
      ) : (
        <p className="muted">Only owners and editors can manage environment groups.</p>
      )}

      <div className="deployment-list">
        {groups.map((group) => {
          const canEditGroup = canManage && (group.scope === 'personal' || accessRole === 'owner');

          return (
            <article key={group.id} className="card stack">
              <div className="project-card__header">
                <div>
                  <h3>{group.name}</h3>
                  {group.description ? <p className="muted">{group.description}</p> : null}
                  <p className="muted">{group.scope === 'organization' ? 'Organization group' : 'Personal group'} · {group.attached ? 'Attached to this project' : 'Available to attach'}</p>
                </div>
                {canManage ? (
                  <button className="link-button" type="button" onClick={() => toggleAttach(group.id, group.attached)} disabled={busyId === group.id}>
                    {busyId === group.id ? 'Saving…' : group.attached ? 'Detach' : 'Attach'}
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
              {canEditGroup ? (
                <form className="form-grid" onSubmit={saveGroupItem}>
                  <input type="hidden" value={group.id} />
                  <div className="form-grid__footer">
                    <button className="link-button" type="button" onClick={() => setActiveGroupId(group.id)}>{activeGroupId === group.id ? 'Editing this group' : 'Edit this group'}</button>
                    {activeGroupId === group.id ? <span className="muted">Editing enabled below</span> : null}
                  </div>
                  {activeGroupId === group.id ? (
                    <>
                      <div>
                        <label htmlFor={`group-item-key-${group.id}`}>Key</label>
                        <input id={`group-item-key-${group.id}`} value={key} onChange={(event) => setKey(event.target.value)} placeholder="API_URL" required />
                      </div>
                      <div>
                        <label htmlFor={`group-item-value-${group.id}`}>Value</label>
                        <input id={`group-item-value-${group.id}`} value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://api.example.com" required />
                      </div>
                      <div>
                        <label htmlFor={`group-item-env-${group.id}`}>Environment</label>
                        <select id={`group-item-env-${group.id}`} value={environment} onChange={(event) => setEnvironment(event.target.value as 'all' | 'production' | 'preview')}>
                          <option value="all">All</option>
                          <option value="production">Production only</option>
                          <option value="preview">Preview only</option>
                        </select>
                      </div>
                      <div className="form-grid__footer">
                        <button className="button" type="submit" disabled={busyId === 'save-item'}>{busyId === 'save-item' ? 'Saving…' : 'Save group variable'}</button>
                      </div>
                    </>
                  ) : null}
                </form>
              ) : canManage ? (
                <p className="muted">Only organization owners can edit variables inside organization-scoped groups.</p>
              ) : null}
            </article>
          );
        })}
        {groups.length === 0 ? <p className="muted">No reusable environment groups yet.</p> : null}
      </div>
    </section>
  );
}
