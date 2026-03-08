'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { describeManualDeploymentTarget, normalizeManualDeployBranch } from '../lib/manual-deploy';

interface ProjectManualDeployCardProps {
  projectId: string;
  defaultBranch: string;
  accessRole: 'owner' | 'editor' | 'viewer';
}

export function ProjectManualDeployCard({ projectId, defaultBranch, accessRole }: ProjectManualDeployCardProps) {
  const router = useRouter();
  const [branchInput, setBranchInput] = useState(defaultBranch);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBranchInput(defaultBranch);
  }, [defaultBranch]);
  const [message, setMessage] = useState<string | null>(null);
  const canDeploy = accessRole === 'owner' || accessRole === 'editor';

  const normalizedBranch = useMemo(() => normalizeManualDeployBranch(branchInput, defaultBranch), [branchInput, defaultBranch]);
  const target = useMemo(() => describeManualDeploymentTarget(normalizedBranch, defaultBranch), [normalizedBranch, defaultBranch]);

  async function queueDeployment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: normalizedBranch,
          commitMessage: `Queued manually from dashboard for ${normalizedBranch}`
        })
      });
      const payload = (await response.json()) as { error?: string; deployment?: { id: string; environment: 'production' | 'preview' } };

      if (!response.ok || !payload.deployment) {
        setMessage(payload.error ?? 'Failed to queue deployment');
        setBusy(false);
        return;
      }

      setMessage(`${target.label} queued for ${normalizedBranch}.`);
      setBusy(false);
      router.refresh();
    } catch {
      setMessage('Failed to queue deployment');
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Manual deploy</p>
          <h2>Queue a new deployment</h2>
        </div>
      </div>
      {canDeploy ? (
        <form className="form-grid" onSubmit={queueDeployment}>
          <div>
            <label htmlFor="manual-branch">Branch</label>
            <input id="manual-branch" value={branchInput} onChange={(event) => setBranchInput(event.target.value)} placeholder={defaultBranch} />
            <p className="muted">Target: {target.label} · Default branch: {defaultBranch}</p>
          </div>
          <div className="form-grid__footer">
            <button className="button" type="submit" disabled={busy}>{busy ? 'Queueing…' : target.label}</button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
        </form>
      ) : (
        <p className="muted">Only owners and editors can queue manual deployments.</p>
      )}
    </section>
  );
}
