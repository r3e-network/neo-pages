'use client';

import React, { useEffect, useState } from 'react';

const supportedEvents = [
  'organization.created',
  'organization.governance.updated',
  'organization.member.added',
  'organization.member.removed',
  'organization.member.invited',
  'organization.member.invite_revoked',
  'organization.member.invite_accepted',
  'organization.env_group.created',
  'organization.env_group.item_saved',
  'organization.env_group.deleted'
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

interface OrganizationWebhooksManagerProps {
  organizationId: string;
  initialEndpoints: EndpointItem[];
  canManage: boolean;
}

export function OrganizationWebhooksManager({ organizationId, initialEndpoints, canManage }: OrganizationWebhooksManagerProps) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);

  useEffect(() => {
    setEndpoints(initialEndpoints);
  }, [initialEndpoints]);
  const [targetUrl, setTargetUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState<string[]>(['organization.member.invited']);
  const [payloadFormat, setPayloadFormat] = useState<'json' | 'slack'>('json');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('save');
    setMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/webhooks`, {
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
      setEvents(['organization.member.invited']);
      setPayloadFormat('json');
      setMessage('Organization webhook endpoint saved.');
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
      const response = await fetch(`/api/organizations/${organizationId}/webhooks/${endpointId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to delete webhook endpoint');
        setBusyId(null);
        return;
      }

      setEndpoints((current) => current.filter((endpoint) => endpoint.id !== endpointId));
      setMessage('Organization webhook endpoint deleted.');
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
    <section className="stack">
      <div>
        <p className="eyebrow">Activity webhooks</p>
        <h3>Fan out organization events</h3>
      </div>

      {canManage ? (
        <form className="form-grid" onSubmit={saveWebhook}>
          <div>
            <label htmlFor={`org-webhook-url-${organizationId}`}>Target URL</label>
            <input id={`org-webhook-url-${organizationId}`} placeholder="https://hooks.example.com/neopages" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} required />
          </div>
          <div>
            <label htmlFor={`org-webhook-secret-${organizationId}`}>Signing secret</label>
            <input id={`org-webhook-secret-${organizationId}`} placeholder="optional" value={secret} onChange={(event) => setSecret(event.target.value)} />
          </div>
          <div>
            <label htmlFor={`org-webhook-format-${organizationId}`}>Payload format</label>
            <select id={`org-webhook-format-${organizationId}`} value={payloadFormat} onChange={(event) => setPayloadFormat(event.target.value as 'json' | 'slack')}>
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
            <button className="button" type="submit" disabled={busyId === 'save'}>{busyId === 'save' ? 'Saving…' : 'Save webhook'}</button>
            {message ? <p className="muted">{message}</p> : null}
          </div>
        </form>
      ) : (
        <p className="muted">Only organization owners can manage activity webhooks.</p>
      )}

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
              {canManage ? (
                <button className="link-button" type="button" onClick={() => deleteEndpoint(endpoint.id)} disabled={busyId === endpoint.id}>
                  {busyId === endpoint.id ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {endpoints.length === 0 ? <p className="muted">No organization webhook endpoints yet.</p> : null}
      </div>
    </section>
  );
}
