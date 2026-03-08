import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ProjectDeployHookRecord } from '@neopages/core';

import { getProjectAccess } from './collaborators';
import { getAppUrl } from './env';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectDeployHookView {
  id: string;
  label: string;
  hookUrl: string;
  createdAt: string;
  lastTriggeredAt: string | null;
}

export interface ProjectDeployHookSecret extends ProjectDeployHookView {
  secret: string;
}

export function normalizeDeployHookLabel(input: string): string {
  const normalized = input.trim();
  if (!normalized) {
    throw new Error('Deploy hook label is required');
  }
  return normalized;
}

export function buildProjectDeployHookUrl(appUrl: string, hookId: string): string {
  return new URL(`/api/deploy-hooks/${hookId}`, appUrl).toString();
}

export function signDeployHookPayload(secret: string, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

export function verifyDeployHookSignature(secret: string, rawBody: string, signature: string | null | undefined): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const expected = signDeployHookPayload(secret, rawBody);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function toView(record: ProjectDeployHookRecord): ProjectDeployHookView {
  return {
    id: record.id,
    label: record.label,
    hookUrl: buildProjectDeployHookUrl(getAppUrl(), record.id),
    createdAt: record.created_at,
    lastTriggeredAt: record.last_triggered_at
  };
}

export async function listProjectDeployHooks(projectId: string, actorId?: string): Promise<ProjectDeployHookView[]> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('project_deploy_hooks')
    .select('*')
    .eq('project_id', projectId)
    .eq('owner_id', access.ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectDeployHookRecord[]).map(toView);
}

export async function createProjectDeployHook(
  projectId: string,
  actorId: string | undefined,
  input: { label: string }
): Promise<ProjectDeployHookSecret> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only the project owner can manage deploy hooks');
  }

  const label = normalizeDeployHookLabel(input.label);
  const secret = crypto.randomUUID().replace(/-/g, '');
  const record: ProjectDeployHookRecord = {
    id: crypto.randomUUID(),
    project_id: projectId,
    owner_id: access.ownerId,
    label,
    secret,
    last_triggered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase.from('project_deploy_hooks').insert(record).select('*').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create deploy hook');
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'deploy_hook.created', summary: `Created deploy hook ${label}`, metadata: { label } });
  return { ...toView(data as ProjectDeployHookRecord), secret };
}

export async function deleteProjectDeployHook(projectId: string, hookId: string, actorId?: string) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only the project owner can manage deploy hooks');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase.from('project_deploy_hooks').delete().eq('id', hookId).eq('project_id', projectId).eq('owner_id', access.ownerId);
  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'deploy_hook.deleted', summary: `Deleted deploy hook ${hookId}`, metadata: { hookId } });
}

export async function getProjectDeployHookById(hookId: string): Promise<ProjectDeployHookRecord | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from('project_deploy_hooks').select('*').eq('id', hookId).maybeSingle();
  if (error || !data) {
    return null;
  }

  return data as ProjectDeployHookRecord;
}

export async function touchProjectDeployHook(hookId: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.from('project_deploy_hooks').update({ last_triggered_at: new Date().toISOString() }).eq('id', hookId);
}
