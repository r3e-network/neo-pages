'use client';

import React, { useEffect, useState } from 'react';

interface EnvVarItem {
  id: string;
  key: string;
  environment: 'all' | 'production' | 'preview';
  maskedValue: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectEnvVarsManagerProps {
  projectId: string;
  initialEnvVars: EnvVarItem[];
}

export function ProjectEnvVarsManager({ projectId, initialEnvVars }: ProjectEnvVarsManagerProps) {
  const [envVars, setEnvVars] = useState(initialEnvVars);

  useEffect(() => {
    setEnvVars(initialEnvVars);
  }, [initialEnvVars]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [environment, setEnvironment] = useState<'all' | 'production' | 'preview'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveEnvVar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('save');
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, environment })
      });
      const payload = (await response.json()) as { envVar?: EnvVarItem; error?: string };

      if (!response.ok || !payload.envVar) {
        setMessage(payload.error ?? 'Failed to save environment variable');
        setBusyId(null);
        return;
      }

      const nextEnvVar = payload.envVar;
      setEnvVars((current) => {
        const exists = current.some((item) => item.key === nextEnvVar.key && item.environment === nextEnvVar.environment);
        return exists
          ? current.map((item) => (item.key === nextEnvVar.key && item.environment === nextEnvVar.environment ? nextEnvVar : item))
          : [...current, nextEnvVar];
      });
      setKey('');
      setValue('');
      setEnvironment('all');
      setMessage(`Saved ${nextEnvVar.key}.`);
      setBusyId(null);
    } catch {
      setMessage('Failed to save environment variable');
      setBusyId(null);
    }
  }

  async function removeEnvVar(envVarId: string) {
    setBusyId(envVarId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/env/${envVarId}`, {
        method: 'DELETE'
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to delete environment variable');
        setBusyId(null);
        return;
      }

      setEnvVars((current) => current.filter((item) => item.id !== envVarId));
      setMessage('Environment variable deleted.');
      setBusyId(null);
    } catch {
      setMessage('Failed to delete environment variable');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Build environment</p>
          <h2>Project secrets and public env vars</h2>
        </div>
      </div>

      <form className="form-grid" onSubmit={saveEnvVar}>
        <div>
          <label htmlFor="env-key">Key</label>
          <input id="env-key" placeholder="NEXT_PUBLIC_API_URL" value={key} onChange={(event) => setKey(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="env-value">Value</label>
          <input id="env-value" placeholder="https://api.example.com" value={value} onChange={(event) => setValue(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="env-environment">Environment</label>
          <select id="env-environment" value={environment} onChange={(event) => setEnvironment(event.target.value as 'all' | 'production' | 'preview')}>
            <option value="all">All</option>
            <option value="production">Production only</option>
            <option value="preview">Preview only</option>
          </select>
        </div>
        <div className="form-grid__footer">
          <button className="button" type="submit" disabled={busyId === 'save'}>
            {busyId === 'save' ? 'Saving…' : 'Save variable'}
          </button>
          {message ? <p className="muted">{message}</p> : null}
        </div>
      </form>

      <div className="deployment-list">
        {envVars.map((envVar) => (
          <article key={envVar.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{envVar.key}</h3>
                <p className="muted">{envVar.environment} · {envVar.maskedValue}</p>
              </div>
              <button className="link-button" type="button" onClick={() => removeEnvVar(envVar.id)} disabled={busyId === envVar.id}>
                {busyId === envVar.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
        {envVars.length === 0 ? <p className="muted">No project environment variables yet.</p> : null}
      </div>
    </section>
  );
}
