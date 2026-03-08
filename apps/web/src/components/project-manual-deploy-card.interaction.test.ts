// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

import { ProjectManualDeployCard } from './project-manual-deploy-card';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('ProjectManualDeployCard interactions', () => {
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

  it('shows a friendly error when manual deploy queueing hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectManualDeployCard, {
          projectId: 'project-1',
          defaultBranch: 'main',
          accessRole: 'owner'
        })
      );
    });

    const branchInput = findInput<HTMLInputElement>(container, '#manual-branch');
    const form = branchInput.closest('form');
    if (!form) {
      throw new Error('Unable to find manual deploy form');
    }

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to queue deployment');
    expect(container.textContent).toContain('Redeploy production');
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
