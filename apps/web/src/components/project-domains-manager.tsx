'use client';

import React, { useEffect, useState } from 'react';

import { StatusPill } from './status-pill';

interface DomainItem {
  id: string;
  host: string;
  verification_token: string | null;
  verified_at: string | null;
  verification_error: string | null;
  verificationHostname: string;
  routingTarget: string;
  dnsConfigured: boolean;
}

interface ProjectDomainsManagerProps {
  projectId: string;
  initialDomains: DomainItem[];
}

export function ProjectDomainsManager({ projectId, initialDomains }: ProjectDomainsManagerProps) {
  const [domains, setDomains] = useState(initialDomains);

  useEffect(() => {
    setDomains(initialDomains);
  }, [initialDomains]);
  const [host, setHost] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('create');
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host })
      });
      const payload = (await response.json()) as { domain?: DomainItem; error?: string };

      if (!response.ok || !payload.domain) {
        setMessage(payload.error ?? 'Failed to add custom domain');
        setBusyId(null);
        return;
      }

      const nextDomain = payload.domain;
      setDomains((current) => [...current, nextDomain]);
      setHost('');
      setMessage(`Added ${nextDomain.host}. Create the TXT record, then verify it.`);
      setBusyId(null);
    } catch {
      setMessage('Failed to add custom domain');
      setBusyId(null);
    }
  }

  async function verifyDomain(domainId: string) {
    setBusyId(domainId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/domains/${domainId}/verify`, {
        method: 'POST'
      });
      const payload = (await response.json()) as { domain?: DomainItem; error?: string };

      if (!response.ok || !payload.domain) {
        setMessage(payload.error ?? 'Domain verification failed');
        setBusyId(null);
        return;
      }

      const nextDomain = payload.domain;
      setDomains((current) => current.map((domain) => (domain.id === domainId && nextDomain ? nextDomain : domain)));
      setMessage(payload.domain.verified_at ? `Verified ${payload.domain.host}.` : `Checked ${payload.domain.host}. DNS still needs updates.`);
      setBusyId(null);
    } catch {
      setMessage('Domain verification failed');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Custom domains</p>
          <h2>Bring your own hostname</h2>
        </div>
      </div>

      <form className="form-grid" onSubmit={createDomain}>
        <div>
          <label htmlFor="domain-host">Domain host</label>
          <input
            id="domain-host"
            placeholder="app.example.com"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            required
          />
        </div>
        <div className="form-grid__footer">
          <button className="button" type="submit" disabled={busyId === 'create'}>
            {busyId === 'create' ? 'Adding…' : 'Add custom domain'}
          </button>
          {message ? <p className="muted">{message}</p> : null}
        </div>
      </form>

      <div className="deployment-list">
        {domains.map((domain) => {
          const isNNS = domain.host.endsWith('.neo');
          
          return (
            <article key={domain.id} className="card stack">
              <div className="project-card__header">
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {domain.host}
                    {isNNS && <span className="status-pill status-pill--success" style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', lineHeight: 1 }}>Web3 Domain</span>}
                  </h3>
                  <p className="muted">TXT: {domain.verificationHostname}</p>
                </div>
                <StatusPill status={domain.verified_at ? 'deployed' : 'queued'} />
              </div>
              
              {isNNS ? (
                <p className="muted">Bind your NNS domain to the NeoPages smart contract.</p>
              ) : (
                <>
                  <p className="muted">TXT value: <code>{domain.verification_token}</code></p>
                  <p className="muted">Routing target: <code>{domain.routingTarget}</code></p>
                </>
              )}
              
              {domain.verification_error ? <p className="muted">{domain.verification_error}</p> : null}
              <div className="form-grid__footer">
                <button className="link-button" type="button" onClick={() => verifyDomain(domain.id)} disabled={busyId === domain.id}>
                  {busyId === domain.id ? 'Checking…' : 'Verify DNS'}
                </button>
              </div>
            </article>
          );
        })}
        {domains.length === 0 ? <p className="muted">No custom domains yet.</p> : null}
      </div>
    </section>
  );
}
