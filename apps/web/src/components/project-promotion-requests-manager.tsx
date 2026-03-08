'use client';

import React, { useEffect, useState } from 'react';

interface PromotionRequestItem {
  id: string;
  deployment_id: string;
  status: 'pending' | 'approved' | 'rejected';
  request_comment: string | null;
  created_at: string;
}

interface ProjectPromotionRequestsManagerProps {
  projectId: string;
  initialRequests: PromotionRequestItem[];
}

export function ProjectPromotionRequestsManager({ projectId, initialRequests }: ProjectPromotionRequestsManagerProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);
  const [message, setMessage] = useState<string | null>(null);

  async function review(requestId: string, decision: 'approve' | 'reject', deploymentId: string) {
    setBusyId(requestId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/promotion-requests/${requestId}/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId })
      });
      const payload = (await response.json()) as { request?: PromotionRequestItem; error?: string };

      if (!response.ok || !payload.request) {
        setMessage(payload.error ?? 'Failed to review promotion request');
        setBusyId(null);
        return;
      }

      setRequests((current) => current.map((item) => (item.id === requestId ? payload.request! : item)));
      setMessage(decision === 'approve' ? 'Promotion approved.' : 'Promotion rejected.');
      setBusyId(null);
    } catch {
      setMessage('Failed to review promotion request');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Promotion requests</p>
          <h2>Pending approvals</h2>
        </div>
      </div>
      {message ? <p className="muted">{message}</p> : null}
      <div className="deployment-list">
        {requests.map((request) => (
          <article key={request.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{request.deployment_id}</h3>
                <p className="muted">{request.status}</p>
                {request.request_comment ? <p className="muted">{request.request_comment}</p> : null}
              </div>
              {request.status === 'pending' ? (
                <div className="form-grid__footer">
                  <button className="link-button" type="button" onClick={() => review(request.id, 'approve', request.deployment_id)} disabled={busyId === request.id}>
                    {busyId === request.id ? 'Applying…' : 'Approve'}
                  </button>
                  <button className="link-button" type="button" onClick={() => review(request.id, 'reject', request.deployment_id)} disabled={busyId === request.id}>
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {requests.length === 0 ? <p className="muted">No promotion requests yet.</p> : null}
      </div>
    </section>
  );
}
