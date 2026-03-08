import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createBuildPlan, detectPackageManager } from './build-plan';
import { createSandboxExecution } from './sandbox';

describe('detectPackageManager', () => {
  it('prefers pnpm when a lockfile exists', () => {
    expect(detectPackageManager(['pnpm-lock.yaml', 'package-lock.json'])).toBe('pnpm');
  });

  it('falls back to npm', () => {
    expect(detectPackageManager([])).toBe('npm');
  });
});

describe('createBuildPlan', () => {
  it('infers framework and output directory from package.json', async () => {
    const repoDir = await mkdtemp(path.join(os.tmpdir(), 'neopages-builder-'));
    await writeFile(repoDir + '/package.json', JSON.stringify({ dependencies: { next: '^15.0.0' } }));

    const plan = await createBuildPlan({ repoDir });

    expect(plan.framework).toBe('next-static');
    expect(plan.outputDirectory).toBe('out');
    expect(plan.buildCommand).toContain('build');
  });
});

describe('createSandboxExecution', () => {
  it('uses docker when configured', () => {
    const execution = createSandboxExecution({
      mode: 'docker',
      repoDir: '/tmp/repo',
      dockerImage: 'node:22-bookworm',
      buildPlan: {
        packageManager: 'npm',
        installCommand: 'npm ci',
        buildCommand: 'npm run build',
        framework: 'vite',
        outputDirectory: 'dist'
      }
    });

    expect(execution.command).toBe('docker');
    expect(execution.args).toContain('/tmp/repo:/workspace');
  });

  it('uses a local shell when docker is disabled', () => {
    const execution = createSandboxExecution({
      mode: 'local',
      repoDir: '/tmp/repo',
      dockerImage: 'node:22-bookworm',
      buildPlan: {
        packageManager: 'npm',
        installCommand: 'npm ci',
        buildCommand: 'npm run build',
        framework: 'vite',
        outputDirectory: 'dist'
      }
    });

    expect(execution.command).toBe('bash');
    expect(execution.args.at(-1)).toBe('npm ci && npm run build');
  });
});

