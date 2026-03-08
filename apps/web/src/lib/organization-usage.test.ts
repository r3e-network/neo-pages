import { describe, expect, it } from 'vitest';

import { resolveOrganizationUsageSummary } from './organization-usage';

describe('resolveOrganizationUsageSummary', () => {
  it('aggregates org-owned project counts and current-month usage', () => {
    expect(
      resolveOrganizationUsageSummary({
        projectCount: 3,
        liveProjectCount: 2,
        usageRows: [
          { requestCount: 100, bandwidthBytes: 1024 },
          { requestCount: 25, bandwidthBytes: 2048 },
          { requestCount: 0, bandwidthBytes: 0 }
        ]
      })
    ).toEqual({
      projectCount: 3,
      liveProjectCount: 2,
      requestCount: 125,
      bandwidthBytes: 3072
    });
  });
});
