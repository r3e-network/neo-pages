import { describe, expect, it } from 'vitest';

import {
  buildOrganizationWebhookPayload,
  buildProjectWebhookPayload,
  renderOrganizationNotificationDelivery,
  renderProjectNotificationDelivery,
  webhookPayloadFormatSchema
} from '../index';

const projectPayload = buildProjectWebhookPayload({
  event: 'deployment.succeeded',
  project: {
    id: 'project-1',
    name: 'Neo Arcade',
    subdomain: 'neo-arcade',
    repoFullName: 'neo/neo-arcade'
  },
  deployment: {
    id: 'deployment-1',
    environment: 'production',
    branch: 'main',
    status: 'deployed',
    deploymentUrl: 'https://neo-arcade.neopages.dev',
    commitSha: 'abc1234',
    previewAlias: null
  }
});

const organizationPayload = buildOrganizationWebhookPayload({
  event: 'organization.member.invited',
  organization: {
    id: 'org-1',
    name: 'Neo Labs',
    slug: 'neo-labs'
  },
  activity: {
    id: 'activity-1',
    summary: 'Invited dev@example.com to Neo Labs',
    createdAt: '2026-03-07T00:00:00.000Z'
  }
});

describe('webhookPayloadFormatSchema', () => {
  it('parses supported formats', () => {
    expect(webhookPayloadFormatSchema.parse('json')).toBe('json');
    expect(webhookPayloadFormatSchema.parse('slack')).toBe('slack');
  });
});

describe('renderProjectNotificationDelivery', () => {
  it('renders JSON payloads', () => {
    const rendered = renderProjectNotificationDelivery('json', projectPayload);
    expect(rendered.contentType).toBe('application/json');
    expect(rendered.body).toContain('deployment.succeeded');
  });

  it('renders Slack payloads', () => {
    const rendered = renderProjectNotificationDelivery('slack', projectPayload);
    expect(rendered.body).toContain('NeoPages');
  });
});

describe('renderOrganizationNotificationDelivery', () => {
  it('renders JSON payloads', () => {
    const rendered = renderOrganizationNotificationDelivery('json', organizationPayload);
    expect(rendered.contentType).toBe('application/json');
    expect(rendered.body).toContain('organization.member.invited');
  });

  it('renders Slack payloads', () => {
    const rendered = renderOrganizationNotificationDelivery('slack', organizationPayload);
    expect(rendered.body).toContain('NeoPages');
    expect(rendered.body).toContain('Neo Labs');
  });
});
