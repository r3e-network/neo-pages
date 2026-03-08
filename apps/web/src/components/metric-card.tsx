import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  hint: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="card metric-card">
      <p className="eyebrow">{label}</p>
      <h3>{value}</h3>
      <p className="muted">{hint}</p>
    </article>
  );
}

