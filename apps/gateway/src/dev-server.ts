import http, { type IncomingMessage, type ServerResponse } from 'node:http';

import type { GatewayEnv } from './index';
import worker from './index';

const port = Number(process.env.GATEWAY_PORT ?? '8787');
const env: GatewayEnv = {
  ROOT_DOMAIN: process.env.ROOT_DOMAIN ?? 'localhost',
  DASHBOARD_ORIGIN: process.env.DASHBOARD_ORIGIN ?? 'http://localhost:3000',
  NEOFS_GATEWAY_ORIGIN: process.env.NEOFS_GATEWAY_ORIGIN ?? 'http://localhost:4000/local-gateway',
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'replace-me',
  CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS ?? '60'
};

async function readRequestBody(request: IncomingMessage): Promise<ArrayBuffer | undefined> {
  if (!request.method || request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const combined = Buffer.concat(chunks);
  return combined.buffer.slice(combined.byteOffset, combined.byteOffset + combined.byteLength);
}

function toHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'undefined') {
      continue;
    }

    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }

  return headers;
}

async function handleNodeRequest(request: IncomingMessage, response: ServerResponse) {
  try {
    const origin = `http://${request.headers.host ?? `localhost:${port}`}`;
    const url = new URL(request.url ?? '/', origin);
    const body = await readRequestBody(request);

    const workerRequest = new Request(url, {
      method: request.method,
      headers: toHeaders(request),
      body
    });

    const workerResponse = await worker.fetch(workerRequest, env, {} as never);
    response.statusCode = workerResponse.status;
    workerResponse.headers.forEach((value, name) => {
      response.setHeader(name, value);
    });

    const buffer = Buffer.from(await workerResponse.arrayBuffer());
    response.end(buffer);
  } catch (error) {
    response.statusCode = 500;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Gateway dev server failed'
      })
    );
  }
}

http.createServer(handleNodeRequest).listen(port, () => {
  console.log(`[gateway] listening on http://localhost:${port} for *.${env.ROOT_DOMAIN} hosts`);
});
