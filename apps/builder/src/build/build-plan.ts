import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { inferDefaultOutputDirectory, inferFrameworkFromPackageJson } from '@neopages/core';

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export interface BuildPlan {
  packageManager: PackageManager;
  installCommand: string;
  buildCommand: string;
  framework: string;
  outputDirectory: string;
}

export function detectPackageManager(files: string[]): PackageManager {
  if (files.includes('pnpm-lock.yaml')) {
    return 'pnpm';
  }

  if (files.includes('yarn.lock')) {
    return 'yarn';
  }

  return 'npm';
}

export async function detectPackageManagerFromDir(repoDir: string): Promise<PackageManager> {
  const candidates = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'];
  const found: string[] = [];

  await Promise.all(
    candidates.map(async (file) => {
      try {
        await access(path.join(repoDir, file));
        found.push(file);
      } catch {
        return undefined;
      }
    })
  );

  return detectPackageManager(found);
}

function defaultInstallCommand(packageManager: PackageManager): string {
  if (packageManager === 'pnpm') {
    return 'pnpm install --frozen-lockfile';
  }

  if (packageManager === 'yarn') {
    return 'yarn install --frozen-lockfile';
  }

  return 'npm ci';
}

function defaultBuildCommand(packageManager: PackageManager): string {
  if (packageManager === 'pnpm') {
    return 'pnpm run build';
  }

  if (packageManager === 'yarn') {
    return 'yarn build';
  }

  return 'npm run build';
}

export async function loadPackageJson(repoDir: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path.join(repoDir, 'package.json'), 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function createBuildPlan(input: {
  repoDir: string;
  framework?: string | null;
  outputDirectory?: string | null;
  installCommand?: string | null;
  buildCommand?: string | null;
}): Promise<BuildPlan> {
  const packageManager = await detectPackageManagerFromDir(input.repoDir);
  const packageJson = await loadPackageJson(input.repoDir);
  const framework = input.framework ?? inferFrameworkFromPackageJson(packageJson);
  const outputDirectory = input.outputDirectory ?? inferDefaultOutputDirectory(framework);

  return {
    packageManager,
    installCommand: input.installCommand ?? defaultInstallCommand(packageManager),
    buildCommand: input.buildCommand ?? defaultBuildCommand(packageManager),
    framework,
    outputDirectory
  };
}

