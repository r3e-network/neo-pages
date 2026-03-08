import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GitHubConnectButton } from './github-connect-button';
import { MetricCard } from './metric-card';
import { OrganizationActivityFeed } from './organization-activity-feed';
import { OrganizationUsageSummaryCard } from './organization-usage-summary-card';
import { OrganizationWebhookDeliveriesFeed } from './organization-webhook-deliveries-feed';

describe('organization summary components', () => {
  it('renders organization activity items', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationActivityFeed, {
        initialActivity: [
          {
            id: 'activity-1',
            eventType: 'organization.member.added',
            summary: 'Added octocat to Neo Labs',
            metadata: null,
            createdAt: '2026-03-07T00:00:00.000Z'
          }
        ]
      })
    );

    expect(html).toContain('Recent organization events');
    expect(html).toContain('Added octocat to Neo Labs');
  });

  it('renders organization usage totals', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationUsageSummaryCard, {
        usage: {
          projectCount: 3,
          liveProjectCount: 2,
          requestCount: 125,
          bandwidthBytes: 3072
        }
      })
    );

    expect(html).toContain('Organization usage this month');
    expect(html).toContain('125');
    expect(html).toContain('3.0 KB');
  });

  it('renders organization webhook deliveries', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationWebhookDeliveriesFeed, {
        initialDeliveries: [
          {
            id: 'delivery-1',
            targetUrl: 'https://hooks.example.com/org',
            eventType: 'organization.member.invited',
            status: 'failed',
            attemptCount: 2,
            lastResponseStatus: 500,
            lastError: 'upstream timeout',
            nextRetryAt: '2026-03-07T01:00:00.000Z',
            deliveredAt: null,
            deadLetteredAt: null,
            createdAt: '2026-03-07T00:00:00.000Z'
          }
        ]
      })
    );

    expect(html).toContain('Recent outgoing attempts');
    expect(html).toContain('organization.member.invited');
    expect(html).toContain('upstream timeout');
  });

  it('renders metric cards', () => {
    const html = renderToStaticMarkup(React.createElement(MetricCard, { label: 'Projects', value: 3, hint: 'Org-owned projects' }));

    expect(html).toContain('Projects');
    expect(html).toContain('3');
    expect(html).toContain('Org-owned projects');
  });

  it('renders the signed-in GitHub app install CTA', () => {
    const html = renderToStaticMarkup(React.createElement(GitHubConnectButton, { signedIn: true, appEnabled: true }));

    expect(html).toContain('/api/github/install');
    expect(html).toContain('Install NeoPages GitHub App');
  });
});
