// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AcceptCollaboratorInviteCard } from './accept-collaborator-invite-card';
import { AcceptOrganizationInviteCard } from './accept-organization-invite-card';

describe('Invite acceptance cards', () => {
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

  it('syncs invite status updates into the rendered message and disabled state', async () => {
    await act(async () => {
      root.render(
        React.createElement(AcceptCollaboratorInviteCard, {
          token: 'invite-token',
          email: 'teammate@example.com',
          status: 'pending'
        })
      );
    });

    expect(container.textContent).toContain('Accept invitation');

    await act(async () => {
      root.render(
        React.createElement(AcceptCollaboratorInviteCard, {
          token: 'invite-token',
          email: 'teammate@example.com',
          status: 'accepted'
        })
      );
    });

    expect(container.textContent).toContain('Invitation is accepted.');
    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('shows a friendly error when collaborator invite acceptance hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(AcceptCollaboratorInviteCard, {
          token: 'invite-token',
          email: 'teammate@example.com',
          status: 'pending'
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Accept invitation');
    if (!button) {
      throw new Error('Unable to find collaborator accept button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to accept invitation');
    expect(container.textContent).toContain('Accept invitation');
  });

  it('shows a friendly error when organization invite acceptance hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(AcceptOrganizationInviteCard, {
          token: 'invite-token',
          email: 'teammate@example.com',
          status: 'pending'
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Accept invitation');
    if (!button) {
      throw new Error('Unable to find organization accept button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to accept invitation');
    expect(container.textContent).toContain('Accept invitation');
  });
});
