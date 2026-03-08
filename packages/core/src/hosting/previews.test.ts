import { describe, expect, it } from 'vitest';

import {
  buildPreviewDeploymentUrl,
  buildPreviewSubdomain,
  deploymentEnvironmentSchema,
  isProductionBranch
} from '../index';

describe('deployment environment helpers', () => {
  it('treats the default branch as production', () => {
    expect(isProductionBranch('main', 'main')).toBe(true);
    expect(isProductionBranch('feature/login', 'main')).toBe(false);
  });

  it('builds a preview alias from branch and project subdomain', () => {
    expect(buildPreviewSubdomain('feature/login', 'neo-arcade')).toBe('feature-login--neo-arcade');
  });

  it('builds preview URLs for production edge domains', () => {
    expect(buildPreviewDeploymentUrl('feature/login', 'neo-arcade', 'neopages.dev')).toBe(
      'https://feature-login--neo-arcade.neopages.dev'
    );
  });

  it('preserves protocol and port for local preview URLs', () => {
    expect(buildPreviewDeploymentUrl('fix/header', 'neo-arcade', 'localhost', 'http://localhost:8787')).toBe(
      'http://fix-header--neo-arcade.localhost:8787'
    );
  });

  it('exposes the deployment environment schema', () => {
    expect(deploymentEnvironmentSchema.parse('preview')).toBe('preview');
    expect(() => deploymentEnvironmentSchema.parse('staging')).toThrow();
  });
});
