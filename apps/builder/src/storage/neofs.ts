import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import type { BuilderConfig } from '../config';
import type { DeploymentArtifactManifestItem, UploadSiteInput, UploadSiteResult } from './types';

interface NeoFSObjectFile {
  absolutePath: string;
  relativePath: string;
}

async function collectFiles(root: string, prefix = ''): Promise<NeoFSObjectFile[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: NeoFSObjectFile[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, relativePath)));
    } else {
      files.push({ absolutePath, relativePath });
    }
  }

  return files;
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

async function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { env: process.env });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed: ${stderr || stdout}`));
    });

    child.on('error', reject);
  });
}

function parseContainerId(output: string): string {
  try {
    const parsed = JSON.parse(output) as Record<string, string>;
    return parsed.containerId ?? parsed.cid ?? parsed.id ?? output.trim();
  } catch {
    return output.trim();
  }
}

async function buildArtifactManifest(root: string): Promise<DeploymentArtifactManifestItem[]> {
  const files = await collectFiles(root);
  const artifacts: DeploymentArtifactManifestItem[] = [];

  for (const file of files) {
    const fileStat = await stat(file.absolutePath);
    artifacts.push({
      path: file.relativePath,
      size_bytes: fileStat.size,
      content_type: inferContentType(file.relativePath)
    });
  }

  return artifacts.sort((left, right) => left.path.localeCompare(right.path));
}

export class NeoFSStorageProvider {
  constructor(private readonly config: BuilderConfig) {}

  async uploadSite(input: UploadSiteInput): Promise<UploadSiteResult> {
    if (!this.config.neofsRpcEndpoint || !this.config.neofsWalletPath) {
      throw new Error('NeoFS backend requires NEOFS_RPC_ENDPOINT and NEOFS_WALLET_PATH');
    }

    const output = await runCommand(this.config.neofsCliBin, [
      'container',
      'create',
      '--rpc-endpoint',
      this.config.neofsRpcEndpoint,
      '--wallet',
      this.config.neofsWalletPath,
      '--basic-acl',
      this.config.neofsContainerBasicAcl,
      '--policy',
      this.config.neofsContainerPolicy,
      '--attributes',
      '__NEOFS__WEB_INDEX=index.html,__NEOFS__WEB_ERROR=404.html',
      '--await'
    ]);

    const containerId = parseContainerId(containerOutput);
    const files = await collectFiles(input.outputDir);
    const artifacts = await buildArtifactManifest(input.outputDir);

    for (const file of files) {
      await stat(file.absolutePath);
      const contentType = inferContentType(file.relativePath);
      const attributes = [`FilePath=${file.relativePath}`];
      if (contentType) {
        attributes.push(`ContentType=${contentType}`);
      }

      await runCommand(this.config.neofsCliBin, [
        'object',
        'put',
        '--rpc-endpoint',
        this.config.neofsRpcEndpoint,
        '--wallet',
        this.config.neofsWalletPath,
        '--container-id',
        containerId,
        '--file',
        file.absolutePath,
        ...attributes.flatMap(attr => ['--attributes', attr])
      ]);
    }

    return {
      containerId,
      previewUrl: `${this.config.neofsGatewayOrigin}/${containerId}`,
      fileCount: files.length,
      artifacts
    };
  }
}
