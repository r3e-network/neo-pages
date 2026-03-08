import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import express from 'express';

import { loadBuilderConfig, hasSupabaseConfig } from './config';
import { cancelRunningDeployment, processNextQueuedDeployment, runDeployment } from './build/run-deployment';

function contentTypeForFile(filePath: string) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

const config = loadBuilderConfig();
const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (_request, response) => {
  response.json({ ok: true, storageBackend: config.storageBackend, supabase: hasSupabaseConfig(config) });
});

app.post('/internal/poll', async (_request, response) => {
  try {
    const result = await processNextQueuedDeployment(config);
    response.json({ ok: true, result });
  } catch (error) {
    response.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/internal/deployments/:deploymentId/run', async (request, response) => {
  try {
    const result = await runDeployment(config, request.params.deploymentId);
    response.json({ ok: true, result });
  } catch (error) {
    response.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/internal/deployments/:deploymentId/cancel', async (request, response) => {
  const cancelled = cancelRunningDeployment(request.params.deploymentId);
  response.json({ ok: true, cancelled });
});

app.get(['/local-gateway/:containerId', '/local-gateway/:containerId/*'], async (request, response) => {
  const requestedPath = (Array.isArray(request.params[0]) ? request.params[0][0] : request.params[0]) || 'index.html';
  const containerId = Array.isArray(request.params.containerId) ? request.params.containerId[0] : request.params.containerId;
  const baseDir = path.join(config.localStorageRoot, containerId);
  const filePath = path.join(baseDir, requestedPath);

  const candidates = [filePath];
  if (!path.extname(requestedPath)) {
    candidates.push(path.join(baseDir, requestedPath, 'index.html'));
    candidates.push(path.join(baseDir, 'index.html'));
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      const file = await readFile(candidate);
      response.setHeader('content-type', contentTypeForFile(candidate));
      response.setHeader('cache-control', 'public, max-age=60');
      response.send(file);
      return;
    } catch {
      continue;
    }
  }

  response.status(404).json({ error: 'Artifact not found' });
});

if (config.pollIntervalMs > 0 && hasSupabaseConfig(config)) {
  setInterval(() => {
    processNextQueuedDeployment(config).catch((error) => {
      console.error('[builder] poll failed', error);
    });
  }, config.pollIntervalMs);
}

app.listen(config.port, () => {
  console.log(`[builder] listening on ${config.publicUrl}`);
});
