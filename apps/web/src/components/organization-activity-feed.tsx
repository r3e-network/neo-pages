import React from 'react';

interface ActivityItem {
  id: string;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface OrganizationActivityFeedProps {
  initialActivity: ActivityItem[];
}

export function OrganizationActivityFeed({ initialActivity }: OrganizationActivityFeedProps) {
  return (
    <section className="stack">
      <div>
        <p className="eyebrow">Activity</p>
        <h3>Recent organization events</h3>
      </div>
      <div className="deployment-list">
        {initialActivity.map((item) => (
          <article key={item.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{item.summary}</h3>
                <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </article>
        ))}
        {initialActivity.length === 0 ? <p className="muted">No organization activity yet.</p> : null}
      </div>
    </section>
  );
}
