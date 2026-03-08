import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProjectQuotaManager } from './project-quota-manager';
import { ProjectReleasePolicyManager } from './project-release-policy-manager';

describe('project governance inheritance cards', () => {
  it('shows inherited organization quota state', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectQuotaManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        organization: { id: 'org-1', name: 'Neo Labs' },
        initialUsage: {
          planTier: 'enterprise',
          monthlyBandwidthLimitBytes: 999,
          monthlyRequestLimit: 888,
          useOrganizationQuotas: true
        }
      })
    );

    expect(html).toContain('Neo Labs');
    expect(html).toContain('Use organization defaults');
  });

  it('shows inherited organization release-policy state', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectReleasePolicyManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        organization: { id: 'org-1', name: 'Neo Labs' },
        initialPolicy: {
          requirePromotionApproval: true,
          protectedBranches: ['main'],
          useOrganizationReleasePolicy: true
        }
      })
    );

    expect(html).toContain('Neo Labs');
    expect(html).toContain('Use organization defaults');
  });
});
