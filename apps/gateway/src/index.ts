import type { ExecutionContext } from '@cloudflare/workers-types';

import { isStaticAssetPath, resolveLookupKeys } from '@neopages/core';

export interface GatewayEnv {
  ROOT_DOMAIN: string;
  DASHBOARD_ORIGIN: string;
  NEOFS_GATEWAY_ORIGIN: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CACHE_TTL_SECONDS?: string;
  USAGE_INGEST_SECRET?: string;
}

interface GatewayRoute {
  project_id: string;
  host: string;
  container_id: string | null;
  deployment_url?: string | null;
  monthly_bandwidth_limit_bytes?: number | null;
  monthly_request_limit?: number | null;
}

interface UsageRow {
  project_id: string;
  request_count: number;
  bandwidth_bytes: number;
}

export function buildSupabaseLookupUrl(supabaseUrl: string, host: string): string {
  const origin = new URL(supabaseUrl).origin;
  return `${origin}/rest/v1/gateway_routes?host=eq.${encodeURIComponent(host)}&select=project_id,host,container_id,deployment_url,monthly_bandwidth_limit_bytes,monthly_request_limit&limit=1`;
}

export function buildUsageLookupUrl(supabaseUrl: string, projectId: string): string {
  const origin = new URL(supabaseUrl).origin;
  return `${origin}/rest/v1/project_usage_current_month?project_id=eq.${encodeURIComponent(projectId)}&select=project_id,request_count,bandwidth_bytes&limit=1`;
}

export function buildGatewayTargetUrl(
  gatewayOrigin: string,
  containerId: string,
  pathname: string,
  search = ''
): string {
  const base = gatewayOrigin.replace(/\/+$/, '');
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}/${containerId}${normalizedPath}${search}`;
}

export function shouldRetryWithIndex(pathname: string, status: number): boolean {
  if (status !== 404 || pathname === '/index.html') {
    return false;
  }

  return !isStaticAssetPath(pathname);
}

function createSupabaseHeaders(env: GatewayEnv): Headers {
  return new Headers({
    apikey: env.SUPABASE_ANON_KEY,
    authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    accept: 'application/json'
  });
}

async function lookupCurrentMonthUsage(projectId: string, env: GatewayEnv): Promise<UsageRow | null> {
  const response = await fetch(buildUsageLookupUrl(env.SUPABASE_URL, projectId), {
    headers: createSupabaseHeaders(env)
  });

  if (!response.ok) {
    throw new Error(`Supabase usage lookup failed with ${response.status}`);
  }

  const rows = (await response.json()) as UsageRow[];
  return rows[0] ?? null;
}

function hasExceededQuota(route: GatewayRoute, usage: UsageRow | null): boolean {
  const bandwidthLimit = Number(route.monthly_bandwidth_limit_bytes ?? 0);
  const requestLimit = Number(route.monthly_request_limit ?? 0);
  const usedBandwidth = Number(usage?.bandwidth_bytes ?? 0);
  const usedRequests = Number(usage?.request_count ?? 0);

  if (bandwidthLimit > 0 && usedBandwidth >= bandwidthLimit) {
    return true;
  }

  if (requestLimit > 0 && usedRequests >= requestLimit) {
    return true;
  }

  return false;
}

async function recordUsage(route: GatewayRoute, response: Response, env: GatewayEnv): Promise<void> {
  if (!env.USAGE_INGEST_SECRET) {
    return;
  }

  const contentLength = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
  const bytes = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0;

  await fetch(new URL('/api/internal/usage', env.DASHBOARD_ORIGIN), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-neopages-ingest-secret': env.USAGE_INGEST_SECRET
    },
    body: JSON.stringify({
      projectId: route.project_id,
      bytes,
      requestCount: 1
    })
  });
}

async function lookupRoute(hostname: string, env: GatewayEnv): Promise<GatewayRoute | null> {
  for (const key of resolveLookupKeys(hostname, env.ROOT_DOMAIN)) {
    const response = await fetch(buildSupabaseLookupUrl(env.SUPABASE_URL, key), {
      headers: createSupabaseHeaders(env)
    });

    if (!response.ok) {
      throw new Error(`Supabase gateway lookup failed with ${response.status}`);
    }

    const rows = (await response.json()) as GatewayRoute[];
    if (rows[0]?.container_id) {
      return rows[0];
    }
  }

  return null;
}

function createProxyRequest(request: Request, upstreamUrl: string, forwardedHost: string): Request {
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', forwardedHost);
  headers.delete('host');

  return new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual'
  });
}

function createCacheOptions(request: Request, env: GatewayEnv) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return undefined;
  }

  const cacheTtl = Number.parseInt(env.CACHE_TTL_SECONDS ?? '3600', 10);
  return {
    cf: {
      cacheEverything: true,
      cacheTtl: Number.isFinite(cacheTtl) ? cacheTtl : 3600
    }
  } as RequestInit & { cf: { cacheEverything: boolean; cacheTtl: number } };
}

async function fetchGateway(request: Request, env: GatewayEnv, containerId: string): Promise<Response> {
  const requestUrl = new URL(request.url);
  const cacheOptions = createCacheOptions(request, env);

  const upstreamResponse = await fetch(
    createProxyRequest(
      request,
      buildGatewayTargetUrl(env.NEOFS_GATEWAY_ORIGIN, containerId, requestUrl.pathname, requestUrl.search),
      requestUrl.hostname
    ),
    cacheOptions
  );

  if (!shouldRetryWithIndex(requestUrl.pathname, upstreamResponse.status)) {
    return upstreamResponse;
  }

  return fetch(
    createProxyRequest(
      request,
      buildGatewayTargetUrl(env.NEOFS_GATEWAY_ORIGIN, containerId, '/index.html'),
      requestUrl.hostname
    ),
    cacheOptions
  );
}

async function handleRequest(request: Request, env: GatewayEnv, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname === env.ROOT_DOMAIN) {
    return Response.redirect(new URL(`${url.pathname}${url.search}`, env.DASHBOARD_ORIGIN), 307);
  }

  const route = await lookupRoute(url.hostname, env);
  if (!route?.container_id) {
    return new Response('Project not found', { status: 404 });
  }

  const usage = await lookupCurrentMonthUsage(route.project_id, env);
  if (hasExceededQuota(route, usage)) {
    return new Response('Monthly quota exceeded', { status: 429 });
  }

  const response = await fetchGateway(request, env, route.container_id);
  if (typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(recordUsage(route, response.clone(), env));
  }
  return response;
}


const worker = {
  async fetch(request: Request, env: GatewayEnv, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env, ctx);
  }
};

export default worker;
