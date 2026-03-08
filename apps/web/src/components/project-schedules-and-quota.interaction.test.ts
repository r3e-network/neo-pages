// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectDeploySchedulesManager } from './project-deploy-schedules-manager';
import { ProjectQuotaManager } from './project-quota-manager';

function findInput<T extends HTMLElement>(container: HTMLElement, selector: string) {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Unable to find element: ${selector}`);
  }

  return element;
}

describe('Project schedules and quota managers', () => {
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

  it('shows a friendly error when schedule deletion hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploySchedulesManager, {
          projectId: 'project-1',
          defaultBranch: 'main',
          accessRole: 'owner',
          initialSchedules: [
            {
              id: 'schedule-1',
              label: 'Hourly preview refresh',
              branch: 'main',
              cronExpression: '0 * * * *',
              timezone: 'UTC',
              active: true,
              nextRunAt: null,
              lastRunAt: null,
              createdAt: '2026-03-07T00:00:00.000Z'
            }
          ]
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Delete');
    if (!button) {
      throw new Error('Unable to find delete schedule button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to delete deploy schedule');
    expect(container.textContent).toContain('Delete');
  });

  it('shows a friendly error when schedule creation hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectDeploySchedulesManager, {
          projectId: 'project-1',
          defaultBranch: 'main',
          accessRole: 'owner',
          initialSchedules: []
        })
      );
    });

    const labelInput = findInput<HTMLInputElement>(container, '#schedule-label');
    const form = labelInput.closest('form');
    if (!form) {
      throw new Error('Unable to find schedule form');
    }

    await act(async () => {
      labelInput.value = 'Hourly preview refresh';
      labelInput.dispatchEvent(new Event('input', { bubbles: true }));
      labelInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to create deploy schedule');
    expect(container.textContent).toContain('Create schedule');
  });

  it('shows a friendly error when quota save hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectQuotaManager, {
          projectId: 'project-1',
          accessRole: 'owner',
          initialUsage: {
            planTier: 'pro',
            monthlyBandwidthLimitBytes: 1024,
            monthlyRequestLimit: 100,
            useOrganizationQuotas: false
          }
        })
      );
    });

    const form = container.querySelector('form');
    if (!form) {
      throw new Error('Unable to find quota form');
    }

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Failed to update quota policy');
    expect(container.textContent).toContain('Save quota policy');
  });
});
