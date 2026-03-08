import { describe, expect, it } from 'vitest';

import {
  buildDeploymentUrl,
  inferDefaultOutputDirectory,
  inferFrameworkFromPackageJson,
  resolveLookupKeys,
  slugifySubdomain
} from '../index';

describe('slugifySubdomain', () => {
  it('normalizes mixed text into a DNS-safe slug', () => {
    expect(slugifySubdomain('Bob App 2026!!!')).toBe('bob-app-2026');
  });

  it('falls back to site when the slug is empty', () => {
    expect(slugifySubdomain('***')).toBe('site');
  });
});

describe('inferDefaultOutputDirectory', () => {
  it('returns framework-specific defaults', () => {
    expect(inferDefaultOutputDirectory('vite')).toBe('dist');
    expect(inferDefaultOutputDirectory('next-static')).toBe('out');
  });

  it('falls back to dist for unknown frameworks', () => {
    expect(inferDefaultOutputDirectory('something-else')).toBe('dist');
  });
});

describe('resolveLookupKeys', () => {
  it('returns both host and subdomain for managed domains', () => {
    expect(resolveLookupKeys('alice.neopages.dev', 'neopages.dev')).toEqual([
      'alice.neopages.dev',
      'alice'
    ]);
  });

  it('returns only the hostname for custom domains', () => {
    expect(resolveLookupKeys('mygame.com', 'neopages.dev')).toEqual(['mygame.com']);
  });
});

describe('buildDeploymentUrl', () => {
  it('builds the default production URL when no edge origin is set', () => {
    expect(buildDeploymentUrl('arcade', 'neopages.dev')).toBe('https://arcade.neopages.dev');
  });

  it('preserves protocol and port for local edge origins', () => {
    expect(buildDeploymentUrl('arcade', 'localhost', 'http://localhost:8787')).toBe('http://arcade.localhost:8787');
  });
});

describe('inferFrameworkFromPackageJson', () => {
  it('detects Next.js from dependencies', () => {
    expect(inferFrameworkFromPackageJson({ dependencies: { next: '^15.0.0' } })).toBe('next-static');
  });

  it('falls back to static sites', () => {
    expect(inferFrameworkFromPackageJson({})).toBe('static');
  });
});
