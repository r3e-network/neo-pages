// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectCollaboratorsManager } from './project-collaborators-manager';
import { ProjectCollaboratorInvitesManager } from './project-collaborator-invites-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('Project collaboration managers', () => {
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

  it('shows a friendly error when collaborator removal hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectCollaboratorsManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          initialCollaborators: [
            {
              collaboratorId: 'user-2',
              githubLogin: 'octocat',
              role: 'viewer',
              createdAt: '2026-03-07T00:00:00.000Z'
            }
          ]
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Remove');
    if (!button) {
      throw new Error('Unable to find remove collaborator button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to remove collaborator');
    expect(container.textContent).toContain('Remove');
  });

  it('shows a friendly error when collaborator add hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectCollaboratorsManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          initialCollaborators: []
        })
      );
    });

    const loginInput = findInput<HTMLInputElement>(container, '#collaborator-login');
    const form = loginInput.closest('form');
    if (!form) {
      throw new Error('Unable to find collaborator form');
    }

    await act(async () => {
      loginInput.value = 'octocat';
      loginInput.dispatchEvent(new Event('input', { bubbles: true }));
      loginInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to add collaborator');
    expect(container.textContent).toContain('Add collaborator');
  });

  it('shows a friendly error when invite revocation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectCollaboratorInvitesManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          initialInvites: [
            {
              id: 'invite-1',
              email: 'teammate@example.com',
              role: 'viewer',
              status: 'pending',
              inviteUrl: 'https://example.com/invite/1',
              createdAt: '2026-03-07T00:00:00.000Z',
              respondedAt: null
            }
          ]
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Revoke');
    if (!button) {
      throw new Error('Unable to find revoke invite button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to revoke invitation');
    expect(container.textContent).toContain('Revoke');
  });

  it('shows a friendly error when invite creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectCollaboratorInvitesManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          initialInvites: []
        })
      );
    });

    const emailInput = findInput<HTMLInputElement>(container, '#invite-email');
    const form = emailInput.closest('form');
    if (!form) {
      throw new Error('Unable to find invite form');
    }

    await act(async () => {
      emailInput.value = 'teammate@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to create collaborator invite');
    expect(container.textContent).toContain('Create invite');
  });
});
