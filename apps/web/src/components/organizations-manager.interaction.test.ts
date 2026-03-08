// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationsManager } from './organizations-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

function baseOrganization() {
  return {
    id: 'org-1',
    name: 'Neo Labs',
    slug: 'neo-labs',
    role: 'owner' as const,
    planTier: 'pro' as const,
    monthlyBandwidthLimitBytes: 1024,
    monthlyRequestLimit: 100,
    requirePromotionApproval: true,
    protectedBranches: ['main'],
    usage: {
      projectCount: 1,
      liveProjectCount: 1,
      requestCount: 10,
      bandwidthBytes: 2048
    },
    projects: [],
    members: [
      {
        memberId: 'user-2',
        githubLogin: 'octocat',
        role: 'member' as const,
        createdAt: '2026-03-07T00:00:00.000Z'
      }
    ],
    invites: [
      {
        id: 'invite-1',
        email: 'teammate@example.com',
        role: 'member' as const,
        status: 'pending' as const,
        inviteUrl: 'https://example.com/invite/1',
        inviteToken: 'token-1',
        createdAt: '2026-03-07T00:00:00.000Z',
        respondedAt: null
      }
    ],
    activity: [],
    webhooks: [],
    webhookDeliveries: [],
    envGroups: [
      {
        id: 'group-1',
        name: 'Shared Endpoints',
        description: 'Reusable defaults',
        items: []
      }
    ]
  };
}

describe('OrganizationsManager interactions', () => {
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

  it('syncs organization cards when initialOrganizations props change', async () => {
    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    expect(container.textContent).toContain('Neo Labs');

    await act(async () => {
      root.render(
        React.createElement(OrganizationsManager, {
          initialOrganizations: [
            {
              ...baseOrganization(),
              name: 'Neo Research',
              slug: 'neo-research'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('Neo Research');
    expect(container.textContent).not.toContain('Neo Labs');
  });

  it('shows a friendly error when organization creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [] }));
    });

    const nameInput = findInput<HTMLInputElement>(container, '#org-name');
    const form = nameInput.closest('form');
    if (!form) {
      throw new Error('Unable to find organization form');
    }

    await act(async () => {
      nameInput.value = 'Neo Labs';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to create organization');
    expect(container.textContent).toContain('Create organization');
  });

  it('shows a friendly error when saving organization governance hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Save organization policy');
    if (!button) throw new Error('Unable to find save organization policy button');

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to update organization');
    expect(container.textContent).toContain('Save organization policy');
  });

  it('shows a friendly error when adding an organization member hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    const loginInput = findInput<HTMLInputElement>(container, '#org-member-login-org-1');
    const form = loginInput.closest('form');
    if (!form) throw new Error('Unable to find add member form');

    await act(async () => {
      loginInput.value = 'alice';
      loginInput.dispatchEvent(new Event('input', { bubbles: true }));
      loginInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to add organization member');
    expect(container.textContent).toContain('Add member');
  });

  it('shows a friendly error when removing an organization member hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Remove');
    if (!button) throw new Error('Unable to find remove member button');

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to remove organization member');
    expect(container.textContent).toContain('Remove');
  });

  it('shows a friendly error when creating an organization invite hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    const emailInput = findInput<HTMLInputElement>(container, '#org-invite-email-org-1');
    const form = emailInput.closest('form');
    if (!form) throw new Error('Unable to find create invite form');

    await act(async () => {
      emailInput.value = 'new@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to create organization invite');
    expect(container.textContent).toContain('Create invite');
  });

  it('shows a friendly error when revoking an organization invite hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    const revokeButtons = Array.from(container.querySelectorAll('button')).filter((candidate) => candidate.textContent?.trim() === 'Revoke');
    const button = revokeButtons[0];
    if (!button) throw new Error('Unable to find revoke invite button');

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to revoke organization invite');
    expect(container.textContent).toContain('Revoke');
  });

  it('shows a friendly error when creating an organization env group hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    const nameInput = findInput<HTMLInputElement>(container, '#org-group-name-org-1');
    const form = nameInput.closest('form');
    if (!form) throw new Error('Unable to find create org group form');

    await act(async () => {
      nameInput.value = 'Shared Cache';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to create organization environment group');
    expect(container.textContent).toContain('Create org group');
  });

  it('shows a friendly error when saving an organization env group item hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    const editButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Edit this group');
    if (!editButton) throw new Error('Unable to find edit group button');

    await act(async () => {
      editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const keyInput = findInput<HTMLInputElement>(container, '#org-group-item-key-org-1-group-1');
    const valueInput = findInput<HTMLInputElement>(container, '#org-group-item-value-org-1-group-1');
    const form = keyInput.closest('form');
    if (!form) throw new Error('Unable to find save org variable form');

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

    expect(container.textContent).toContain('Failed to save organization environment variable');
    expect(container.textContent).toContain('Save org variable');
  });

  it('shows a friendly error when deleting an organization env group hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(React.createElement(OrganizationsManager, { initialOrganizations: [baseOrganization()] }));
    });

    const deleteButtons = Array.from(container.querySelectorAll('button')).filter((candidate) => candidate.textContent?.trim() === 'Delete');
    const button = deleteButtons[0];
    if (!button) throw new Error('Unable to find delete org group button');

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to delete organization environment group');
    expect(container.textContent).toContain('Delete');
  });
});
