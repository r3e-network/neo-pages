import React from 'react';

interface OrganizationUsageSummaryCardProps {
  usage: {
    projectCount: number;
    liveProjectCount: number;
    requestCount: number;
    bandwidthBytes: number;
  };
}

function formatBandwidth(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function OrganizationUsageSummaryCard({ usage }: OrganizationUsageSummaryCardProps) {
  return (
    <section className="stack">
      <div>
        <p className="eyebrow">Portfolio</p>
        <h3>Organization usage this month</h3>
      </div>
      <div className="metrics">
        <article className="card metric-card">
          <p className="eyebrow">Projects</p>
          <h3>{usage.projectCount.toLocaleString()}</h3>
          <p className="muted">Org-owned projects</p>
        </article>
        <article className="card metric-card">
          <p className="eyebrow">Live</p>
          <h3>{usage.liveProjectCount.toLocaleString()}</h3>
          <p className="muted">Currently deployed</p>
        </article>
        <article className="card metric-card">
          <p className="eyebrow">Requests</p>
          <h3>{usage.requestCount.toLocaleString()}</h3>
          <p className="muted">Current month</p>
        </article>
        <article className="card metric-card">
          <p className="eyebrow">Bandwidth</p>
          <h3>{formatBandwidth(usage.bandwidthBytes)}</h3>
          <p className="muted">Current month</p>
        </article>
      </div>
    </section>
  );
}
