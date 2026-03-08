import React from 'react';

interface ActivityItem {
  id: string;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ProjectActivityFeedProps {
  initialActivity: ActivityItem[];
}

export function ProjectActivityFeed({ initialActivity }: ProjectActivityFeedProps) {
  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>Recent project events</h2>
        </div>
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
        {initialActivity.length === 0 ? <p className="muted">No project activity yet.</p> : null}
      </div>
    </section>
  );
}
