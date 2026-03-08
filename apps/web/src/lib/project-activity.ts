import { formatProjectActivityLabel, type ProjectActivityEvent, type ProjectActivityEventRecord } from '@neopages/core';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectActivityView {
  id: string;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

function toView(record: ProjectActivityEventRecord): ProjectActivityView {
  return {
    id: record.id,
    eventType: record.event_type,
    summary: record.summary,
    metadata: record.metadata,
    createdAt: record.created_at
  };
}

export async function listProjectActivity(projectId: string, ownerId?: string): Promise<ProjectActivityView[]> {
  if (!ownerId) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('project_activity_events')
    .select('*')
    .eq('project_id', projectId)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectActivityEventRecord[]).map(toView);
}

export async function recordProjectActivity(input: {
  projectId: string;
  ownerId: string;
  actorId?: string | null;
  eventType: ProjectActivityEvent;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  const record: ProjectActivityEventRecord = {
    id: crypto.randomUUID(),
    project_id: input.projectId,
    owner_id: input.ownerId,
    actor_id: input.actorId ?? null,
    event_type: input.eventType,
    summary: input.summary ?? formatProjectActivityLabel(input.eventType),
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString()
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return toView(record);
  }

  const { data, error } = await supabase.from('project_activity_events').insert(record).select('*').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to record project activity');
  }

  return toView(data as ProjectActivityEventRecord);
}
