import {
    buildOrganizationWebhookPayload,
    formatOrganizationActivityLabel,
    type OrganizationActivityEvent,
    type OrganizationActivityEventRecord
} from '@neopages/core';
import { deliverOrganizationWebhooks } from './organization-webhooks';
import { getOrganizationRole } from './organizations';
import { createAdminSupabaseClient } from './supabase';

export interface OrganizationActivityView {
  id: string;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

async function resolveOrganizationSummary(organizationId: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { id: organizationId, name: organizationId, slug: organizationId };
  }

  const { data } = await supabase.from('organizations').select('id, name, slug').eq('id', organizationId).maybeSingle();
  return {
    id: String((data as { id?: string } | null)?.id ?? organizationId),
    name: String((data as { name?: string } | null)?.name ?? organizationId),
    slug: String((data as { slug?: string } | null)?.slug ?? organizationId)
  };
}

function toView(record: OrganizationActivityEventRecord): OrganizationActivityView {
  return {
    id: record.id,
    eventType: record.event_type,
    summary: record.summary,
    metadata: record.metadata,
    createdAt: record.created_at
  };
}

export async function listOrganizationActivity(organizationId: string, actorId?: string): Promise<OrganizationActivityView[]> {
  const role = await getOrganizationRole(organizationId, actorId);
  if (!role) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('organization_activity_events')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as OrganizationActivityEventRecord[]).map(toView);
}

export async function recordOrganizationActivity(input: {
  organizationId: string;
  ownerId: string;
  actorId?: string | null;
  eventType: OrganizationActivityEvent;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  const record: OrganizationActivityEventRecord = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    owner_id: input.ownerId,
    actor_id: input.actorId ?? null,
    event_type: input.eventType,
    summary: input.summary ?? formatOrganizationActivityLabel(input.eventType),
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString()
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return toView(record);
  }

  const { data, error } = await supabase.from('organization_activity_events').insert(record).select('*').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to record organization activity');
  }

  const persisted = data as OrganizationActivityEventRecord;
  const organization = await resolveOrganizationSummary(input.organizationId);
  await deliverOrganizationWebhooks({
    event: input.eventType,
    organizationId: input.organizationId,
    payload: buildOrganizationWebhookPayload({
      event: input.eventType,
      organization,
      activity: { id: persisted.id, summary: persisted.summary, createdAt: persisted.created_at }
    })
  });

  return toView(persisted);
}
