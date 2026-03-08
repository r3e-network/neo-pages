// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectWebhooksManager } from './project-webhooks-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('ProjectWebhooksManager interactions', () => {
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

  it('shows a friendly error when webhook deletion hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectWebhooksManager, {
          projectId: 'project-1',
          initialEndpoints: [
            {
              id: 'endpoint-1',
              targetUrl: 'https://hooks.example.com/neopages',
              hasSecret: false,
              payloadFormat: 'json',
              events: ['deployment.succeeded'],
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

    expect(container.textContent).toContain('Failed to delete webhook endpoint');
    expect(container.textContent).toContain('Delete');
  });

  it('shows a friendly error when webhook creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectWebhooksManager, {
          projectId: 'project-1',
          initialEndpoints: []
        })
      );
    });

    const targetInput = findInput<HTMLInputElement>(container, '#webhook-url');
    const form = targetInput.closest('form');
    if (!form) {
      throw new Error('Unable to find webhook form');
    }

    await act(async () => {
      targetInput.value = 'https://hooks.example.com/neopages';
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      targetInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to save webhook endpoint');
    expect(container.textContent).toContain('Save webhook');
  });
});
