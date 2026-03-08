export function getProjectWebhookRetryDelayMs(attemptCount: number): number {
  if (attemptCount <= 1) {
    return 30_000;
  }
  if (attemptCount === 2) {
    return 120_000;
  }
  if (attemptCount === 3) {
    return 600_000;
  }
  if (attemptCount === 4) {
    return 1_800_000;
  }
  return 7_200_000;
}

export function classifyProjectWebhookDelivery(input: {
  ok: boolean;
  statusCode: number | null;
  attemptCount: number;
  maxAttempts?: number;
}) {
  const maxAttempts = input.maxAttempts ?? 5;

  if (input.ok) {
    return { status: 'succeeded' as const, nextRetryAt: null };
  }

  const retryable = input.statusCode === null || input.statusCode === 408 || input.statusCode === 429 || input.statusCode >= 500;

  if (retryable && input.attemptCount < maxAttempts) {
    return {
      status: 'retrying' as const,
      nextRetryAt: new Date(Date.now() + getProjectWebhookRetryDelayMs(input.attemptCount)).toISOString()
    };
  }

  return { status: 'dead_lettered' as const, nextRetryAt: null };
}
