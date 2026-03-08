// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectDeploymentsLive } from './project-deployments-live';

function findSelect(container: HTMLElement, labelText: string) {
  const label = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent?.includes(labelText));
  const select = label?.querySelector('select');
  if (!select) {
    throw new Error(`Unable to find select for: ${labelText}`);
  }

  return select as HTMLSelectElement;
}

describe('ProjectDeploymentsLive interactions', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('filters visible deployments by environment and status', async () => {
    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentsLive, {
          projectId: 'project-1',
          requireApproval: false,
          initialDeployments: [
            {
              id: 'deployment-1',
              status: 'deployed',
              environment: 'production',
              preview_alias: null,
              branch: 'main',
              commit_sha: 'abc1234',
              commit_message: 'Ship home page',
              container_id: 'container-1',
              deployment_url: 'https://app.neopages.dev',
              logs: 'done',
              created_at: '2026-03-07T01:03:00.000Z',
              started_at: '2026-03-07T01:00:00.000Z',
              finished_at: '2026-03-07T01:02:05.000Z'
            },
            {
              id: 'deployment-2',
              status: 'failed',
              environment: 'preview',
              preview_alias: 'preview-2',
              branch: 'feature/docs',
              commit_sha: 'def5678',
              commit_message: 'Preview docs',
              container_id: null,
              deployment_url: null,
              logs: 'failed',
              created_at: '2026-03-07T02:03:00.000Z',
              started_at: '2026-03-07T02:00:00.000Z',
              finished_at: '2026-03-07T02:00:45.000Z'
            }
          ]
        })
      );
    });

    const environmentSelect = findSelect(container, 'Environment');
    const statusSelect = findSelect(container, 'Status');

    await act(async () => {
      environmentSelect.value = 'preview';
      environmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
      statusSelect.value = 'failed';
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Preview docs');
    expect(container.textContent).not.toContain('Ship home page');
  });

  it('syncs displayed deployments when initialDeployments props change', async () => {
    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentsLive, {
          projectId: 'project-1',
          requireApproval: false,
          initialDeployments: [
            {
              id: 'deployment-1',
              status: 'deployed',
              environment: 'production',
              preview_alias: null,
              branch: 'main',
              commit_sha: 'abc1234',
              commit_message: 'Ship home page',
              container_id: 'container-1',
              deployment_url: 'https://app.neopages.dev',
              logs: 'done',
              created_at: '2026-03-07T01:03:00.000Z',
              started_at: '2026-03-07T01:00:00.000Z',
              finished_at: '2026-03-07T01:02:05.000Z'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('Ship home page');

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentsLive, {
          projectId: 'project-1',
          requireApproval: false,
          initialDeployments: [
            {
              id: 'deployment-2',
              status: 'failed',
              environment: 'preview',
              preview_alias: 'preview-2',
              branch: 'feature/docs',
              commit_sha: 'def5678',
              commit_message: 'Preview docs',
              container_id: null,
              deployment_url: null,
              logs: 'failed',
              created_at: '2026-03-07T02:03:00.000Z',
              started_at: '2026-03-07T02:00:00.000Z',
              finished_at: '2026-03-07T02:00:45.000Z'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('Preview docs');
    expect(container.textContent).not.toContain('Ship home page');
  });

  it('shows duration metadata for started and finished deployments', async () => {
    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentsLive, {
          projectId: 'project-1',
          requireApproval: false,
          initialDeployments: [
            {
              id: 'deployment-1',
              status: 'deployed',
              environment: 'production',
              preview_alias: null,
              branch: 'main',
              commit_sha: 'abc1234',
              commit_message: 'Ship home page',
              container_id: 'container-1',
              deployment_url: 'https://app.neopages.dev',
              logs: 'done',
              created_at: '2026-03-07T01:03:00.000Z',
              started_at: '2026-03-07T01:00:00.000Z',
              finished_at: '2026-03-07T01:02:05.000Z'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('2m 5s');
  });
});
