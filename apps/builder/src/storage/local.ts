import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import type { DeploymentArtifactManifestItem, UploadSiteInput, UploadSiteResult } from './types';

export interface UploadSiteInputLocal {
  deploymentId: string;
  outputDir: string;
}

async function countFiles(root: string): Promise<number> {
  const entries = await readdir(root, { withFileTypes: true });

  let count = 0;

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      count += await countFiles(fullPath);
    } else {
      count += 1;
    }
  }

  return count;
}

function inferContentType(filePath: string): string | null {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return null;
  }
}

export async function collectLocalArtifactManifest(root: string, prefix = ''): Promise<DeploymentArtifactManifestItem[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const manifest: DeploymentArtifactManifestItem[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      manifest.push(...(await collectLocalArtifactManifest(fullPath, relativePath)));
    } else {
      const fileStat = await stat(fullPath);
      manifest.push({
        path: relativePath,
        size_bytes: fileStat.size,
        content_type: inferContentType(relativePath)
      });
    }
  }

  return manifest.sort((left, right) => left.path.localeCompare(right.path));
}

export class LocalStorageProvider {
  constructor(
    private readonly storageRoot: string,
    private readonly publicBuilderUrl: string
  ) {}

  async uploadSite(input: UploadSiteInput): Promise<UploadSiteResult> {
    const containerId = `local-${input.deploymentId}`;
    const destination = path.join(this.storageRoot, containerId);

    await mkdir(this.storageRoot, { recursive: true });
    await rm(destination, { recursive: true, force: true });
    await cp(input.outputDir, destination, { recursive: true, force: true });

    const artifacts = await collectLocalArtifactManifest(destination);

    return {
      containerId,
      previewUrl: `${this.publicBuilderUrl.replace(/\/$/, '')}/local-gateway/${containerId}`,
      fileCount: await countFiles(destination),
      artifacts
    };
  }
}

export async function resolveLocalArtifactPath(storageRoot: string, containerId: string, pathname: string): Promise<string | null> {
  const normalizedPath = pathname.replace(/^\/+/, '');
  const candidate = path.join(storageRoot, containerId, normalizedPath);

  try {
    const fileStat = await stat(candidate);
    if (fileStat.isFile()) {
      return candidate;
    }
  } catch {
    // ignore
  }

  if (!normalizedPath.includes('.')) {
    const fallback = path.join(storageRoot, containerId, normalizedPath, 'index.html');

    try {
      const fileStat = await stat(fallback);
      if (fileStat.isFile()) {
        return fallback;
      }
    } catch {
      // ignore
    }
  }

  const rootFallback = path.join(storageRoot, containerId, 'index.html');

  try {
    const fileStat = await stat(rootFallback);
    return fileStat.isFile() ? rootFallback : null;
  } catch {
    return null;
  }
}
