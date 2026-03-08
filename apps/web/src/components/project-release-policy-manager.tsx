'use client';

import React, { useEffect, useState } from 'react';

interface ProjectReleasePolicyManagerProps {
  projectId: string;
  accessRole: 'owner' | 'editor' | 'viewer';
  organization?: { id: string; name: string } | null;
  initialPolicy: {
    requirePromotionApproval: boolean;
    protectedBranches: string[];
    useOrganizationReleasePolicy: boolean;
  };
}

export function ProjectReleasePolicyManager({ projectId, accessRole, organization = null, initialPolicy }: ProjectReleasePolicyManagerProps) {
  const [requireApproval, setRequireApproval] = useState(initialPolicy.requirePromotionApproval);
  const [branches, setBranches] = useState(initialPolicy.protectedBranches.join(', '));
  const [useOrganizationReleasePolicy, setUseOrganizationReleasePolicy] = useState(initialPolicy.useOrganizationReleasePolicy);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setRequireApproval(initialPolicy.requirePromotionApproval);
    setBranches(initialPolicy.protectedBranches.join(', '));
    setUseOrganizationReleasePolicy(initialPolicy.useOrganizationReleasePolicy);
  }, [initialPolicy]);
  const canManage = accessRole === 'owner';

  async function savePolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/release-policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirePromotionApproval: requireApproval, protectedBranches: branches, useOrganizationReleasePolicy })
      });
      const payload = (await response.json()) as { policy?: { protectedBranches: string[]; requirePromotionApproval: boolean; useOrganizationReleasePolicy: boolean }; error?: string };

      if (!response.ok || !payload.policy) {
        setMessage(payload.error ?? 'Failed to save release policy');
        setBusy(false);
        return;
      }

      setRequireApproval(payload.policy.requirePromotionApproval);
      setBranches(payload.policy.protectedBranches.join(', '));
      setUseOrganizationReleasePolicy(payload.policy.useOrganizationReleasePolicy);
      setMessage(payload.policy.useOrganizationReleasePolicy ? 'Organization release policy inheritance enabled.' : 'Release policy updated.');
      setBusy(false);
    } catch {
      setMessage('Failed to save release policy');
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Release policy</p>
          <h2>Protect production promotions</h2>
          {organization ? (
            <p className="muted">
              {useOrganizationReleasePolicy
                ? `${organization.name} currently owns this release policy.`
                : `This project can inherit promotion rules from ${organization.name} or use project-specific rules.`}
            </p>
          ) : null}
        </div>
      </div>
      <form className="form-grid" onSubmit={savePolicy}>
        {organization ? (
          <label className="muted">
            <input
              type="checkbox"
              checked={useOrganizationReleasePolicy}
              onChange={(event) => setUseOrganizationReleasePolicy(event.target.checked)}
              disabled={!canManage}
            />{' '}
            Use organization defaults
          </label>
        ) : null}
        <label className="muted">
          <input type="checkbox" checked={requireApproval} onChange={(event) => setRequireApproval(event.target.checked)} disabled={useOrganizationReleasePolicy || !canManage} /> Require approval before promoting to production
        </label>
        <div>
          <label htmlFor="protected-branches">Allowed source branches</label>
          <input id="protected-branches" value={branches} onChange={(event) => setBranches(event.target.value)} placeholder="main, release" disabled={useOrganizationReleasePolicy || !canManage} />
        </div>
        <div className="form-grid__footer">
          {canManage ? <button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save release policy'}</button> : <p className="muted">Only project owners can change release policy.</p>}
          {message ? <p className="muted">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
