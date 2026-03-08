import type { ProjectWebhookDeliveryRecord, ProjectWebhookEndpointRecord } from '@neopages/core';
import {
    projectNotificationEvents,
    projectNotificationEventSchema,
    renderProjectNotificationDelivery,
    shouldSendProjectWebhook,
    signProjectWebhookPayload,
    webhookPayloadFormatSchema
} from '@neopages/core';
import { recordProjectActivity } from './project-activity';
import { classifyProjectWebhookDelivery } from './project-webhook-deliveries';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectWebhookEndpointView {
  id: string;
  targetUrl: string;
  hasSecret: boolean;
  payloadFormat: 'json' | 'slack';
  events: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWebhookDeliveryView {
  id: string;
  targetUrl: string;
  eventType: string;
  status: string;
  attemptCount: number;
  lastResponseStatus: number | null;
  lastError: string | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  deadLetteredAt: string | null;
  createdAt: string;
}

export function listSupportedProjectWebhookEvents() {
  return [...projectNotificationEvents];
}

export function toProjectWebhookEndpointView(record: ProjectWebhookEndpointRecord): ProjectWebhookEndpointView {
  return {
    id: record.id,
    targetUrl: record.target_url,
    hasSecret: Boolean(record.secret),
    payloadFormat: webhookPayloadFormatSchema.parse(record.payload_format),
    events: record.events,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function toProjectWebhookDeliveryView(record: ProjectWebhookDeliveryRecord): ProjectWebhookDeliveryView {
  return {
    id: record.id,
    targetUrl: record.target_url,
    eventType: record.event_type,
    status: record.status,
    attemptCount: record.attempt_count,
    lastResponseStatus: record.last_response_status,
    lastError: record.last_error,
    nextRetryAt: record.next_retry_at,
    deliveredAt: record.delivered_at,
    deadLetteredAt: record.dead_lettered_at,
    createdAt: record.created_at
  };
}

export async function listProjectWebhookEndpoints(projectId: string, ownerId?: string): Promise<ProjectWebhookEndpointView[]> {
  if (!ownerId) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (projectError || !project) {
    return [];
  }

  const { data, error } = await supabase.from('project_webhook_endpoints').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectWebhookEndpointRecord[]).map(toProjectWebhookEndpointView);
}

export async function listProjectWebhookDeliveries(projectId: string, ownerId?: string): Promise<ProjectWebhookDeliveryView[]> {
  if (!ownerId) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('project_webhook_deliveries')
    .select('*')
    .eq('project_id', projectId)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectWebhookDeliveryRecord[]).map(toProjectWebhookDeliveryView);
}

export async function createProjectWebhookEndpoint(
  projectId: string,
  ownerId: string | undefined,
  input: { targetUrl: string; secret?: string; payloadFormat?: string; events: string[] }
): Promise<ProjectWebhookEndpointView> {
  const targetUrl = normalizeTargetUrl(input.targetUrl);
  const events = normalizeEvents(input.events);
  const secret = input.secret?.trim() ? input.secret.trim() : null;
  const payloadFormat = webhookPayloadFormatSchema.parse(input.payloadFormat ?? 'json');
  if (!ownerId) {
    throw new Error('Authentication required');
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error('Project not found');
  }

  const { data, error } = await supabase
    .from('project_webhook_endpoints')
    .insert({ project_id: projectId, owner_id: ownerId, target_url: targetUrl, secret, payload_format: payloadFormat, events })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create project webhook endpoint');
  }

  await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: 'webhook.created', summary: `Added deployment webhook ${targetUrl}`, metadata: { targetUrl, events, payloadFormat } });
  return toProjectWebhookEndpointView(data as ProjectWebhookEndpointRecord);
}

export async function deleteProjectWebhookEndpoint(projectId: string, endpointId: string, ownerId?: string) {
  if (!ownerId) {
    throw new Error('Authentication required');
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('project_webhook_endpoints')
    .delete()
    .eq('id', endpointId)
    .eq('project_id', projectId)
    .eq('owner_id', ownerId);

  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: 'webhook.deleted', summary: 'Removed deployment webhook', metadata: { endpointId } });
}

export async function getProjectWebhookDispatchEndpoints(projectId: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('project_webhook_endpoints').select('*').eq('project_id', projectId);
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProjectWebhookEndpointRecord[];
}

export async function deliverProjectWebhooks(input: {
  event: Parameters<typeof shouldSendProjectWebhook>[1];
  projectId: string;
  payload: unknown;
}) {
  const endpoints = await getProjectWebhookDispatchEndpoints(input.projectId);

  await Promise.all(
    endpoints
      .filter((endpoint) => shouldSendProjectWebhook(endpoint.events, input.event))
      .map((endpoint) => attemptProjectWebhookDelivery({ endpoint, event: input.event, payload: input.payload }))
  );
}

