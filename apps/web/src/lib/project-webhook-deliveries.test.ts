import { describe, expect, it } from 'vitest';

import { classifyProjectWebhookDelivery, getProjectWebhookRetryDelayMs } from './project-webhook-deliveries';

describe('getProjectWebhookRetryDelayMs', () => {
  it('backs off with increasing delays', () => {
    expect(getProjectWebhookRetryDelayMs(1)).toBe(30_000);
    expect(getProjectWebhookRetryDelayMs(2)).toBe(120_000);
    expect(getProjectWebhookRetryDelayMs(3)).toBe(600_000);
  });
});

describe('classifyProjectWebhookDelivery', () => {
  it('marks successful 2xx responses as succeeded', () => {
    expect(classifyProjectWebhookDelivery({ ok: true, statusCode: 200, attemptCount: 1 })).toMatchObject({ status: 'succeeded' });
  });

  it('retries transient failures while attempts remain', () => {
    expect(classifyProjectWebhookDelivery({ ok: false, statusCode: 503, attemptCount: 1 })).toMatchObject({ status: 'retrying' });
    expect(classifyProjectWebhookDelivery({ ok: false, statusCode: 429, attemptCount: 2 })).toMatchObject({ status: 'retrying' });
  });

  it('dead-letters permanent failures or exhausted retries', () => {
    expect(classifyProjectWebhookDelivery({ ok: false, statusCode: 404, attemptCount: 1 })).toMatchObject({ status: 'dead_lettered' });
    expect(classifyProjectWebhookDelivery({ ok: false, statusCode: 503, attemptCount: 5, maxAttempts: 5 })).toMatchObject({ status: 'dead_lettered' });
  });
});
