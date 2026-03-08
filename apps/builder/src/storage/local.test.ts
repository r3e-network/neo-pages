import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectLocalArtifactManifest } from './local';

describe('collectLocalArtifactManifest', () => {
  it('collects relative artifact paths and byte sizes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'neopages-artifacts-'));
    await mkdir(path.join(root, 'assets'), { recursive: true });
    await writeFile(path.join(root, 'index.html'), '<html></html>');
    await writeFile(path.join(root, 'assets', 'app.js'), 'console.log(1);');

    const manifest = await collectLocalArtifactManifest(root);

    expect(manifest).toEqual([
      expect.objectContaining({ path: 'assets/app.js', size_bytes: 15 }),
      expect.objectContaining({ path: 'index.html', size_bytes: 13 })
    ]);
  });
});
