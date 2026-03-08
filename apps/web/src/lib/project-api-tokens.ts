import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import type { ProjectApiTokenRecord } from '@neopages/core';

import { getProjectAccess } from './collaborators';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

export const projectTokenScopes = ['project:read', 'deployments:read', 'deployments:write'] as const;
export type ProjectTokenScope = (typeof projectTokenScopes)[number];
export const projectTokenScopeSchema = z.enum(projectTokenScopes);

export interface ProjectApiTokenView {
  id: string;
  label: string;
  tokenPrefix: string;
  scopes: ProjectTokenScope[];
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ProjectApiTokenSecret extends ProjectApiTokenView {
  token: string;
}

export function normalizeProjectTokenScopes(scopes: string[]): ProjectTokenScope[] {
  return Array.from(new Set(scopes.map((scope) => projectTokenScopeSchema.parse(scope))));
}

export function buildProjectApiToken(prefix: string, secret: string): string {
  return `npt_${prefix}.${secret}`;
}

export function hashProjectApiTokenSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function tokenHasScope(scopes: string[], requiredScope: ProjectTokenScope): boolean {
  return scopes.includes(requiredScope);
}

function toView(record: ProjectApiTokenRecord): ProjectApiTokenView {
  return {
    id: record.id,
    label: record.label,
    tokenPrefix: record.token_prefix,
    scopes: record.scopes as ProjectTokenScope[],
    createdAt: record.created_at,
    lastUsedAt: record.last_used_at
  };
}

export async function listProjectApiTokens(projectId: string, actorId?: string): Promise<ProjectApiTokenView[]> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('project_api_tokens').select('*').eq('project_id', projectId).eq('owner_id', access.ownerId).order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectApiTokenRecord[]).map(toView);
}

export async function createProjectApiToken(
  projectId: string,
  actorId: string | undefined,
  input: { label: string; scopes: string[] }
): Promise<ProjectApiTokenSecret> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only the project owner can manage API tokens');
  }

  const label = input.label.trim();
  if (!label) {
    throw new Error('Token label is required');
  }

  const scopes = normalizeProjectTokenScopes(input.scopes.length > 0 ? input.scopes : ['project:read']);
  const tokenPrefix = randomBytes(6).toString('hex');
  const secret = randomBytes(24).toString('hex');
  const token = buildProjectApiToken(tokenPrefix, secret);
  const tokenHash = hashProjectApiTokenSecret(secret);

  const record: ProjectApiTokenRecord = {
    id: crypto.randomUUID(),
    project_id: projectId,
    owner_id: access.ownerId,
    label,
    token_prefix: tokenPrefix,
    token_hash: tokenHash,
    scopes,
    last_used_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase.from('project_api_tokens').insert(record).select('*').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create project API token');
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'api_token.created', summary: `Created project API token ${label}`, metadata: { label, scopes } });
  return { ...toView(data as ProjectApiTokenRecord), token };
}

export async function deleteProjectApiToken(projectId: string, tokenId: string, actorId?: string) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only the project owner can manage API tokens');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase.from('project_api_tokens').delete().eq('id', tokenId).eq('project_id', projectId).eq('owner_id', access.ownerId);
  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'api_token.deleted', summary: `Deleted project API token ${tokenId}`, metadata: { tokenId } });
}

export async function resolveProjectApiToken(rawToken: string | null | undefined) {
  if (!rawToken) {
    return null;
  }

  const token = rawToken.trim();
  const match = token.match(/^npt_([a-f0-9]{12})\.([a-f0-9]+)$/i);
  if (!match) {
    return null;
  }

  const [, tokenPrefix, secret] = match;
  const tokenHash = hashProjectApiTokenSecret(secret);
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from('project_api_tokens').select('*').eq('token_prefix', tokenPrefix).maybeSingle();
  if (error || !data) {
    return null;
  }

  const record = data as ProjectApiTokenRecord;
  if (!safeTokenHashEqual(record.token_hash, tokenHash)) {
    return null;
  }

  await supabase.from('project_api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', record.id);
  return {
    projectId: record.project_id,
    ownerId: record.owner_id,
    scopes: record.scopes as ProjectTokenScope[]
  };
}

function safeTokenHashEqual(left: string, right: string) {
  try {
    return timingSafeEqual(Buffer.from(left), Buffer.from(right));
  } catch {
    return false;
  }
}
