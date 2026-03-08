import { describe, expect, it } from 'vitest';

import { formatBandwidth, isBandwidthLimitExceeded, isRequestLimitExceeded } from './usage';

describe('formatBandwidth', () => {
  it('formats bytes into human-readable units', () => {
    expect(formatBandwidth(512)).toBe('512 B');
    expect(formatBandwidth(1536)).toBe('1.5 KB');
    expect(formatBandwidth(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('isBandwidthLimitExceeded', () => {
  it('flags usage at or above the configured limit', () => {
    expect(isBandwidthLimitExceeded(100, 100)).toBe(true);
    expect(isBandwidthLimitExceeded(101, 100)).toBe(true);
    expect(isBandwidthLimitExceeded(99, 100)).toBe(false);
  });
});


describe('isRequestLimitExceeded', () => {
  it('flags request usage at or above the configured limit', () => {
    expect(isRequestLimitExceeded(100, 100)).toBe(true);
    expect(isRequestLimitExceeded(101, 100)).toBe(true);
    expect(isRequestLimitExceeded(99, 100)).toBe(false);
  });
});
