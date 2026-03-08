import { describe, expect, it } from 'vitest';

import { getNextScheduledRunAt, normalizeScheduleInput } from './project-schedules';

describe('normalizeScheduleInput', () => {
  it('normalizes labels, branch names, cron, and timezone', () => {
    expect(
      normalizeScheduleInput({
        label: '  Morning build  ',
        branch: ' main ',
        cronExpression: '*/15 * * * *',
        timezone: 'UTC'
      })
    ).toEqual({
      label: 'Morning build',
      branch: 'main',
      cronExpression: '*/15 * * * *',
      timezone: 'UTC'
    });
  });
});

describe('getNextScheduledRunAt', () => {
  it('computes the next run in UTC', () => {
    expect(getNextScheduledRunAt('*/15 * * * *', 'UTC', '2026-03-07T00:07:00.000Z')).toBe('2026-03-07T00:15:00.000Z');
  });

  it('throws on invalid cron expressions', () => {
    expect(() => getNextScheduledRunAt('bad cron', 'UTC', '2026-03-07T00:07:00.000Z')).toThrow();
  });
});
