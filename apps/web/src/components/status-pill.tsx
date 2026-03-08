import React from 'react';

interface StatusPillProps {
  status: string;
}

const statusToTone: Record<string, string> = {
  deployed: 'success',
  building: 'warning',
  uploading: 'warning',
  queued: 'pending',
  failed: 'danger'
};

export function StatusPill({ status }: StatusPillProps) {
  const tone = statusToTone[status] ?? 'neutral';

  return <span className={`status-pill status-pill--${tone}`}>{status}</span>;
}
