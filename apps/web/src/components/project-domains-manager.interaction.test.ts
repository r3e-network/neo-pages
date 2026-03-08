// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectDomainsManager } from './project-domains-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('ProjectDomainsManager interactions', () => {
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

  it('shows a friendly error when domain verification hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectDomainsManager, {
          projectId: 'project-1',
          initialDomains: [
            {
              id: 'domain-1',
              host: 'app.example.com',
              verification_token: 'txt-token',
              verified_at: null,
              verification_error: null,
              verificationHostname: '_neopages.app.example.com',
              routingTarget: 'cname.neopages.dev',
              dnsConfigured: false
            }
          ]
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Verify DNS');
    if (!button) {
      throw new Error('Unable to find verify button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Domain verification failed');
    expect(container.textContent).toContain('Verify DNS');
  });

  it('shows a friendly error when custom domain creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectDomainsManager, {
          projectId: 'project-1',
          initialDomains: []
        })
      );
    });

    const hostInput = findInput<HTMLInputElement>(container, '#domain-host');
    const form = hostInput.closest('form');
    if (!form) {
      throw new Error('Unable to find domain form');
    }

    await act(async () => {
      hostInput.value = 'app.example.com';
      hostInput.dispatchEvent(new Event('input', { bubbles: true }));
      hostInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to add custom domain');
    expect(container.textContent).toContain('Add custom domain');
  });
});
