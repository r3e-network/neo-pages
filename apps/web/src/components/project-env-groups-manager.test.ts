import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProjectEnvGroupsManager } from './project-env-groups-manager';

describe('ProjectEnvGroupsManager', () => {
  it('shows organization inheritance context and group scope labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectEnvGroupsManager, {
        projectId: 'project-1',
        accessRole: 'owner',
        organization: {
          id: 'org-1',
          name: 'Neo Labs'
        },
        initialGroups: [
          {
            id: 'group-org',
            name: 'Shared API',
            description: 'Managed at the organization level',
            attached: true,
            scope: 'organization',
            organizationId: 'org-1',
            items: []
          },
          {
            id: 'group-personal',
            name: 'Personal Preview',
            description: null,
            attached: false,
            scope: 'personal',
            organizationId: null,
            items: []
          }
        ]
      })
    );

    expect(html).toContain('Neo Labs');
    expect(html).toContain('Project variables override environment groups when the same key exists.');
    expect(html).toContain('Organization group');
    expect(html).toContain('Personal group');
  });
});
