'use client';

import React, { useEffect, useState } from 'react';

interface CollaboratorItem {
  collaboratorId: string;
  githubLogin: string | null;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: string;
}

interface ProjectCollaboratorsManagerProps {
  projectId: string;
  initialCollaborators: CollaboratorItem[];
  accessRole: 'owner' | 'editor' | 'viewer';
}

export function ProjectCollaboratorsManager({ projectId, initialCollaborators, accessRole }: ProjectCollaboratorsManagerProps) {
  const [collaborators, setCollaborators] = useState(initialCollaborators);

  useEffect(() => {
    setCollaborators(initialCollaborators);
  }, [initialCollaborators]);
  const [githubLogin, setGithubLogin] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canManage = accessRole === 'owner';

  async function addCollaborator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('save');
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubLogin, role })
      });
      const payload = (await response.json()) as { collaborator?: CollaboratorItem; error?: string };

      if (!response.ok || !payload.collaborator) {
        setMessage(payload.error ?? 'Failed to add collaborator');
        setBusyId(null);
        return;
      }

      setCollaborators((current) => [...current.filter((item) => item.collaboratorId !== payload.collaborator!.collaboratorId), payload.collaborator!]);
      setGithubLogin('');
      setRole('viewer');
      setMessage('Collaborator added.');
      setBusyId(null);
    } catch {
      setMessage('Failed to add collaborator');
      setBusyId(null);
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    setBusyId(collaboratorId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators/${collaboratorId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to remove collaborator');
        setBusyId(null);
        return;
      }

      setCollaborators((current) => current.filter((item) => item.collaboratorId !== collaboratorId));
      setMessage('Collaborator removed.');
      setBusyId(null);
    } catch {
      setMessage('Failed to remove collaborator');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Collaborators</p>
          <h2>Shared access</h2>
        </div>
      </div>
      {canManage ? (
        <form className="form-grid" onSubmit={addCollaborator}>
          <div>
            <label htmlFor="collaborator-login">GitHub login</label>
            <input id="collaborator-login" value={githubLogin} onChange={(event) => setGithubLogin(event.target.value)} placeholder="octocat" required />
          </div>
          <div>
            <label htmlFor="collaborator-role">Role</label>
            <select id="collaborator-role" value={role} onChange={(event) => setRole(event.target.value as 'editor' | 'viewer')}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <div className="form-grid__footer">
            <button className="button" type="submit" disabled={busyId === 'save'}>{busyId === 'save' ? 'Adding…' : 'Add collaborator'}</button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
        </form>
      ) : (
        <p className="muted">Only the project owner can manage collaborators. Your access role is {accessRole}.</p>
      )}
      <div className="deployment-list">
        {collaborators.map((collaborator) => (
          <article key={collaborator.collaboratorId} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{collaborator.githubLogin ?? collaborator.collaboratorId}</h3>
                <p className="muted">{collaborator.role}</p>
              </div>
              {canManage ? (
                <button className="link-button" type="button" onClick={() => removeCollaborator(collaborator.collaboratorId)} disabled={busyId === collaborator.collaboratorId}>
                  {busyId === collaborator.collaboratorId ? 'Removing…' : 'Remove'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {collaborators.length === 0 ? <p className="muted">No collaborators yet.</p> : null}
      </div>
    </section>
  );
}
