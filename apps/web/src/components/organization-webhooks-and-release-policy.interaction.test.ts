// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationWebhooksManager } from './organization-webhooks-manager';
import { ProjectReleasePolicyManager } from './project-release-policy-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('Organization webhooks and release policy managers', () => {
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

  it('shows a friendly error when organization webhook deletion hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(OrganizationWebhooksManager, {
          organizationId: 'org-1',
          canManage: true,
          initialEndpoints: [
            {
              id: 'endpoint-1',
              targetUrl: 'https://hooks.example.com/org',
              hasSecret: false,
              payloadFormat: 'json',
              events: ['organization.member.invited'],
              createdAt: '2026-03-07T00:00:00.000Z',
              updatedAt: '2026-03-07T00:00:00.000Z'
            }
          ]
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Delete');
    if (!button) {
      throw new Error('Unable to find org webhook delete button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to delete webhook endpoint');
    expect(container.textContent).toContain('Delete');
  });

  it('shows a friendly error when organization webhook creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(OrganizationWebhooksManager, {
          organizationId: 'org-1',
          canManage: true,
          initialEndpoints: []
        })
      );
    });

    const urlInput = findInput<HTMLInputElement>(container, '#org-webhook-url-org-1');
    const form = urlInput.closest('form');
    if (!form) {
      throw new Error('Unable to find org webhook form');
    }

    await act(async () => {
      urlInput.value = 'https://hooks.example.com/org';
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
      urlInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to save webhook endpoint');
    expect(container.textContent).toContain('Save webhook');
  });

  it('shows a friendly error when release policy save hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectReleasePolicyManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          initialPolicy: {
            requirePromotionApproval: true,
            protectedBranches: ['main'],
            useOrganizationReleasePolicy: false
          }
        })
      );
    });

    const form = container.querySelector('form');
    if (!form) {
      throw new Error('Unable to find release policy form');
    }

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to save release policy');
    expect(container.textContent).toContain('Save release policy');
  });
});
