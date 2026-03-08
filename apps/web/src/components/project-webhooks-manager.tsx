'use client';

import React, { useEffect, useState } from 'react';

const supportedEvents = [
  'deployment.started',
  'deployment.succeeded',
  'deployment.failed',
  'deployment.promoted'
] as const;

interface EndpointItem {
  id: string;
  targetUrl: string;
  hasSecret: boolean;
  payloadFormat: 'json' | 'slack';
  events: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectWebhooksManagerProps {
  projectId: string;
  initialEndpoints: EndpointItem[];
}

export function ProjectWebhooksManager({ projectId, initialEndpoints }: ProjectWebhooksManagerProps) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);

  useEffect(() => {
    setEndpoints(initialEndpoints);
  }, [initialEndpoints]);
  const [targetUrl, setTargetUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState<string[]>(['deployment.succeeded']);
  const [payloadFormat, setPayloadFormat] = useState<'json' | 'slack'>('json');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('save');
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, secret, payloadFormat, events })
      });
      const payload = (await response.json()) as { endpoint?: EndpointItem; error?: string };

      if (!response.ok || !payload.endpoint) {
        setMessage(payload.error ?? 'Failed to save webhook endpoint');
        setBusyId(null);
        return;
      }

      setEndpoints((current) => [...current, payload.endpoint!]);
      setTargetUrl('');
      setSecret('');
      setEvents(['deployment.succeeded']);
      setPayloadFormat('json');
      setMessage('Deployment webhook endpoint saved.');
      setBusyId(null);
    } catch {
      setMessage('Failed to save webhook endpoint');
      setBusyId(null);
    }
  }

  async function deleteEndpoint(endpointId: string) {
    setBusyId(endpointId);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks/${endpointId}`, {
        method: 'DELETE'
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to delete webhook endpoint');
        setBusyId(null);
        return;
      }

      setEndpoints((current) => current.filter((endpoint) => endpoint.id !== endpointId));
      setMessage('Webhook endpoint deleted.');
      setBusyId(null);
    } catch {
      setMessage('Failed to delete webhook endpoint');
      setBusyId(null);
    }
  }

  function toggleEvent(nextEvent: string) {
    setEvents((current) =>
      current.includes(nextEvent) ? current.filter((event) => event !== nextEvent) : [...current, nextEvent]
    );
  }

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Deployment webhooks</p>
          <h2>Notify your own systems</h2>
        </div>
      </div>

      <form className="form-grid" onSubmit={saveWebhook}>
        <div>
          <label htmlFor="webhook-url">Target URL</label>
          <input id="webhook-url" placeholder="https://hooks.example.com/neopages" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="webhook-secret">Signing secret</label>
          <input id="webhook-secret" placeholder="optional" value={secret} onChange={(event) => setSecret(event.target.value)} />
        </div>
        <div>
          <label htmlFor="webhook-format">Payload format</label>
          <select id="webhook-format" value={payloadFormat} onChange={(event) => setPayloadFormat(event.target.value as 'json' | 'slack')}>
            <option value="json">Generic JSON</option>
            <option value="slack">Slack text</option>
          </select>
        </div>
        <div className="stack">
          <span className="muted">Events</span>
          {supportedEvents.map((eventName) => (
            <label key={eventName} className="muted">
              <input type="checkbox" checked={events.includes(eventName)} onChange={() => toggleEvent(eventName)} /> {eventName}
            </label>
          ))}
        </div>
        <div className="form-grid__footer">
          <button className="button" type="submit" disabled={busyId === 'save'}>
            {busyId === 'save' ? 'Saving…' : 'Save webhook'}
          </button>
          {message ? <p className="muted">{message}</p> : null}
        </div>
      </form>

      <div className="deployment-list">
        {endpoints.map((endpoint) => (
          <article key={endpoint.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{endpoint.targetUrl}</h3>
                <p className="muted">{endpoint.events.join(', ')}</p>
                <p className="muted">Format: {endpoint.payloadFormat}</p>
                <p className="muted">{endpoint.hasSecret ? 'Signed requests enabled' : 'Unsigned requests'}</p>
              </div>
              <button className="link-button" type="button" onClick={() => deleteEndpoint(endpoint.id)} disabled={busyId === endpoint.id}>
                {busyId === endpoint.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </article>
        ))}
        {endpoints.length === 0 ? <p className="muted">No deployment webhook endpoints yet.</p> : null}
      </div>
    </section>
  );
}
