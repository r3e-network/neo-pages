'use client';

import React, { useEffect, useState } from 'react';

interface InviteItem {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked';
  inviteUrl: string;
  createdAt: string;
  respondedAt: string | null;
}

interface ProjectCollaboratorInvitesManagerProps {
  projectId: string;
  initialInvites: InviteItem[];
  accessRole: 'owner' | 'editor' | 'viewer';
}

export function ProjectCollaboratorInvitesManager({ projectId, initialInvites, accessRole }: ProjectCollaboratorInvitesManagerProps) {
  const [invites, setInvites] = useState(initialInvites);

  useEffect(() => {
    setInvites(initialInvites);
  }, [initialInvites]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canManage = accessRole === 'owner';

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('save');
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborator-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const payload = (await response.json()) as { invite?: InviteItem; error?: string };

      if (!response.ok || !payload.invite) {
        setMessage(payload.error ?? 'Failed to create collaborator invite');
        setBusyId(null);
        return;
      }

      setInvites((current) => [payload.invite!, ...current]);
      setEmail('');
      setRole('viewer');
      setMessage('Collaborator invitation created.');
      setBusyId(null);
    } catch {
      setMessage('Failed to create collaborator invite');
      setBusyId(null);
    }
  }

  async function revokeInvite(inviteId: string) {
    setBusyId(inviteId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborator-invites/${inviteId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to revoke invitation');
        setBusyId(null);
        return;
      }

      setInvites((current) => current.map((invite) => (invite.id === inviteId ? { ...invite, status: 'revoked' } : invite)));
      setMessage('Invitation revoked.');
      setBusyId(null);
    } catch {
      setMessage('Failed to revoke invitation');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Invitations</p>
          <h2>Email invites</h2>
        </div>
      </div>
      {canManage ? (
        <form className="form-grid" onSubmit={createInvite}>
          <div>
            <label htmlFor="invite-email">Email</label>
            <input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" required />
          </div>
          <div>
            <label htmlFor="invite-role">Role</label>
            <select id="invite-role" value={role} onChange={(event) => setRole(event.target.value as 'editor' | 'viewer')}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <div className="form-grid__footer">
            <button className="button" type="submit" disabled={busyId === 'save'}>{busyId === 'save' ? 'Sending…' : 'Create invite'}</button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
        </form>
      ) : (
        <p className="muted">Only the project owner can manage invitations.</p>
      )}
      <div className="deployment-list">
        {invites.map((invite) => (
          <article key={invite.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{invite.email}</h3>
                <p className="muted">{invite.role} · {invite.status}</p>
                <p className="muted"><a href={invite.inviteUrl} target="_blank" rel="noreferrer">{invite.inviteUrl}</a></p>
              </div>
              {canManage && invite.status === 'pending' ? (
                <button className="link-button" type="button" onClick={() => revokeInvite(invite.id)} disabled={busyId === invite.id}>
                  {busyId === invite.id ? 'Revoking…' : 'Revoke'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {invites.length === 0 ? <p className="muted">No pending collaborator invites.</p> : null}
      </div>
    </section>
  );
}
