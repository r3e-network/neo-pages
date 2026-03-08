'use client';

import React, { useEffect, useState } from 'react';

const availableScopes = ['project:read', 'deployments:read', 'deployments:write'] as const;

interface TokenItem {
  id: string;
  label: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

interface ProjectApiTokensManagerProps {
  projectId: string;
  initialTokens: TokenItem[];
  accessRole: 'owner' | 'editor' | 'viewer';
}

export function ProjectApiTokensManager({ projectId, initialTokens, accessRole }: ProjectApiTokensManagerProps) {
  const [tokens, setTokens] = useState(initialTokens);

  useEffect(() => {
    setTokens(initialTokens);
  }, [initialTokens]);
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<string[]>(['project:read']);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const canManage = accessRole === 'owner';

  function toggleScope(scope: string) {
    setScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]));
  }

  async function createToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('save');
    setMessage(null);
    setRevealedToken(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, scopes })
      });
      const payload = (await response.json()) as { token?: TokenItem & { token: string }; error?: string };

      if (!response.ok || !payload.token) {
        setMessage(payload.error ?? 'Failed to create API token');
        setBusyId(null);
        return;
      }

      const { token, ...tokenView } = payload.token;
      setTokens((current) => [tokenView, ...current]);
      setRevealedToken(token);
      setLabel('');
      setScopes(['project:read']);
      setMessage('API token created. Copy it now; it will not be shown again.');
      setBusyId(null);
    } catch {
      setMessage('Failed to create API token');
      setBusyId(null);
    }
  }

  async function deleteToken(tokenId: string) {
    setBusyId(tokenId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/tokens/${tokenId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to delete API token');
        setBusyId(null);
        return;
      }

      setTokens((current) => current.filter((token) => token.id !== tokenId));
      setMessage('API token deleted.');
      setBusyId(null);
    } catch {
      setMessage('Failed to delete API token');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">API tokens</p>
          <h2>Machine access</h2>
        </div>
      </div>
      {canManage ? (
        <form className="form-grid" onSubmit={createToken}>
          <div>
            <label htmlFor="token-label">Label</label>
            <input id="token-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="CI deploy token" required />
          </div>
          <div className="stack">
            <span className="muted">Scopes</span>
            {availableScopes.map((scope) => (
              <label key={scope} className="muted">
                <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} /> {scope}
              </label>
            ))}
          </div>
          <div className="form-grid__footer">
            <button className="button" type="submit" disabled={busyId === 'save'}>{busyId === 'save' ? 'Creating…' : 'Create token'}</button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
          {revealedToken ? <pre className="deployment-log">{revealedToken}</pre> : null}
        </form>
      ) : (
        <p className="muted">Only the project owner can manage API tokens.</p>
      )}
      <div className="deployment-list">
        {tokens.map((token) => (
          <article key={token.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{token.label}</h3>
                <p className="muted">{token.tokenPrefix}</p>
                <p className="muted">{token.scopes.join(', ')}</p>
                {token.lastUsedAt ? <p className="muted">Last used: {new Date(token.lastUsedAt).toLocaleString()}</p> : null}
              </div>
              {canManage ? (
                <button className="link-button" type="button" onClick={() => deleteToken(token.id)} disabled={busyId === token.id}>
                  {busyId === token.id ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {tokens.length === 0 ? <p className="muted">No project API tokens yet.</p> : null}
      </div>
    </section>
  );
}
