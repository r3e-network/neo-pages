// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectEnvVarsManager } from './project-env-vars-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('ProjectEnvVarsManager interactions', () => {
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

  it('shows a friendly error when env-var deletion hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectEnvVarsManager, {
          projectId: 'project-1',
          initialEnvVars: [
            {
              id: 'env-1',
              key: 'API_URL',
              environment: 'all',
              maskedValue: 'ht••••••••••',
              createdAt: '2026-03-07T00:00:00.000Z',
              updatedAt: '2026-03-07T00:00:00.000Z'
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

    expect(container.textContent).toContain('Failed to delete environment variable');
    expect(container.textContent).toContain('Delete');
  });

  it('keeps separate rows for the same key in different environments', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        envVar: {
          id: 'env-2',
          key: 'API_URL',
          environment: 'preview',
          maskedValue: 'ht••preview',
          createdAt: '2026-03-08T00:00:00.000Z',
          updatedAt: '2026-03-08T00:00:00.000Z'
        }
      })
    }));

    await act(async () => {
      root.render(
        React.createElement(ProjectEnvVarsManager, {
          projectId: 'project-1',
          initialEnvVars: [
            {
              id: 'env-1',
              key: 'API_URL',
              environment: 'all',
              maskedValue: 'ht••all',
              createdAt: '2026-03-07T00:00:00.000Z',
              updatedAt: '2026-03-07T00:00:00.000Z'
            }
          ]
        })
      );
    });

    const keyInput = findInput<HTMLInputElement>(container, '#env-key');
    const valueInput = findInput<HTMLInputElement>(container, '#env-value');
    const environmentSelect = container.querySelector('#env-environment') as HTMLSelectElement;
    const form = keyInput.closest('form');
    if (!form) {
      throw new Error('Unable to find env form');
    }

    await act(async () => {
      keyInput.value = 'API_URL';
      keyInput.dispatchEvent(new Event('input', { bubbles: true }));
      keyInput.dispatchEvent(new Event('change', { bubbles: true }));
      valueInput.value = 'https://preview-api.example.com';
      valueInput.dispatchEvent(new Event('input', { bubbles: true }));
      valueInput.dispatchEvent(new Event('change', { bubbles: true }));
      environmentSelect.value = 'preview';
      environmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('all · ht••all');
    expect(container.textContent).toContain('preview · ht••preview');
  });

  it('shows a friendly error when env-var creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectEnvVarsManager, {
          projectId: 'project-1',
          initialEnvVars: []
        })
      );
    });

    const keyInput = findInput<HTMLInputElement>(container, '#env-key');
    const valueInput = findInput<HTMLInputElement>(container, '#env-value');
    const form = keyInput.closest('form');
    if (!form) {
      throw new Error('Unable to find env form');
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

    expect(container.textContent).toContain('Failed to save environment variable');
    expect(container.textContent).toContain('Save variable');
  });
});