export async function retryPendingProjectWebhookDeliveries(limit = 25) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { retried: 0, deadLettered: 0, succeeded: 0 };
  }

  const { data, error } = await supabase
    .from('project_webhook_deliveries')
    .select('*')
    .eq('status', 'retrying')
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  let retried = 0;
  let deadLettered = 0;
  let succeeded = 0;

  for (const row of (data ?? []) as ProjectWebhookDeliveryRecord[]) {
    const endpoint = row.endpoint_id ? await getProjectWebhookEndpointById(row.endpoint_id) : null;
    const result = await attemptProjectWebhookDelivery({
      endpoint,
      existingDelivery: row,
      event: row.event_type,
      payload: row.payload ?? {}
    });

    retried += 1;
    if (result.status === 'succeeded') {
      succeeded += 1;
    }
    if (result.status === 'dead_lettered') {
      deadLettered += 1;
    }
  }

  return { retried, deadLettered, succeeded };
}

async function attemptProjectWebhookDelivery(input: {
  endpoint: ProjectWebhookEndpointRecord | null;
  existingDelivery?: ProjectWebhookDeliveryRecord;
  event: string;
  payload: unknown;
}) {
  const ownerId = input.endpoint?.owner_id ?? input.existingDelivery?.owner_id;
  if (!ownerId) {
    throw new Error('Could not resolve owner ID for webhook delivery');
  }
  const projectId = input.endpoint?.project_id ?? input.existingDelivery?.project_id ?? '';
  const targetUrl = input.endpoint?.target_url ?? input.existingDelivery?.target_url ?? '';
  const attemptCount = (input.existingDelivery?.attempt_count ?? 0) + 1;
  const now = new Date().toISOString();
  const format = webhookPayloadFormatSchema.parse(input.endpoint?.payload_format ?? 'json');
  const rendered = renderProjectNotificationDelivery(format, input.payload as Parameters<typeof renderProjectNotificationDelivery>[1]);

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let lastError: string | null = null;
  let ok = false;

  if (!input.endpoint) {
    lastError = 'Webhook endpoint no longer exists';
  } else {
    const headers: HeadersInit = {
      'content-type': rendered.contentType,
      'x-neopages-event': input.event,
      'x-neopages-attempt': String(attemptCount)
    };

    if (input.endpoint.secret) {
      headers['x-neopages-signature-256'] = signProjectWebhookPayload(input.endpoint.secret, rendered.body);
    }

    try {
      const response = await fetch(input.endpoint.target_url, {
        method: 'POST',
        headers,
        body: rendered.body,
        signal: AbortSignal.timeout(10_000)
      });
      statusCode = response.status;
      responseBody = (await response.text()).slice(0, 2000) || null;
      ok = response.ok;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown webhook delivery failure';
    }
  }

  const classification = classifyProjectWebhookDelivery({ ok, statusCode, attemptCount });
  const baseRecord: ProjectWebhookDeliveryRecord = {
    id: input.existingDelivery?.id ?? crypto.randomUUID(),
    project_id: projectId,
    owner_id: ownerId,
    endpoint_id: input.endpoint?.id ?? input.existingDelivery?.endpoint_id ?? null,
    target_url: targetUrl,
    event_type: input.event,
    payload: (input.payload as Record<string, unknown>) ?? {},
    status: classification.status,
    attempt_count: attemptCount,
    last_response_status: statusCode,
    last_response_body: responseBody,
    last_error: lastError,
    next_retry_at: classification.nextRetryAt,
    delivered_at: classification.status === 'succeeded' ? now : null,
    dead_lettered_at: classification.status === 'dead_lettered' ? now : null,
    created_at: input.existingDelivery?.created_at ?? now,
    updated_at: now
  };

  await upsertProjectWebhookDelivery(baseRecord);

  if (classification.status === 'dead_lettered') {
    await recordProjectActivity({
      projectId,
      ownerId,
      actorId: null,
      eventType: 'webhook.deleted',
      summary: `Webhook delivery dead-lettered for ${targetUrl}`,
      metadata: { deliveryId: baseRecord.id, event: input.event }
    });
  }

  return baseRecord;
}

async function upsertProjectWebhookDelivery(record: ProjectWebhookDeliveryRecord) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('project_webhook_deliveries').upsert(record, { onConflict: 'id' });
  if (error) {
    throw new Error(error.message);
  }
}

async function getProjectWebhookEndpointById(endpointId: string): Promise<ProjectWebhookEndpointRecord | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from('project_webhook_endpoints').select('*').eq('id', endpointId).maybeSingle();
  if (error || !data) {
    return null;
  }

  return data as ProjectWebhookEndpointRecord;
}

function normalizeTargetUrl(input: string): string {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Webhook URLs must use http or https');
  }
  return url.toString();
}

function normalizeEvents(input: string[]): string[] {
  const events = input.length > 0 ? input : ['deployment.succeeded'];
  return Array.from(new Set(events.map((event) => projectNotificationEventSchema.parse(event))));
}
