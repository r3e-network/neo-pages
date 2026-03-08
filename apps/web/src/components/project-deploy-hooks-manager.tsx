'use client';

import React, { useEffect, useState } from 'react';

interface HookItem {
  id: string;
  label: string;
  hookUrl: string;
  createdAt: string;
  lastTriggeredAt: string | null;
}

interface ProjectDeployHooksManagerProps {
  projectId: string;
  initialHooks: HookItem[];
  accessRole: 'owner' | 'editor' | 'viewer';
}

export function ProjectDeployHooksManager({ projectId, initialHooks, accessRole }: ProjectDeployHooksManagerProps) {
  const [hooks, setHooks] = useState(initialHooks);

  useEffect(() => {
    setHooks(initialHooks);
  }, [initialHooks]);
  const [label, setLabel] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const canManage = accessRole === 'owner';

  async function createHook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('save');
    setMessage(null);
    setRevealedSecret(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/deploy-hooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      });
      const payload = (await response.json()) as { hook?: HookItem & { secret: string }; error?: string };

      if (!response.ok || !payload.hook) {
        setMessage(payload.error ?? 'Failed to create deploy hook');
        setBusyId(null);
        return;
      }

      const { secret, ...hookView } = payload.hook;
      setHooks((current) => [hookView, ...current]);
      setRevealedSecret(secret);
      setLabel('');
      setMessage('Deploy hook created. Copy the secret now; it will not be shown again.');
      setBusyId(null);
    } catch {
      setMessage('Failed to create deploy hook');
      setBusyId(null);
    }
  }

  async function deleteHook(hookId: string) {
    setBusyId(hookId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/deploy-hooks/${hookId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to delete deploy hook');
        setBusyId(null);
        return;
      }

      setHooks((current) => current.filter((hook) => hook.id !== hookId));
      setMessage('Deploy hook deleted.');
      setBusyId(null);
    } catch {
      setMessage('Failed to delete deploy hook');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Deploy hooks</p>
          <h2>Signed deploy triggers</h2>
        </div>
      </div>
      {canManage ? (
        <form className="form-grid" onSubmit={createHook}>
          <div>
            <label htmlFor="deploy-hook-label">Label</label>
            <input id="deploy-hook-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="GitHub Actions deploy" required />
          </div>
          <div className="form-grid__footer">
            <button className="button" type="submit" disabled={busyId === 'save'}>{busyId === 'save' ? 'Creating…' : 'Create deploy hook'}</button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
          {revealedSecret ? <pre className="deployment-log">{revealedSecret}</pre> : null}
        </form>
      ) : (
        <p className="muted">Only the project owner can manage deploy hooks.</p>
      )}
      <div className="deployment-list">
        {hooks.map((hook) => (
          <article key={hook.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{hook.label}</h3>
                <p className="muted"><a href={hook.hookUrl} target="_blank" rel="noreferrer">{hook.hookUrl}</a></p>
                {hook.lastTriggeredAt ? <p className="muted">Last triggered: {new Date(hook.lastTriggeredAt).toLocaleString()}</p> : null}
              </div>
              {canManage ? (
                <button className="link-button" type="button" onClick={() => deleteHook(hook.id)} disabled={busyId === hook.id}>
                  {busyId === hook.id ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {hooks.length === 0 ? <p className="muted">No deploy hooks yet.</p> : null}
      </div>
    </section>
  );
}
