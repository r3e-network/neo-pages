// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectPromotionRequestsManager } from './project-promotion-requests-manager';

describe('ProjectPromotionRequestsManager interactions', () => {
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

  it('syncs promotion requests when props change', async () => {
    await act(async () => {
      root.render(
        React.createElement(ProjectPromotionRequestsManager, {
          projectId: 'project-1',
          initialRequests: [
            {
              id: 'request-1',
              deployment_id: 'deployment-1',
              status: 'pending',
              request_comment: 'Please promote',
              created_at: '2026-03-07T00:00:00.000Z'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('deployment-1');

    await act(async () => {
      root.render(
        React.createElement(ProjectPromotionRequestsManager, {
          projectId: 'project-1',
          initialRequests: [
            {
              id: 'request-2',
              deployment_id: 'deployment-2',
              status: 'approved',
              request_comment: null,
              created_at: '2026-03-08T00:00:00.000Z'
            }
          ]
        })
      );
    });

    expect(container.textContent).toContain('deployment-2');
    expect(container.textContent).not.toContain('deployment-1');
  });

  it('shows a friendly error when approving a promotion request hits a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await act(async () => {
      root.render(
        React.createElement(ProjectPromotionRequestsManager, {
          projectId: 'project-1',
          initialRequests: [
            {
              id: 'request-1',
              deployment_id: 'deployment-1',
              status: 'pending',
              request_comment: 'Please promote',
              created_at: '2026-03-07T00:00:00.000Z'
            }
          ]
        })
      );
    });

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === 'Approve');
    if (!button) {
      throw new Error('Unable to find approve button');
    }

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Failed to review promotion request');
    expect(container.textContent).toContain('Approve');
  });
});
