import type { ProjectEnvVarRecord } from '@neopages/core';
import { recordProjectActivity } from './project-activity';
import { getProjectGroupEnv, mergeGroupedProjectEnv } from './project-env-groups';
import { projectEnvScopeSchema, type ProjectEnvScope } from './project-env-scope';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectEnvVarView {
  id: string;
  key: string;
  environment: ProjectEnvScope;
  maskedValue: string;
  createdAt: string;
  updatedAt: string;
}

export function normalizeEnvVarKey(input: string): string {
  const normalized = input.trim().toUpperCase();
  if (!/^[A-Z_][A-Z0-9_]*$/.test(normalized)) {
    throw new Error('Environment variable keys must start with a letter or underscore and contain only A-Z, 0-9, and _.');
  }
  return normalized;
}

export function maskEnvVarValue(value: string): string {
  if (value.length <= 3) {
    return '•'.repeat(value.length);
  }

  return `${value.slice(0, 2)}${'•'.repeat(value.length - 2)}`;
}

export function toProjectEnvVarView(record: ProjectEnvVarRecord): ProjectEnvVarView {
  return {
    id: record.id,
    key: record.key,
    environment: projectEnvScopeSchema.parse(record.environment),
    maskedValue: maskEnvVarValue(record.value),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export async function listProjectEnvVars(projectId: string, ownerId?: string): Promise<ProjectEnvVarView[]> {
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

  const { data, error } = await supabase.from('project_env_vars').select('*').eq('project_id', projectId).order('key', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectEnvVarRecord[]).map(toProjectEnvVarView);
}

export async function upsertProjectEnvVar(projectId: string, ownerId: string | undefined, input: { key: string; value: string; environment?: string }) {
  const key = normalizeEnvVarKey(input.key);
  const value = input.value;
  const environment = projectEnvScopeSchema.parse(input.environment ?? 'all');

  if (!value) {
    throw new Error('Environment variable values cannot be empty');
  }
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
    .from('project_env_vars')
    .upsert({ project_id: projectId, owner_id: ownerId, key, value, environment }, { onConflict: 'project_id,key,environment' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save environment variable');
  }

  await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: 'env_var.saved', summary: `Saved ${environment} environment variable ${key}`, metadata: { key, environment } });
  return toProjectEnvVarView(data as ProjectEnvVarRecord);
}

export async function deleteProjectEnvVar(projectId: string, envVarId: string, ownerId?: string) {
  if (!ownerId) {
    throw new Error('Authentication required');
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('project_env_vars')
    .delete()
    .eq('id', envVarId)
    .eq('project_id', projectId)
    .eq('owner_id', ownerId);

  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: 'env_var.deleted', summary: 'Deleted environment variable', metadata: { envVarId } });
}

export async function getProjectBuildEnv(projectId: string, environment: 'production' | 'preview'): Promise<Record<string, string>> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return {};
  }

  const { data, error } = await supabase.from('project_env_vars').select('key, value').eq('project_id', projectId);
  if (error) {
    throw new Error(error.message);
  }

  return mergeGroupedProjectEnv(await getProjectGroupEnv(projectId), ((data ?? []) as Array<Pick<ProjectEnvVarRecord, 'key' | 'value' | 'environment'>>).map((record) => ({ key: record.key, value: record.value, environment: projectEnvScopeSchema.parse(record.environment) })), environment);
}
