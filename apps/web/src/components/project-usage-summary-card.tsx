import React from 'react';

import { formatBandwidth } from '../lib/usage';

interface ProjectUsageSummaryCardProps {
  usage: {
    requestCount: number;
    bandwidthBytes: number;
    planTier: string;
    monthlyBandwidthLimitBytes: number;
    monthlyRequestLimit: number;
  };
}

export function ProjectUsageSummaryCard({ usage }: ProjectUsageSummaryCardProps) {
  const bandwidthPercentage = usage.monthlyBandwidthLimitBytes > 0 ? Math.min(100, Math.round((usage.bandwidthBytes / usage.monthlyBandwidthLimitBytes) * 100)) : 0;
  const requestPercentage = usage.monthlyRequestLimit > 0 ? Math.min(100, Math.round((usage.requestCount / usage.monthlyRequestLimit) * 100)) : 0;

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Usage</p>
          <h2>Current month</h2>
        </div>
      </div>
      <div className="metrics">
        <article className="card">
          <p className="eyebrow">Requests</p>
          <h3>{usage.requestCount.toLocaleString()}</h3>
          <p className="muted">Limit: {usage.monthlyRequestLimit.toLocaleString()}</p>
        </article>
        <article className="card">
          <p className="eyebrow">Bandwidth</p>
          <h3>{formatBandwidth(usage.bandwidthBytes)}</h3>
          <p className="muted">Limit: {formatBandwidth(usage.monthlyBandwidthLimitBytes)}</p>
        </article>
        <article className="card">
          <p className="eyebrow">Quota</p>
          <h3>{bandwidthPercentage}% / {requestPercentage}%</h3>
          <p className="muted">Tier: {usage.planTier}</p>
        </article>
      </div>
    </section>
  );
}
