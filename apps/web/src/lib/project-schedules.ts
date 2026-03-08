import { CronExpressionParser } from 'cron-parser';

import type { ProjectDeployScheduleRecord } from '@neopages/core';

import { canEditProject, getProjectAccess } from './collaborators';
import { recordProjectActivity } from './project-activity';
import { queueProjectDeployment } from './projects-service';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectDeployScheduleView {
  id: string;
  label: string;
  branch: string;
  cronExpression: string;
  timezone: string;
  active: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export function normalizeScheduleInput(input: {
  label: string;
  branch: string;
  cronExpression: string;
  timezone?: string;
}) {
  const label = input.label.trim();
  const branch = input.branch.trim();
  const cronExpression = input.cronExpression.trim();
  const timezone = (input.timezone ?? 'UTC').trim() || 'UTC';

  if (!label) {
    throw new Error('Schedule label is required');
  }

  if (!branch) {
    throw new Error('Schedule branch is required');
  }

  getNextScheduledRunAt(cronExpression, timezone, new Date().toISOString());

  return {
    label,
    branch,
    cronExpression,
    timezone
  };
}

export function getNextScheduledRunAt(cronExpression: string, timezone: string, currentDateIso: string): string {
  const interval = CronExpressionParser.parse(cronExpression, {
    currentDate: new Date(currentDateIso),
    tz: timezone
  });

  return String(interval.next().toISOString());
}

function toView(record: ProjectDeployScheduleRecord): ProjectDeployScheduleView {
  return {
    id: record.id,
    label: record.label,
    branch: record.branch,
    cronExpression: record.cron_expression,
    timezone: record.timezone,
    active: record.active,
    nextRunAt: record.next_run_at,
    lastRunAt: record.last_run_at,
    createdAt: record.created_at
  };
}

export async function listProjectDeploySchedules(projectId: string, actorId?: string): Promise<ProjectDeployScheduleView[]> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('project_deploy_schedules')
    .select('*')
    .eq('project_id', projectId)
    .eq('owner_id', access.ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectDeployScheduleRecord[]).map(toView);
}

export async function createProjectDeploySchedule(
  projectId: string,
  actorId: string | undefined,
  input: { label: string; branch: string; cronExpression: string; timezone?: string }
): Promise<ProjectDeployScheduleView> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    throw new Error('You do not have permission to manage deploy schedules');
  }

  const normalized = normalizeScheduleInput(input);
  const now = new Date().toISOString();
  const record: ProjectDeployScheduleRecord = {
    id: crypto.randomUUID(),
    project_id: projectId,
    owner_id: access.ownerId,
    label: normalized.label,
    branch: normalized.branch,
    cron_expression: normalized.cronExpression,
    timezone: normalized.timezone,
    active: true,
    next_run_at: getNextScheduledRunAt(normalized.cronExpression, normalized.timezone, now),
    last_run_at: null,
    created_at: now,
    updated_at: now
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase.from('project_deploy_schedules').insert(record).select('*').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create deploy schedule');
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'schedule.created', summary: `Created deploy schedule ${record.label}`, metadata: { branch: record.branch, cron: record.cron_expression } });
  return toView(data as ProjectDeployScheduleRecord);
}

export async function deleteProjectDeploySchedule(projectId: string, scheduleId: string, actorId?: string) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    throw new Error('You do not have permission to manage deploy schedules');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('project_deploy_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('project_id', projectId)
    .eq('owner_id', access.ownerId);

  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'schedule.deleted', summary: `Deleted deploy schedule ${scheduleId}`, metadata: { scheduleId } });
}

export async function executeDueProjectSchedules(limit = 25) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { triggered: 0 };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('project_deploy_schedules')
    .select('*')
    .eq('active', true)
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  let triggered = 0;
  for (const row of (data ?? []) as ProjectDeployScheduleRecord[]) {
    await queueProjectDeployment(row.project_id, row.owner_id, {
      branch: row.branch,
      commitMessage: `Queued from deploy schedule ${row.label}`
    });

    const nextRunAt = getNextScheduledRunAt(row.cron_expression, row.timezone, now);
    const { error: updateError } = await supabase
      .from('project_deploy_schedules')
      .update({ last_run_at: now, next_run_at: nextRunAt })
      .eq('id', row.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    triggered += 1;
    await recordProjectActivity({ projectId: row.project_id, ownerId: row.owner_id, actorId: null, eventType: 'schedule.triggered', summary: `Triggered schedule ${row.label}`, metadata: { scheduleId: row.id } });
  }

  return { triggered };
}
