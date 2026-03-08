// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectDeploymentArtifactsBrowser } from './project-deployment-artifacts-browser';

function findSelect(container: HTMLElement) {
  const select = container.querySelector('select');
  if (!select) {
    throw new Error('Unable to find deployment select');
  }

  return select as HTMLSelectElement;
}

describe('ProjectDeploymentArtifactsBrowser interactions', () => {
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

  it('shows a friendly error when artifact loading hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentArtifactsBrowser, {
          projectId: 'project-1',
          deployments: [
            {
              id: 'deployment-1',
              commitMessage: 'Ship home page',
              environment: 'production',
              branch: 'main',
              status: 'deployed'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('Failed to load artifacts');
  });

  it('clears stale artifacts when switching deployments and the next load fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifacts: [
            {
              id: 'artifact-1',
              path: 'index.html',
              sizeBytes: 512,
              contentType: 'text/html',
              downloadUrl: 'https://app.neopages.dev'
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to load artifacts' })
      });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentArtifactsBrowser, {
          projectId: 'project-1',
          deployments: [
            {
              id: 'deployment-1',
              commitMessage: 'Ship home page',
              environment: 'production',
              branch: 'main',
              status: 'deployed'
            },
            {
              id: 'deployment-2',
              commitMessage: 'Preview docs',
              environment: 'preview',
              branch: 'feature/docs',
              status: 'deployed'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('index.html');

    const select = findSelect(container);

    await act(async () => {
      select.value = 'deployment-2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to load artifacts');
    expect(container.textContent).not.toContain('index.html');
  });

  it('resets the selected deployment when the deployed options change', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifacts: [
            {
              id: 'artifact-1',
              path: 'index.html',
              sizeBytes: 512,
              contentType: 'text/html',
              downloadUrl: 'https://app.neopages.dev'
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifacts: [
            {
              id: 'artifact-2',
              path: 'assets/app.js',
              sizeBytes: 2048,
              contentType: 'application/javascript',
              downloadUrl: 'https://preview.neopages.dev/assets/app.js'
            }
          ]
        })
      });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentArtifactsBrowser, {
          projectId: 'project-1',
          deployments: [
            {
              id: 'deployment-1',
              commitMessage: 'Ship home page',
              environment: 'production',
              branch: 'main',
              status: 'deployed'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('index.html');

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentArtifactsBrowser, {
          projectId: 'project-1',
          deployments: [
            {
              id: 'deployment-2',
              commitMessage: 'Preview docs',
              environment: 'preview',
              branch: 'feature/docs',
              status: 'deployed'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('assets/app.js');
    expect(container.textContent).not.toContain('index.html');
  });

  it('clears stale messages when there are no successful deployments left', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to load artifacts' })
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentArtifactsBrowser, {
          projectId: 'project-1',
          deployments: [
            {
              id: 'deployment-1',
              commitMessage: 'Ship home page',
              environment: 'production',
              branch: 'main',
              status: 'deployed'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('Failed to load artifacts');

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentArtifactsBrowser, {
          projectId: 'project-1',
          deployments: [
            {
              id: 'deployment-2',
              commitMessage: 'Build queued',
              environment: 'preview',
              branch: 'feature/docs',
              status: 'queued'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('No successful deployments yet.');
    expect(container.textContent).not.toContain('Failed to load artifacts');
  });

  it('loads artifacts for the selected deployment', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifacts: [
            {
              id: 'artifact-1',
              path: 'index.html',
              sizeBytes: 512,
              contentType: 'text/html',
              downloadUrl: 'https://app.neopages.dev'
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifacts: [
            {
              id: 'artifact-2',
              path: 'assets/app.js',
              sizeBytes: 2048,
              contentType: 'application/javascript',
              downloadUrl: 'https://preview.neopages.dev/assets/app.js'
            }
          ]
        })
      });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploymentArtifactsBrowser, {
          projectId: 'project-1',
          deployments: [
            {
              id: 'deployment-1',
              commitMessage: 'Ship home page',
              environment: 'production',
              branch: 'main',
              status: 'deployed'
            },
            {
              id: 'deployment-2',
              commitMessage: 'Preview docs',
              environment: 'preview',
              branch: 'feature/docs',
              status: 'deployed'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('index.html');
    expect(container.textContent).not.toContain('assets/app.js');

    const select = findSelect(container);

    await act(async () => {
      select.value = 'deployment-2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('assets/app.js');
    expect(container.textContent).not.toContain('index.html');
  });
});
