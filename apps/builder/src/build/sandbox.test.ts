import { describe, expect, it } from 'vitest';

import type { BuildPlan } from './build-plan';
import { createSandboxExecution } from './sandbox';

const buildPlan: BuildPlan = {
  packageManager: 'npm',
  installCommand: 'npm ci',
  buildCommand: 'npm run build',
  framework: 'vite',
  outputDirectory: 'dist'
};

describe('createSandboxExecution', () => {
  it('injects extra environment variables into docker runs', () => {
    const execution = createSandboxExecution({
      mode: 'docker',
      repoDir: '/tmp/repo',
      dockerImage: 'node:22-bookworm',
      buildPlan,
      extraEnv: {
        NEXT_PUBLIC_API_URL: 'https://example.com',
        SECRET_TOKEN: 'shh'
      }
    });

    expect(execution.args).toContain('-e');
    expect(execution.args).toContain('NEXT_PUBLIC_API_URL=https://example.com');
    expect(execution.args).toContain('SECRET_TOKEN=shh');
  });
});
