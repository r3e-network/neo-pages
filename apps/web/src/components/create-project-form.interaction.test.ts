// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

import { CreateProjectForm } from './create-project-form';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('CreateProjectForm interactions', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    refreshMock.mockReset();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
  });

  it('shows the API error when installations loading fails while configured', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ ok: false, configured: true, error: 'Authentication required', installations: [] })
      })
      .mockResolvedValueOnce({
        json: async () => ({ organizations: [] })
      });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(React.createElement(CreateProjectForm));
    });

    expect(container.textContent).toContain('Authentication required');
    expect(container.textContent).not.toContain('no synced installations are available yet');
  });

  it('auto-detects the default branch from cached repositories', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          configured: true,
          installations: [
            {
              installationId: 1,
              accountLogin: 'neo',
              repositories: [
                { id: 10, fullName: 'neo/arcade', defaultBranch: 'develop' }
              ]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({ organizations: [] })
      });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(React.createElement(CreateProjectForm));
    });

    await act(async () => {
      await Promise.resolve();
    });

    const repoInput = findInput<HTMLInputElement>(container, '#repoFullName');
    const branchInput = findInput<HTMLInputElement>(container, '#defaultBranch');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(repoInput, 'neo/arcade');
      repoInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(branchInput.value).toBe('develop');
  });

  it('keeps the refresh summary visible after a successful repo cache refresh', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          configured: true,
          installations: [
            {
              installationId: 1,
              accountLogin: 'neo',
              repositories: [
                { id: 10, fullName: 'neo/arcade', defaultBranch: 'main' }
              ]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({ organizations: [] })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          configured: true,
          summary: { refreshedInstallations: 1, refreshedRepositories: 2 },
          installations: [
            {
              installationId: 1,
              accountLogin: 'neo',
              repositories: [
                { id: 10, fullName: 'neo/arcade', defaultBranch: 'main' },
                { id: 11, fullName: 'neo/docs', defaultBranch: 'develop' }
              ]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          configured: true,
          installations: [
            {
              installationId: 1,
              accountLogin: 'neo',
              repositories: [
                { id: 10, fullName: 'neo/arcade', defaultBranch: 'main' },
                { id: 11, fullName: 'neo/docs', defaultBranch: 'develop' }
              ]
            }
          ]
        })
      });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(React.createElement(CreateProjectForm));
    });

    const refreshButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.includes('Refresh repository cache'));
    if (!refreshButton) {
      throw new Error('Unable to find refresh repository cache button');
    }

    await act(async () => {
      refreshButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Refreshed 1 installation cache(s) and 2 repositories.');
  });

  it('resets the form and refreshes the router after a successful project submission', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ configured: false, installations: [] }) })
      .mockResolvedValueOnce({ json: async () => ({ organizations: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: { id: 'project-1', subdomain: 'neo-arcade' } })
      });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(React.createElement(CreateProjectForm));
    });

    const nameInput = findInput<HTMLInputElement>(container, '#name');
    const repoInput = findInput<HTMLInputElement>(container, '#repoFullName');
    const branchInput = findInput<HTMLInputElement>(container, '#defaultBranch');
    const rootDirectoryInput = findInput<HTMLInputElement>(container, '#rootDirectory');
    const form = container.querySelector('form');
    if (!form) {
      throw new Error('Unable to find create project form');
    }

    await act(async () => {
      nameInput.value = 'Neo Arcade';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      repoInput.value = 'neo/arcade';
      repoInput.dispatchEvent(new Event('input', { bubbles: true }));
      repoInput.dispatchEvent(new Event('change', { bubbles: true }));
      branchInput.value = 'main';
      branchInput.dispatchEvent(new Event('input', { bubbles: true }));
      branchInput.dispatchEvent(new Event('change', { bubbles: true }));
      rootDirectoryInput.value = 'apps/web';
      rootDirectoryInput.dispatchEvent(new Event('input', { bubbles: true }));
      rootDirectoryInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Project queued: neo-arcade');
    expect(nameInput.value).toBe('');
    expect(repoInput.value).toBe('');
    expect(branchInput.value).toBe('main');
    expect(rootDirectoryInput.value).toBe('.');
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('shows a friendly error when project creation hits a network failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ configured: false, installations: [] })
      })
      .mockResolvedValueOnce({
        json: async () => ({ organizations: [] })
      })
      .mockRejectedValueOnce(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(React.createElement(CreateProjectForm));
    });

    const nameInput = findInput<HTMLInputElement>(container, '#name');
    const repoInput = findInput<HTMLInputElement>(container, '#repoFullName');
    const branchInput = findInput<HTMLInputElement>(container, '#defaultBranch');
    const rootDirectoryInput = findInput<HTMLInputElement>(container, '#rootDirectory');
    const form = container.querySelector('form');
    if (!form) {
      throw new Error('Unable to find create project form');
    }

    await act(async () => {
      nameInput.value = 'Neo Arcade';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      repoInput.value = 'neo/arcade';
      repoInput.dispatchEvent(new Event('input', { bubbles: true }));
      repoInput.dispatchEvent(new Event('change', { bubbles: true }));
      branchInput.value = 'main';
      branchInput.dispatchEvent(new Event('input', { bubbles: true }));
      branchInput.dispatchEvent(new Event('change', { bubbles: true }));
      rootDirectoryInput.value = '.';
      rootDirectoryInput.dispatchEvent(new Event('input', { bubbles: true }));
      rootDirectoryInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to create project');
    expect(container.textContent).toContain('Deploy project');
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
