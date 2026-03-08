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

interface OrganizationWebhookDeliveriesFeedProps {
  initialDeliveries: DeliveryItem[];
}

export function OrganizationWebhookDeliveriesFeed({ initialDeliveries }: OrganizationWebhookDeliveriesFeedProps) {
  return (
    <section className="stack">
      <div>
        <p className="eyebrow">Webhook deliveries</p>
        <h3>Recent outgoing attempts</h3>
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
        {initialDeliveries.length === 0 ? <p className="muted">No organization webhook deliveries yet.</p> : null}
      </div>
    </section>
  );
}
