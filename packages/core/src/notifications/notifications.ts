import { createHmac } from 'node:crypto';
import { z } from 'zod';

import { organizationActivityEvents } from '../activity/activity';

export const projectNotificationEvents = [
  'deployment.started',
  'deployment.succeeded',
  'deployment.failed',
  'deployment.promoted'
] as const;

export const organizationNotificationEvents = organizationActivityEvents;

export type ProjectNotificationEvent = (typeof projectNotificationEvents)[number];
export type OrganizationNotificationEvent = (typeof organizationNotificationEvents)[number];
export const projectNotificationEventSchema = z.enum(projectNotificationEvents);
export const organizationNotificationEventSchema = z.enum(organizationNotificationEvents);

export const webhookPayloadFormats = ['json', 'slack'] as const;
export type WebhookPayloadFormat = (typeof webhookPayloadFormats)[number];
export const webhookPayloadFormatSchema = z.enum(webhookPayloadFormats);

export interface ProjectWebhookPayload {
  event: ProjectNotificationEvent;
  occurredAt: string;
  project: {
    id: string;
    name: string;
    subdomain: string;
    repoFullName: string;
  };
  deployment: {
    id: string;
    environment: 'production' | 'preview';
    branch: string;
    status: string;
    deploymentUrl: string | null;
    commitSha: string | null;
    previewAlias: string | null;
  };
}

export interface OrganizationWebhookPayload {
  event: OrganizationNotificationEvent;
  occurredAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  activity: {
    id: string;
    summary: string;
    createdAt: string;
  };
}

export function shouldSendProjectWebhook(events: string[], event: ProjectNotificationEvent): boolean {
  return events.includes(event);
}

export function shouldSendOrganizationWebhook(events: string[], event: OrganizationNotificationEvent): boolean {
  return events.includes(event);
}

export function buildProjectWebhookPayload(input: {
  event: ProjectNotificationEvent;
  project: {
    id: string;
    name: string;
    subdomain: string;
    repoFullName: string;
  };
  deployment: {
    id: string;
    environment: 'production' | 'preview';
    branch: string;
    status: string;
    deploymentUrl: string | null;
    commitSha: string | null;
    previewAlias: string | null;
  };
  occurredAt?: string;
}): ProjectWebhookPayload {
  return {
    event: input.event,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    project: input.project,
    deployment: input.deployment
  };
}

export function buildOrganizationWebhookPayload(input: {
  event: OrganizationNotificationEvent;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  activity: {
    id: string;
    summary: string;
    createdAt: string;
  };
  occurredAt?: string;
}): OrganizationWebhookPayload {
  return {
    event: input.event,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    organization: input.organization,
    activity: input.activity
  };
}

export function renderProjectNotificationDelivery(format: WebhookPayloadFormat, payload: ProjectWebhookPayload): {
  contentType: string;
  body: string;
} {
  if (format === 'slack') {
    return {
      contentType: 'application/json',
      body: JSON.stringify({
        text: `[NeoPages] ${payload.event} · ${payload.project.name} · ${payload.deployment.branch} · ${payload.deployment.status}${payload.deployment.deploymentUrl ? ` · ${payload.deployment.deploymentUrl}` : ''}`
      })
    };
  }

  return {
    contentType: 'application/json',
    body: JSON.stringify(payload)
  };
}

export function renderOrganizationNotificationDelivery(format: WebhookPayloadFormat, payload: OrganizationWebhookPayload): {
  contentType: string;
  body: string;
} {
  if (format === 'slack') {
    return {
      contentType: 'application/json',
      body: JSON.stringify({
        text: `[NeoPages] ${payload.event} · ${payload.organization.name} · ${payload.activity.summary}`
      })
    };
  }

  return {
    contentType: 'application/json',
    body: JSON.stringify(payload)
  };
}

export function signProjectWebhookPayload(secret: string, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}
