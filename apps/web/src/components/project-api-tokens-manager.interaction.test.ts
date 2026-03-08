// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectApiTokensManager } from './project-api-tokens-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('ProjectApiTokensManager interactions', () => {
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

  it('shows a friendly error when token deletion hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectApiTokensManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          initialTokens: [
            {
              id: 'token-1',
              label: 'CI token',
              tokenPrefix: 'npt_abc123',
              scopes: ['project:read'],
              createdAt: '2026-03-07T00:00:00.000Z',
              lastUsedAt: null
            }
          ]
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Delete');
    if (!button) {
      throw new Error('Unable to find delete button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to delete API token');
    expect(container.textContent).toContain('Delete');
  });

  it('shows a friendly error when token creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectApiTokensManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          initialTokens: []
        })
      );
    });

    const labelInput = findInput<HTMLInputElement>(container, '#token-label');
    const form = labelInput.closest('form');
    if (!form) {
      throw new Error('Unable to find token form');
    }

    await act(async () => {
      labelInput.value = 'CI token';
      labelInput.dispatchEvent(new Event('input', { bubbles: true }));
      labelInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to create API token');
    expect(container.textContent).toContain('Create token');
  });
});
