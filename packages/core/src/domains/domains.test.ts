import { describe, expect, it } from 'vitest';

import {
  buildDomainVerificationHostname,
  buildDomainRoutingTarget,
  normalizeCustomDomain,
  summarizeDomainVerification
} from '../index';

describe('normalizeCustomDomain', () => {
  it('normalizes case and trailing dots', () => {
    expect(normalizeCustomDomain('Blog.Example.COM.')).toBe('blog.example.com');
  });

  it('rejects invalid hosts', () => {
    expect(() => normalizeCustomDomain('*.example.com')).toThrow();
    expect(() => normalizeCustomDomain('localhost')).toThrow();
  });
});

describe('domain helpers', () => {
  it('builds verification record and routing target', () => {
    expect(buildDomainVerificationHostname('blog.example.com')).toBe('_neopages.blog.example.com');
    expect(buildDomainRoutingTarget('neopages.dev')).toBe('cname.neopages.dev');
  });
});

describe('summarizeDomainVerification', () => {
  it('passes when the TXT token is present', () => {
    expect(
      summarizeDomainVerification({
        token: 'verify-123',
        txtValues: ['verify-123'],
        cnameTarget: 'cname.neopages.dev',
        actualCname: 'cname.neopages.dev'
      })
    ).toMatchObject({ verified: true, dnsConfigured: true });
  });

  it('fails verification when the TXT token is missing', () => {
    expect(
      summarizeDomainVerification({
        token: 'verify-123',
        txtValues: ['wrong-token'],
        cnameTarget: 'cname.neopages.dev',
        actualCname: null
      })
    ).toMatchObject({ verified: false, dnsConfigured: false });
  });
});
