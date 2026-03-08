import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OrganizationsManager } from './organizations-manager';

describe('OrganizationsManager', () => {
  it('renders organization-scoped environment groups in the dashboard', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationsManager, {
        initialOrganizations: [
          {
            id: 'org-1',
            name: 'Neo Labs',
            slug: 'neo-labs',
            role: 'owner',
            planTier: 'pro',
            monthlyBandwidthLimitBytes: 100,
            monthlyRequestLimit: 50,
            requirePromotionApproval: true,
            protectedBranches: ['main'],
            usage: { projectCount: 0, liveProjectCount: 0, requestCount: 0, bandwidthBytes: 0 },
            projects: [],
            members: [],
            invites: [],
            activity: [],
            webhooks: [],
            webhookDeliveries: [],
            envGroups: [
              {
                id: 'group-1',
                name: 'Shared Endpoints',
                description: 'Reusable defaults',
                items: [
                  {
                    id: 'item-1',
                    key: 'API_URL',
                    environment: 'production',
                    maskedValue: 'ht••••••••••'
                  }
                ]
              }
            ]
          }
        ]
      })
    );

    expect(html).toContain('Organization env groups');
    expect(html).toContain('Shared Endpoints');
    expect(html).toContain('API_URL');
  });

  it('renders organization members management', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationsManager, {
        initialOrganizations: [
          {
            id: 'org-1',
            name: 'Neo Labs',
            slug: 'neo-labs',
            role: 'owner',
            planTier: 'pro',
            monthlyBandwidthLimitBytes: 100,
            monthlyRequestLimit: 50,
            requirePromotionApproval: true,
            protectedBranches: ['main'],
            usage: { projectCount: 0, liveProjectCount: 0, requestCount: 0, bandwidthBytes: 0 },
            projects: [],
            members: [
              {
                memberId: 'user-2',
                githubLogin: 'octocat',
                role: 'member',
                createdAt: '2026-03-07T00:00:00.000Z'
              }
            ],
            invites: [],
            activity: [],
            webhooks: [],
            webhookDeliveries: [],
            envGroups: []
          }
        ]
      })
    );

    expect(html).toContain('Members');
    expect(html).toContain('octocat');
    expect(html).toContain('Add member');
  });

  it('renders organization invite management', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationsManager, {
        initialOrganizations: [
          {
            id: 'org-1',
            name: 'Neo Labs',
            slug: 'neo-labs',
            role: 'owner',
            planTier: 'pro',
            monthlyBandwidthLimitBytes: 100,
            monthlyRequestLimit: 50,
            requirePromotionApproval: true,
            protectedBranches: ['main'],
            usage: { projectCount: 0, liveProjectCount: 0, requestCount: 0, bandwidthBytes: 0 },
            projects: [],
            members: [],
            invites: [
              {
                id: 'invite-1',
                email: 'invitee@example.com',
                role: 'member',
                status: 'pending',
                inviteUrl: 'http://localhost:3000/organization-invites/token-1',
                inviteToken: 'token-1',
                createdAt: '2026-03-07T00:00:00.000Z',
                respondedAt: null
              }
            ],
            activity: [],
            webhooks: [],
            webhookDeliveries: [],
            envGroups: []
          }
        ]
      })
    );

    expect(html).toContain('Invitations');
    expect(html).toContain('invitee@example.com');
    expect(html).toContain('Create invite');
  });

  it('renders organization activity feed', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationsManager, {
        initialOrganizations: [
          {
            id: 'org-1',
            name: 'Neo Labs',
            slug: 'neo-labs',
            role: 'owner',
            planTier: 'pro',
            monthlyBandwidthLimitBytes: 100,
            monthlyRequestLimit: 50,
            requirePromotionApproval: true,
            protectedBranches: ['main'],
            usage: { projectCount: 0, liveProjectCount: 0, requestCount: 0, bandwidthBytes: 0 },
            projects: [],
            members: [],
            invites: [],
            activity: [
              {
                id: 'activity-1',
                eventType: 'organization.member.added',
                summary: 'Added octocat to the organization',
                metadata: null,
                createdAt: '2026-03-07T00:00:00.000Z'
              }
            ],
            webhooks: [],
            webhookDeliveries: [],
            envGroups: []
          }
        ]
      })
    );

    expect(html).toContain('Activity');
    expect(html).toContain('Added octocat to the organization');
  });

  it('renders organization webhook management', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationsManager, {
        initialOrganizations: [
          {
            id: 'org-1',
            name: 'Neo Labs',
            slug: 'neo-labs',
            role: 'owner',
            planTier: 'pro',
            monthlyBandwidthLimitBytes: 100,
            monthlyRequestLimit: 50,
            requirePromotionApproval: true,
            protectedBranches: ['main'],
            usage: { projectCount: 0, liveProjectCount: 0, requestCount: 0, bandwidthBytes: 0 },
            projects: [],
            members: [],
            invites: [],
            activity: [],
            webhooks: [
              {
                id: 'endpoint-1',
                targetUrl: 'https://hooks.example.com/org',
                hasSecret: false,
                payloadFormat: 'json',
                events: ['organization.member.invited'],
                createdAt: '2026-03-07T00:00:00.000Z',
                updatedAt: '2026-03-07T00:00:00.000Z'
              }
            ],
            webhookDeliveries: [
              {
                id: 'delivery-1',
                targetUrl: 'https://hooks.example.com/org',
                eventType: 'organization.member.invited',
                status: 'succeeded',
                attemptCount: 1,
                lastResponseStatus: 200,
                lastError: null,
                nextRetryAt: null,
                deliveredAt: '2026-03-07T00:00:02.000Z',
                deadLetteredAt: null,
                createdAt: '2026-03-07T00:00:01.000Z'
              }
            ],
            envGroups: []
          }
        ]
      })
    );

    expect(html).toContain('Activity webhooks');
    expect(html).toContain('https://hooks.example.com/org');
    expect(html).toContain('Webhook deliveries');
  });

  it('renders organization portfolio summary', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationsManager, {
        initialOrganizations: [
          {
            id: 'org-1',
            name: 'Neo Labs',
            slug: 'neo-labs',
            role: 'owner',
            planTier: 'pro',
            monthlyBandwidthLimitBytes: 100,
            monthlyRequestLimit: 50,
            requirePromotionApproval: true,
            protectedBranches: ['main'],
            usage: { projectCount: 3, liveProjectCount: 2, requestCount: 125, bandwidthBytes: 3072 },
            projects: [
              {
                id: 'project-1',
                name: 'Arcade',
                repoFullName: 'neo/arcade',
                framework: 'nextjs',
                status: 'deployed',
                latestStatus: 'deployed',
                latestCommitMessage: 'ship it',
                deploymentUrl: 'https://arcade.neopages.dev'
              }
            ],
            members: [],
            invites: [],
            activity: [],
            webhooks: [],
            webhookDeliveries: [],
            envGroups: []
          }
        ]
      })
    );

    expect(html).toContain('Portfolio');
    expect(html).toContain('3');
    expect(html).toContain('125');
    expect(html).toContain('Projects');
    expect(html).toContain('Active preset: All');
    expect(html).toContain('Search projects');
    expect(html).toContain('Reset filters');
    expect(html).toContain('All');
    expect(html).toContain('Failures');
    expect(html).toContain('Live');
    expect(html).toContain('A-Z');
    expect(html).toContain('Status');
    expect(html).toContain('Sort');
    expect(html).toContain('Arcade');
    expect(html).toContain('/projects/project-1');
  });
});
