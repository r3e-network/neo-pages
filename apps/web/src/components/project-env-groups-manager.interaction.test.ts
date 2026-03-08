// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectEnvGroupsManager } from './project-env-groups-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('ProjectEnvGroupsManager interactions', () => {
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

  it('shows a friendly error when attach toggling hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectEnvGroupsManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          organization: { id: 'org-1', name: 'Neo Labs' },
          initialGroups: [
            {
              id: 'group-1',
              name: 'Shared API',
              description: null,
              attached: false,
              scope: 'personal',
              organizationId: null,
              items: []
            }
          ]
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Attach');
    if (!button) {
      throw new Error('Unable to find attach button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to update environment group attachment');
    expect(container.textContent).toContain('Attach');
  });

  it('shows a friendly error when saving a group variable hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectEnvGroupsManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          organization: { id: 'org-1', name: 'Neo Labs' },
          initialGroups: [
            {
              id: 'group-1',
              name: 'Shared API',
              description: null,
              attached: true,
              scope: 'personal',
              organizationId: null,
              items: []
            }
          ]
        })
      );
    });

    const editButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Edit this group');
    if (!editButton) {
      throw new Error('Unable to find edit button');
    }

    await act(async () => {
      editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const keyInput = findInput<HTMLInputElement>(container, '#group-item-key-group-1');
    const valueInput = findInput<HTMLInputElement>(container, '#group-item-value-group-1');
    const form = keyInput.closest('form');
    if (!form) {
      throw new Error('Unable to find save variable form');
    }

    await act(async () => {
      keyInput.value = 'API_URL';
      keyInput.dispatchEvent(new Event('input', { bubbles: true }));
      keyInput.dispatchEvent(new Event('change', { bubbles: true }));
      valueInput.value = 'https://api.example.com';
      valueInput.dispatchEvent(new Event('input', { bubbles: true }));
      valueInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to save group variable');
    expect(container.textContent).toContain('Save group variable');
  });

  it('shows a friendly error when group creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectEnvGroupsManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          organization: { id: 'org-1', name: 'Neo Labs' },
          initialGroups: []
        })
      );
    });

    const nameInput = findInput<HTMLInputElement>(container, '#group-name');
    const form = nameInput.closest('form');
    if (!form) {
      throw new Error('Unable to find create group form');
    }

    await act(async () => {
      nameInput.value = 'Shared API';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to create environment group');
    expect(container.textContent).toContain('Create group');
  });
});
