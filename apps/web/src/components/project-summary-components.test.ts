import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children)
}));

import { ProjectActivityFeed } from './project-activity-feed';
import { ProjectCard } from './project-card';
import { ProjectUsageSummaryCard } from './project-usage-summary-card';
import { ProjectWebhookDeliveriesFeed } from './project-webhook-deliveries-feed';

describe('project summary components', () => {
  it('renders project activity feed entries', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectActivityFeed, {
        initialActivity: [
          {
            id: 'activity-1',
            eventType: 'deployment.succeeded',
            summary: 'Production deployment succeeded',
            metadata: null,
            createdAt: '2026-03-07T00:00:00.000Z'
          }
        ]
      })
    );

    expect(html).toContain('Recent project events');
    expect(html).toContain('Production deployment succeeded');
  });

  it('renders project webhook deliveries', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectWebhookDeliveriesFeed, {
        initialDeliveries: [
          {
            id: 'delivery-1',
            targetUrl: 'https://hooks.example.com/project',
            eventType: 'deployment.failed',
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

    expect(html).toContain('Recent outgoing delivery attempts');
    expect(html).toContain('deployment.failed');
    expect(html).toContain('upstream timeout');
  });

  it('renders project cards with drill-down links', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectCard, {
        project: {
          id: 'project-1',
          name: 'Neo Arcade',
          repo_full_name: 'neo/arcade',
          repo_url: 'https://github.com/neo/arcade',
          subdomain: 'neo-arcade',
          status: 'deployed',
          framework: 'nextjs',
          root_directory: '.',
          output_directory: 'out',
          install_command: null,
          build_command: null,
          default_branch: 'main',
          github_installation_id: null,
          github_repository_id: null,
          organization_id: null,
          use_organization_quotas: false,
          use_organization_release_policy: false,
          plan_tier: 'pro',
          monthly_bandwidth_limit_bytes: 8192,
          monthly_request_limit: 1000,
          container_id: 'container-1',
          deployment_url: 'https://neo-arcade.neopages.dev',
          created_at: '2026-03-07T00:00:00.000Z',
          updated_at: '2026-03-07T00:00:00.000Z',
          accessRole: 'owner',
          latestDeployment: {
            id: 'deployment-1',
            project_id: 'project-1',
            status: 'deployed',
            environment: 'production',
            preview_alias: null,
            branch: 'main',
            commit_sha: 'abc1234',
            commit_message: 'Ship home page',
            container_id: 'container-1',
            deployment_url: 'https://neo-arcade.neopages.dev',
            logs: null,
            created_at: '2026-03-07T00:00:00.000Z',
            started_at: '2026-03-07T00:00:05.000Z',
            finished_at: '2026-03-07T00:01:00.000Z'
          }
        }
      })
    );

    expect(html).toContain('neo/arcade');
    expect(html).toContain('Neo Arcade');
    expect(html).toContain('/projects/project-1');
    expect(html).toContain('Open latest');
  });

  it('renders project usage summary metrics', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectUsageSummaryCard, {
        usage: {
          requestCount: 125,
          bandwidthBytes: 3072,
          planTier: 'pro',
          monthlyBandwidthLimitBytes: 8192,
          monthlyRequestLimit: 1000
        }
      })
    );

    expect(html).toContain('Current month');
    expect(html).toContain('125');
    expect(html).toContain('Tier: pro');
  });
});
