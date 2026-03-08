import { describe, expect, it } from 'vitest';

import {
  buildOrganizationWebhookPayload,
  buildProjectWebhookPayload,
  organizationNotificationEventSchema,
  projectNotificationEventSchema,
  shouldSendOrganizationWebhook,
  shouldSendProjectWebhook,
  signProjectWebhookPayload
} from '../index';

describe('project webhook events', () => {
  it('parses supported deployment lifecycle events', () => {
    expect(projectNotificationEventSchema.parse('deployment.started')).toBe('deployment.started');
    expect(projectNotificationEventSchema.parse('deployment.promoted')).toBe('deployment.promoted');
  });

  it('filters endpoints by subscribed events', () => {
    expect(shouldSendProjectWebhook(['deployment.succeeded'], 'deployment.succeeded')).toBe(true);
    expect(shouldSendProjectWebhook(['deployment.failed'], 'deployment.succeeded')).toBe(false);
  });
});

describe('organization webhook events', () => {
  it('parses supported organization activity events', () => {
    expect(organizationNotificationEventSchema.parse('organization.member.invited')).toBe('organization.member.invited');
    expect(organizationNotificationEventSchema.parse('organization.env_group.deleted')).toBe('organization.env_group.deleted');
  });

  it('filters org endpoints by subscribed events', () => {
    expect(shouldSendOrganizationWebhook(['organization.member.invited'], 'organization.member.invited')).toBe(true);
    expect(shouldSendOrganizationWebhook(['organization.member.added'], 'organization.member.invited')).toBe(false);
  });
});

describe('buildProjectWebhookPayload', () => {
  it('builds a stable JSON payload for deployment notifications', () => {
    const payload = buildProjectWebhookPayload({
      event: 'deployment.succeeded',
      project: {
        id: 'project-1',
        name: 'Neo Arcade',
        subdomain: 'neo-arcade',
        repoFullName: 'neo/neo-arcade'
      },
      deployment: {
        id: 'deployment-1',
        environment: 'preview',
        branch: 'feature/login',
        status: 'deployed',
        deploymentUrl: 'https://feature-login--neo-arcade.neopages.dev',
        commitSha: 'abc1234',
        previewAlias: 'feature-login--neo-arcade'
      }
    });

    expect(payload.event).toBe('deployment.succeeded');
    expect(payload.project.repoFullName).toBe('neo/neo-arcade');
    expect(payload.deployment.previewAlias).toBe('feature-login--neo-arcade');
  });
});

describe('buildOrganizationWebhookPayload', () => {
  it('builds a stable JSON payload for organization notifications', () => {
    const payload = buildOrganizationWebhookPayload({
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

    expect(payload.event).toBe('organization.member.invited');
    expect(payload.organization.slug).toBe('neo-labs');
    expect(payload.activity.summary).toContain('Invited');
  });
});

describe('signProjectWebhookPayload', () => {
  it('creates a sha256 signature header value', () => {
    expect(signProjectWebhookPayload('secret', '{"ok":true}')).toMatch(/^sha256=/);
  });
});
