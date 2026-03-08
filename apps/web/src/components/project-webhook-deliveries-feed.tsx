import React from 'react';

interface DeliveryItem {
  id: string;
  targetUrl: string;
  eventType: string;
  status: string;
  attemptCount: number;
  lastResponseStatus: number | null;
  lastError: string | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  deadLetteredAt: string | null;
  createdAt: string;
}

interface ProjectWebhookDeliveriesFeedProps {
  initialDeliveries: DeliveryItem[];
}

export function ProjectWebhookDeliveriesFeed({ initialDeliveries }: ProjectWebhookDeliveriesFeedProps) {
  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Webhook deliveries</p>
          <h2>Recent outgoing delivery attempts</h2>
        </div>
      </div>
      <div className="deployment-list">
        {initialDeliveries.map((delivery) => (
          <article key={delivery.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{delivery.eventType}</h3>
                <p className="muted">{delivery.targetUrl}</p>
                <p className="muted">
                  {delivery.status} · attempt {delivery.attemptCount}
                  {delivery.lastResponseStatus ? ` · HTTP ${delivery.lastResponseStatus}` : ''}
                </p>
                {delivery.lastError ? <p className="muted">{delivery.lastError}</p> : null}
                {delivery.nextRetryAt ? <p className="muted">Next retry: {new Date(delivery.nextRetryAt).toLocaleString()}</p> : null}
              </div>
            </div>
          </article>
        ))}
        {initialDeliveries.length === 0 ? <p className="muted">No webhook deliveries yet.</p> : null}
      </div>
    </section>
  );
}
