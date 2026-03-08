// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children)
}));

import { getOrganizationProjectFiltersStorageKey } from '../lib/organization-projects';
import { OrganizationProjectsList } from './organization-projects-list';

const projects = [
  {
    id: 'project-1',
    name: 'Arcade',
    repoFullName: 'neo/arcade',
    framework: 'nextjs',
    deploymentUrl: 'https://arcade.neopages.dev',
    status: 'deployed',
    latestStatus: 'deployed',
    latestCommitMessage: 'ship it',
    latestCreatedAt: '2026-03-07T02:00:00.000Z'
  },
  {
    id: 'project-2',
    name: 'Docs',
    repoFullName: 'neo/docs',
    framework: null,
    deploymentUrl: null,
    status: 'failed',
    latestStatus: 'failed',
    latestCommitMessage: 'fix it',
    latestCreatedAt: '2026-03-07T03:00:00.000Z'
  }
] as const;

function findButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === label);
  if (!button) {
    throw new Error(`Unable to find button: ${label}`);
  }

  return button;
}

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('OrganizationProjectsList', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('falls back to default filters when persisted status is invalid', async () => {
    localStorage.setItem(
      getOrganizationProjectFiltersStorageKey('org-1'),
      JSON.stringify({ query: '', status: 'bogus', sort: 'recent' })
    );

    await act(async () => {
      root.render(React.createElement(OrganizationProjectsList, { organizationId: 'org-1', projects: [...projects] }));
    });

    const statusSelect = findInput<HTMLSelectElement>(container, '#org-project-status-org-1');
    const liveButton = findButton(container, 'Live');
    const allButton = findButton(container, 'All');

    expect(statusSelect.value).toBe('all');
    expect(allButton.getAttribute('aria-pressed')).toBe('true');
    expect(liveButton.getAttribute('aria-pressed')).toBe('false');
    expect(container.textContent).toContain('Arcade');
    expect(container.textContent).toContain('Docs');
  });

  it('persists preset clicks and reset actions', async () => {
    await act(async () => {
      root.render(React.createElement(OrganizationProjectsList, { organizationId: 'org-1', projects: [...projects] }));
    });

    await act(async () => {
      findButton(container, 'Failures').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const statusSelect = findInput<HTMLSelectElement>(container, '#org-project-status-org-1');
    const sortSelect = findInput<HTMLSelectElement>(container, '#org-project-sort-org-1');
    const failuresButton = findButton(container, 'Failures');

    expect(statusSelect.value).toBe('failed');
    expect(sortSelect.value).toBe('health');
    expect(failuresButton.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('Docs');
    expect(container.textContent).not.toContain('Arcade');
    expect(localStorage.getItem(getOrganizationProjectFiltersStorageKey('org-1'))).toBe(
      JSON.stringify({ query: '', status: 'failed', sort: 'health' })
    );

    await act(async () => {
      findButton(container, 'Reset filters').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(statusSelect.value).toBe('all');
    expect(sortSelect.value).toBe('recent');
    expect(findButton(container, 'All').getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('Arcade');
    expect(container.textContent).toContain('Docs');
    expect(localStorage.getItem(getOrganizationProjectFiltersStorageKey('org-1'))).toBe(
      JSON.stringify({ query: '', status: 'all', sort: 'recent' })
    );
  });
});
