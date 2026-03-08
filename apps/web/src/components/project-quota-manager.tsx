'use client';

import React, { useEffect, useState } from 'react';

interface ProjectQuotaManagerProps {
  projectId: string;
  accessRole: 'owner' | 'editor' | 'viewer';
  organization?: { id: string; name: string } | null;
  initialUsage: {
    planTier: 'free' | 'pro' | 'enterprise' | 'custom';
    monthlyBandwidthLimitBytes: number;
    monthlyRequestLimit: number;
    useOrganizationQuotas: boolean;
  };
}

export function ProjectQuotaManager({ projectId, accessRole, organization = null, initialUsage }: ProjectQuotaManagerProps) {
  const [planTier, setPlanTier] = useState(initialUsage.planTier);
  const [monthlyBandwidthLimitBytes, setMonthlyBandwidthLimitBytes] = useState(String(initialUsage.monthlyBandwidthLimitBytes));
  const [monthlyRequestLimit, setMonthlyRequestLimit] = useState(String(initialUsage.monthlyRequestLimit));
  const [useOrganizationQuotas, setUseOrganizationQuotas] = useState(initialUsage.useOrganizationQuotas);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPlanTier(initialUsage.planTier);
    setMonthlyBandwidthLimitBytes(String(initialUsage.monthlyBandwidthLimitBytes));
    setMonthlyRequestLimit(String(initialUsage.monthlyRequestLimit));
    setUseOrganizationQuotas(initialUsage.useOrganizationQuotas);
  }, [initialUsage]);
  const canManage = accessRole === 'owner';

  async function saveQuota(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          monthlyBandwidthLimitBytes: Number(monthlyBandwidthLimitBytes),
          monthlyRequestLimit: Number(monthlyRequestLimit),
          useOrganizationQuotas
        })
      });
      const payload = (await response.json()) as {
        usage?: { planTier: string; monthlyBandwidthLimitBytes: number; monthlyRequestLimit: number; useOrganizationQuotas: boolean };
        error?: string;
      };

      if (!response.ok || !payload.usage) {
        setMessage(payload.error ?? 'Failed to update quota policy');
        setBusy(false);
        return;
      }

      setPlanTier(payload.usage.planTier as typeof planTier);
      setMonthlyBandwidthLimitBytes(String(payload.usage.monthlyBandwidthLimitBytes));
      setMonthlyRequestLimit(String(payload.usage.monthlyRequestLimit));
      setUseOrganizationQuotas(payload.usage.useOrganizationQuotas);
      setMessage(payload.usage.useOrganizationQuotas ? 'Organization quota inheritance enabled.' : 'Quota policy updated.');
      setBusy(false);
    } catch {
      setMessage('Failed to update quota policy');
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Quota policy</p>
          <h2>Plan tier and hard limits</h2>
          {organization ? (
            <p className="muted">
              {useOrganizationQuotas
                ? `${organization.name} currently owns this quota policy.`
                : `This project can inherit quota defaults from ${organization.name} or use project-specific limits.`}
            </p>
          ) : null}
        </div>
      </div>
      <form className="form-grid" onSubmit={saveQuota}>
        {organization ? (
          <label className="muted">
            <input
              type="checkbox"
              checked={useOrganizationQuotas}
              onChange={(event) => setUseOrganizationQuotas(event.target.checked)}
              disabled={!canManage}
            />{' '}
            Use organization defaults
          </label>
        ) : null}
        <div>
          <label htmlFor="plan-tier">Plan tier</label>
          <select id="plan-tier" value={planTier} onChange={(event) => setPlanTier(event.target.value as typeof planTier)} disabled={useOrganizationQuotas || !canManage}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label htmlFor="bandwidth-limit">Monthly bandwidth limit (bytes)</label>
          <input id="bandwidth-limit" value={monthlyBandwidthLimitBytes} onChange={(event) => setMonthlyBandwidthLimitBytes(event.target.value)} disabled={useOrganizationQuotas || !canManage} />
        </div>
        <div>
          <label htmlFor="request-limit">Monthly request limit</label>
          <input id="request-limit" value={monthlyRequestLimit} onChange={(event) => setMonthlyRequestLimit(event.target.value)} disabled={useOrganizationQuotas || !canManage} />
        </div>
        <div className="form-grid__footer">
          {canManage ? <button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save quota policy'}</button> : <p className="muted">Only project owners can change quota policy.</p>}
          {message ? <p className="muted">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
