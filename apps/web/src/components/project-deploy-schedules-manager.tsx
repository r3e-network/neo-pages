'use client';

import React, { useEffect, useState } from 'react';

interface ScheduleItem {
  id: string;
  label: string;
  branch: string;
  cronExpression: string;
  timezone: string;
  active: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

interface ProjectDeploySchedulesManagerProps {
  projectId: string;
  defaultBranch: string;
  accessRole: 'owner' | 'editor' | 'viewer';
  initialSchedules: ScheduleItem[];
}

export function ProjectDeploySchedulesManager({ projectId, defaultBranch, accessRole, initialSchedules }: ProjectDeploySchedulesManagerProps) {
  const [schedules, setSchedules] = useState(initialSchedules);

  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);
  const [label, setLabel] = useState('');
  const [branch, setBranch] = useState(defaultBranch);

  useEffect(() => {
    setBranch(defaultBranch);
  }, [defaultBranch]);
  const [cronExpression, setCronExpression] = useState('0 * * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canManage = accessRole === 'owner' || accessRole === 'editor';

  async function createSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('save');
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, branch, cronExpression, timezone })
      });
      const payload = (await response.json()) as { schedule?: ScheduleItem; error?: string };

      if (!response.ok || !payload.schedule) {
        setMessage(payload.error ?? 'Failed to create deploy schedule');
        setBusyId(null);
        return;
      }

      setSchedules((current) => [payload.schedule!, ...current]);
      setLabel('');
      setBranch(defaultBranch);
      setCronExpression('0 * * * *');
      setTimezone('UTC');
      setMessage('Deploy schedule created.');
      setBusyId(null);
    } catch {
      setMessage('Failed to create deploy schedule');
      setBusyId(null);
    }
  }

  async function deleteSchedule(scheduleId: string) {
    setBusyId(scheduleId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/schedules/${scheduleId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to delete deploy schedule');
        setBusyId(null);
        return;
      }

      setSchedules((current) => current.filter((schedule) => schedule.id !== scheduleId));
      setMessage('Deploy schedule deleted.');
      setBusyId(null);
    } catch {
      setMessage('Failed to delete deploy schedule');
      setBusyId(null);
    }
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Deploy schedules</p>
          <h2>Cron-triggered deploys</h2>
        </div>
      </div>
      {canManage ? (
        <form className="form-grid" onSubmit={createSchedule}>
          <div>
            <label htmlFor="schedule-label">Label</label>
            <input id="schedule-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Hourly preview refresh" required />
          </div>
          <div>
            <label htmlFor="schedule-branch">Branch</label>
            <input id="schedule-branch" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder={defaultBranch} required />
          </div>
          <div>
            <label htmlFor="schedule-cron">Cron expression</label>
            <input id="schedule-cron" value={cronExpression} onChange={(event) => setCronExpression(event.target.value)} placeholder="0 * * * *" required />
          </div>
          <div>
            <label htmlFor="schedule-timezone">Timezone</label>
            <input id="schedule-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="UTC" required />
          </div>
          <div className="form-grid__footer">
            <button className="button" type="submit" disabled={busyId === 'save'}>{busyId === 'save' ? 'Saving…' : 'Create schedule'}</button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
        </form>
      ) : (
        <p className="muted">Only owners and editors can manage deploy schedules.</p>
      )}
      <div className="deployment-list">
        {schedules.map((schedule) => (
          <article key={schedule.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{schedule.label}</h3>
                <p className="muted">{schedule.branch} · {schedule.cronExpression} · {schedule.timezone}</p>
                {schedule.nextRunAt ? <p className="muted">Next run: {new Date(schedule.nextRunAt).toLocaleString()}</p> : null}
                {schedule.lastRunAt ? <p className="muted">Last run: {new Date(schedule.lastRunAt).toLocaleString()}</p> : null}
              </div>
              {canManage ? (
                <button className="link-button" type="button" onClick={() => deleteSchedule(schedule.id)} disabled={busyId === schedule.id}>
                  {busyId === schedule.id ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {schedules.length === 0 ? <p className="muted">No deploy schedules yet.</p> : null}
      </div>
    </section>
  );
}
