import type { ExecutionContext } from '@cloudflare/workers-types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import worker, {
  buildGatewayTargetUrl,
  buildSupabaseLookupUrl,
  buildUsageLookupUrl,
  shouldRetryWithIndex
} from './index';

const env = {
  ROOT_DOMAIN: 'neopages.dev',
  DASHBOARD_ORIGIN: 'https://console.neopages.dev',
  NEOFS_GATEWAY_ORIGIN: 'https://http.fs.neo.org/gw',
  SUPABASE_URL: 'https://demo.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  CACHE_TTL_SECONDS: '3600'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildSupabaseLookupUrl', () => {
  it('builds a host lookup URL for the gateway_routes view', () => {
    const url = buildSupabaseLookupUrl(env.SUPABASE_URL, 'alice.neopages.dev');

    expect(url).toBe(
      'https://demo.supabase.co/rest/v1/gateway_routes?host=eq.alice.neopages.dev&select=project_id,host,container_id,deployment_url,monthly_bandwidth_limit_bytes,monthly_request_limit&limit=1'
    );
  });
});


describe('buildUsageLookupUrl', () => {
  it('builds a project usage query URL', () => {
    expect(buildUsageLookupUrl(env.SUPABASE_URL, 'project-1')).toBe('https://demo.supabase.co/rest/v1/project_usage_current_month?project_id=eq.project-1&select=project_id,request_count,bandwidth_bytes&limit=1');
  });
});

describe('buildGatewayTargetUrl', () => {
  it('joins the gateway origin, container id, path, and query string', () => {
    const url = buildGatewayTargetUrl(env.NEOFS_GATEWAY_ORIGIN, 'cid-123', '/assets/app.js', '?v=2');

    expect(url).toBe('https://http.fs.neo.org/gw/cid-123/assets/app.js?v=2');
  });
});

describe('shouldRetryWithIndex', () => {
  it('retries only on 404 extensionless paths', () => {
    expect(shouldRetryWithIndex('/dashboard', 404)).toBe(true);
    expect(shouldRetryWithIndex('/dashboard', 500)).toBe(false);
    expect(shouldRetryWithIndex('/logo.svg', 404)).toBe(false);
  });
});

describe('gateway worker', () => {
  it('redirects the root domain to the dashboard origin', async () => {
    const response = await worker.fetch(new Request('https://neopages.dev/docs?tab=1'), env, { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://console.neopages.dev/docs?tab=1');
  });

  it('looks up the hostname and proxies the request to the container gateway', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ project_id: 'project-1', host: 'alice', container_id: 'cid-123', deployment_url: null, monthly_bandwidth_limit_bytes: 100000 }]), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([{ project_id: 'project-1', request_count: 1, bandwidth_bytes: 512 }]), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response('ok', { status: 200, headers: { 'content-length': '2' } }))
      .mockResolvedValueOnce(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(
      new Request('https://alice.neopages.dev/assets/app.js?build=1', {
        headers: { accept: 'application/javascript' }
      }),
      env,
      { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://demo.supabase.co/rest/v1/gateway_routes?host=eq.alice.neopages.dev&select=project_id,host,container_id,deployment_url,monthly_bandwidth_limit_bytes,monthly_request_limit&limit=1'
    );

    const proxiedRequest = fetchMock.mock.calls[2]?.[0] as Request;
    const proxiedInit = fetchMock.mock.calls[2]?.[1] as { cf?: { cacheEverything?: boolean; cacheTtl?: number } };

    expect(proxiedRequest.url).toBe('https://http.fs.neo.org/gw/cid-123/assets/app.js?build=1');
    expect(proxiedRequest.headers.get('x-forwarded-host')).toBe('alice.neopages.dev');
    expect(proxiedInit.cf).toEqual({ cacheEverything: true, cacheTtl: 3600 });
  });


  it('returns 429 when the project has exceeded its monthly bandwidth limit', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ project_id: 'project-1', host: 'alice', container_id: 'cid-123', deployment_url: null, monthly_bandwidth_limit_bytes: 1000 }]), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ project_id: 'project-1', request_count: 50, bandwidth_bytes: 1000 }]), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(new Request('https://alice.neopages.dev/'), env, { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext);

    expect(response.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries with index.html when the first HTML request returns 404', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ project_id: 'project-1', host: 'alice', container_id: 'cid-123', deployment_url: null, monthly_bandwidth_limit_bytes: 100000 }]), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([{ project_id: 'project-1', request_count: 1, bandwidth_bytes: 512 }]), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response('<html>ok</html>', { status: 200, headers: { 'content-length': '15' } }))
      .mockResolvedValueOnce(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(
      new Request('https://alice.neopages.dev/docs/getting-started', {
        headers: { accept: 'text/html' }
      }),
      env,
      { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext
    );

    expect(response.status).toBe(200);

    const retryRequest = fetchMock.mock.calls[3]?.[0] as Request;
    expect(retryRequest.url).toBe('https://http.fs.neo.org/gw/cid-123/index.html');
  });
});
