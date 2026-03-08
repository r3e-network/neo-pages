'use client';

import React, { useEffect, useState } from 'react';

interface AcceptCollaboratorInviteCardProps {
  token: string;
  email: string;
  status: string;
}

export function AcceptCollaboratorInviteCard({ token, email, status }: AcceptCollaboratorInviteCardProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(status === 'pending' ? null : `Invitation is ${status}.`);

  useEffect(() => {
    setMessage(status === 'pending' ? null : `Invitation is ${status}.`);
  }, [status]);

  async function acceptInvite() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/collaborator-invites/${token}/accept`, { method: 'POST' });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to accept invitation');
        setBusy(false);
        return;
      }

      setMessage(`Accepted invite for ${email}.`);
      setBusy(false);
    } catch {
      setMessage('Failed to accept invitation');
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <p className="muted">Accept this invitation with the signed-in account for {email}.</p>
      <div className="form-grid__footer">
        <button className="button" type="button" onClick={acceptInvite} disabled={busy || status !== 'pending'}>
          {busy ? 'Accepting…' : 'Accept invitation'}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    </div>
  );
}
