import type { OrganizationWebhookDeliveryRecord, OrganizationWebhookEndpointRecord } from '@neopages/core';
import {
    organizationNotificationEventSchema,
    organizationNotificationEvents,
    renderOrganizationNotificationDelivery,
    shouldSendOrganizationWebhook,
    signProjectWebhookPayload,
    webhookPayloadFormatSchema
} from '@neopages/core';
import { getOrganizationById, getOrganizationRole } from './organizations';
import { classifyProjectWebhookDelivery } from './project-webhook-deliveries';
import { createAdminSupabaseClient } from './supabase';

export interface OrganizationWebhookEndpointView {
  id: string;
  targetUrl: string;
  hasSecret: boolean;
  payloadFormat: 'json' | 'slack';
  events: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationWebhookDeliveryView {
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

export function listSupportedOrganizationWebhookEvents() {
  return [...organizationNotificationEvents];
}

export function toOrganizationWebhookEndpointView(record: OrganizationWebhookEndpointRecord): OrganizationWebhookEndpointView {
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

export function toOrganizationWebhookDeliveryView(record: OrganizationWebhookDeliveryRecord): OrganizationWebhookDeliveryView {
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

export async function listOrganizationWebhookEndpoints(organizationId: string, actorId?: string): Promise<OrganizationWebhookEndpointView[]> {
  const role = await getOrganizationRole(organizationId, actorId);
  if (role !== 'owner') {
    return [];
  }
  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('organization_webhook_endpoints')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('owner_id', organization.owner_id)
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as OrganizationWebhookEndpointRecord[]).map(toOrganizationWebhookEndpointView);
}

export async function listOrganizationWebhookDeliveries(organizationId: string, actorId?: string): Promise<OrganizationWebhookDeliveryView[]> {
  const role = await getOrganizationRole(organizationId, actorId);
  if (role !== 'owner') {
    return [];
  }
  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('organization_webhook_deliveries')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('owner_id', organization.owner_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as OrganizationWebhookDeliveryRecord[]).map(toOrganizationWebhookDeliveryView);
}

export async function createOrganizationWebhookEndpoint(
  organizationId: string,
  actorId: string | undefined,
  input: { targetUrl: string; secret?: string; payloadFormat?: string; events: string[] }
): Promise<OrganizationWebhookEndpointView> {
  const role = await getOrganizationRole(organizationId, actorId);
  const organization = await getOrganizationById(organizationId);
  if (!actorId || role !== 'owner' || !organization) {
    throw new Error('Only organization owners can manage activity webhooks');
  }

  const targetUrl = normalizeTargetUrl(input.targetUrl);
  const events = normalizeOrganizationWebhookEvents(input.events);
  const secret = input.secret?.trim() ? input.secret.trim() : null;
  const payloadFormat = webhookPayloadFormatSchema.parse(input.payloadFormat ?? 'json');
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase
    .from('organization_webhook_endpoints')
    .insert({
      organization_id: organizationId,
      owner_id: organization.owner_id,
      target_url: targetUrl,
      secret,
      payload_format: payloadFormat,
      events
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create organization webhook endpoint');
  }

  return toOrganizationWebhookEndpointView(data as OrganizationWebhookEndpointRecord);
}

export async function deleteOrganizationWebhookEndpoint(organizationId: string, endpointId: string, actorId?: string) {
  const role = await getOrganizationRole(organizationId, actorId);
  const organization = await getOrganizationById(organizationId);
  if (!actorId || role !== 'owner' || !organization) {
    throw new Error('Only organization owners can manage activity webhooks');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('organization_webhook_endpoints')
    .delete()
    .eq('id', endpointId)
    .eq('organization_id', organizationId)
    .eq('owner_id', organization.owner_id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deliverOrganizationWebhooks(input: {
  event: string;
  organizationId: string;
  payload: unknown;
}) {
  const endpoints = await getOrganizationWebhookEndpointsForDelivery(input.organizationId);
  for (const endpoint of endpoints) {
    if (!shouldSendOrganizationWebhook(endpoint.events, organizationNotificationEventSchema.parse(input.event))) {
      continue;
    }

    await attemptOrganizationWebhookDelivery({
      endpoint,
      event: input.event,
      payload: input.payload
    });
  }
}

export async function retryPendingOrganizationWebhookDeliveries(limit = 25) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { retried: 0, deadLettered: 0, succeeded: 0 };
  }

  const { data, error } = await supabase
    .from('organization_webhook_deliveries')
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

  for (const row of (data ?? []) as OrganizationWebhookDeliveryRecord[]) {
    const endpoint = row.endpoint_id ? await getOrganizationWebhookEndpointById(row.endpoint_id) : null;
    const result = await attemptOrganizationWebhookDelivery({
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

async function getOrganizationWebhookEndpointsForDelivery(organizationId: string): Promise<OrganizationWebhookEndpointRecord[]> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('organization_webhook_endpoints').select('*').eq('organization_id', organizationId);
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrganizationWebhookEndpointRecord[];
}

async function attemptOrganizationWebhookDelivery(input: {
  endpoint: OrganizationWebhookEndpointRecord | null;
  existingDelivery?: OrganizationWebhookDeliveryRecord;
  event: string;
  payload: unknown;
}) {
  const ownerId = input.endpoint?.owner_id ?? input.existingDelivery?.owner_id;
  if (!ownerId) {
    throw new Error('Could not resolve owner ID for webhook delivery');
  }
  const organizationId = input.endpoint?.organization_id ?? input.existingDelivery?.organization_id ?? '';
  const targetUrl = input.endpoint?.target_url ?? input.existingDelivery?.target_url ?? '';
  const attemptCount = (input.existingDelivery?.attempt_count ?? 0) + 1;
  const now = new Date().toISOString();
  const format = webhookPayloadFormatSchema.parse(input.endpoint?.payload_format ?? 'json');
  const rendered = renderOrganizationNotificationDelivery(format, input.payload as Parameters<typeof renderOrganizationNotificationDelivery>[1]);

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
  const baseRecord: OrganizationWebhookDeliveryRecord = {
    id: input.existingDelivery?.id ?? crypto.randomUUID(),
    organization_id: organizationId,
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

  await upsertOrganizationWebhookDelivery(baseRecord);
  return baseRecord;
}

async function upsertOrganizationWebhookDelivery(record: OrganizationWebhookDeliveryRecord) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('organization_webhook_deliveries').upsert(record, { onConflict: 'id' });
  if (error) {
    throw new Error(error.message);
  }
}

async function getOrganizationWebhookEndpointById(endpointId: string): Promise<OrganizationWebhookEndpointRecord | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from('organization_webhook_endpoints').select('*').eq('id', endpointId).maybeSingle();
  if (error || !data) {
    return null;
  }

  return data as OrganizationWebhookEndpointRecord;
}

function normalizeTargetUrl(input: string): string {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Webhook URLs must use http or https');
  }
  return url.toString();
}

function normalizeOrganizationWebhookEvents(input: string[]): string[] {
  const events = input.length > 0 ? input : ['organization.member.invited'];
  return Array.from(new Set(events.map((event) => organizationNotificationEventSchema.parse(event))));
}
