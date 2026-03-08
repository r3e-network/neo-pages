import type { ProjectEnvVarGroupItemRecord, ProjectEnvVarGroupLinkRecord, ProjectEnvVarGroupRecord } from '@neopages/core';
import { canEditProject, getProjectAccess } from './collaborators';
import { recordOrganizationActivity } from './organization-activity';
import { getOrganizationById, getOrganizationRole } from './organizations';
import { recordProjectActivity } from './project-activity';
import { normalizeEnvVarKey } from './project-env';
import { projectEnvScopeSchema, type ProjectEnvScope } from './project-env-scope';
import { createAdminSupabaseClient } from './supabase';

export type EnvGroupScope = 'personal' | 'organization';

export interface ProjectEnvGroupItemView {
  id: string;
  key: string;
  environment: ProjectEnvScope;
  maskedValue: string;
}

export interface ProjectEnvGroupView {
  id: string;
  name: string;
  description: string | null;
  attached: boolean;
  scope: EnvGroupScope;
  organizationId: string | null;
  items: ProjectEnvGroupItemView[];
}

export interface OrganizationEnvGroupView {
  id: string;
  name: string;
  description: string | null;
  scope: 'organization';
  organizationId: string;
  items: ProjectEnvGroupItemView[];
}

export function resolveEnvGroupOwnership(input: {
  requestedScope: EnvGroupScope;
  projectOrganizationId: string | null;
  actorId: string;
  effectiveOwnerId: string;
  organizationRole: 'owner' | 'member' | null;
}) {
  if (input.requestedScope === 'organization') {
    if (!input.projectOrganizationId || input.organizationRole !== 'owner') {
      throw new Error('Only organization owners can create organization-scoped groups');
    }

    return { ownerId: input.effectiveOwnerId, organizationId: input.projectOrganizationId };
  }

  return { ownerId: input.actorId, organizationId: null };
}

export function normalizeEnvGroupName(input: string): string {
  const normalized = input.trim();
  if (!normalized) {
    throw new Error('Environment group name is required');
  }
  return normalized;
}

export function getEnvGroupScope(record: { organization_id: string | null }): EnvGroupScope {
  return record.organization_id ? 'organization' : 'personal';
}

export function mergeGroupedProjectEnv(
  groupRecords: Array<{ key: string; value: string; environment: ProjectEnvScope }>,
  projectRecords: Array<{ key: string; value: string; environment: ProjectEnvScope }>,
  environment: 'production' | 'preview'
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const record of groupRecords.filter((record) => record.environment === 'all')) {
    result[record.key] = record.value;
  }
  for (const record of groupRecords.filter((record) => record.environment === environment)) {
    result[record.key] = record.value;
  }
  for (const record of projectRecords.filter((record) => record.environment === 'all')) {
    result[record.key] = record.value;
  }
  for (const record of projectRecords.filter((record) => record.environment === environment)) {
    result[record.key] = record.value;
  }

  return result;
}

function mask(value: string) {
  return value.length <= 3 ? '•'.repeat(value.length) : `${value.slice(0, 2)}${'•'.repeat(value.length - 2)}`;
}

function toItemView(item: ProjectEnvVarGroupItemRecord): ProjectEnvGroupItemView {
  return {
    id: item.id,
    key: item.key,
    environment: projectEnvScopeSchema.parse(item.environment),
    maskedValue: mask(item.value)
  };
}

function toProjectGroupView(record: ProjectEnvVarGroupRecord, items: ProjectEnvVarGroupItemRecord[], attached: boolean): ProjectEnvGroupView {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    attached,
    scope: getEnvGroupScope(record),
    organizationId: record.organization_id,
    items: items.map(toItemView)
  };
}

function toOrganizationGroupView(record: ProjectEnvVarGroupRecord, items: ProjectEnvVarGroupItemRecord[]): OrganizationEnvGroupView {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    scope: 'organization',
    organizationId: record.organization_id ?? '',
    items: items.map(toItemView)
  };
}

function buildItemsByGroup(items: ProjectEnvVarGroupItemRecord[]) {
  const itemsByGroup = new Map<string, ProjectEnvVarGroupItemRecord[]>();
  for (const item of items) {
    const current = itemsByGroup.get(item.group_id) ?? [];
    current.push(item);
    itemsByGroup.set(item.group_id, current);
  }
  return itemsByGroup;
}

async function resolveProjectOrganizationId(projectId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from('projects').select('organization_id').eq('id', projectId).maybeSingle();
  return (data as { organization_id?: string | null } | null)?.organization_id ?? null;
}

async function ensureOrganizationOwner(organizationId: string, actorId: string | undefined) {
  const role = await getOrganizationRole(organizationId, actorId);
  if (!actorId || role !== 'owner') {
    throw new Error('Only organization owners can manage organization environment groups');
  }

  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    throw new Error('Organization not found');
  }

  return { role, organization };
}

async function resolvePersistedGroupOrganizationId(groupId: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from('project_env_var_groups').select('organization_id').eq('id', groupId).maybeSingle();
  return (data as { organization_id?: string | null } | null)?.organization_id ?? null;
}

async function assertOrganizationScopedGroupEditable(groupId: string, actorId: string | undefined) {
  const organizationId = await resolvePersistedGroupOrganizationId(groupId);
  if (!organizationId) {
    return;
  }

  const role = await getOrganizationRole(organizationId, actorId);
  if (role !== 'owner') {
    throw new Error('Only organization owners can edit organization-scoped environment groups');
  }
}

export async function listProjectEnvGroups(projectId: string, actorId?: string): Promise<ProjectEnvGroupView[]> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const organizationId = await resolveProjectOrganizationId(projectId);

  const [{ data: groupsData, error: groupsError }, { data: linksData, error: linksError }, { data: itemsData, error: itemsError }] = await Promise.all([
    organizationId
      ? supabase
          .from('project_env_var_groups')
          .select('*')
          .or(`organization_id.eq.${organizationId},and(owner_id.eq.${access.ownerId},organization_id.is.null)`)
          .order('created_at', { ascending: false })
      : supabase.from('project_env_var_groups').select('*').eq('owner_id', access.ownerId).is('organization_id', null).order('created_at', { ascending: false }),
    supabase.from('project_env_var_group_links').select('*').eq('project_id', projectId),
    organizationId
      ? supabase
          .from('project_env_var_group_items')
          .select('*')
          .or(`organization_id.eq.${organizationId},and(owner_id.eq.${access.ownerId},organization_id.is.null)`)
          .order('created_at', { ascending: true })
      : supabase.from('project_env_var_group_items').select('*').eq('owner_id', access.ownerId).is('organization_id', null).order('created_at', { ascending: true })
  ]);

  if (groupsError || linksError || itemsError) {
    throw new Error(groupsError?.message ?? linksError?.message ?? itemsError?.message ?? 'Failed to load environment groups');
  }

  const attachedIds = new Set(((linksData ?? []) as ProjectEnvVarGroupLinkRecord[]).map((link) => link.group_id));
  const itemsByGroup = buildItemsByGroup((itemsData ?? []) as ProjectEnvVarGroupItemRecord[]);

  return ((groupsData ?? []) as ProjectEnvVarGroupRecord[]).map((group) => toProjectGroupView(group, itemsByGroup.get(group.id) ?? [], attachedIds.has(group.id)));
}

export async function listOrganizationEnvGroups(organizationId: string, actorId?: string): Promise<OrganizationEnvGroupView[]> {
  const role = await getOrganizationRole(organizationId, actorId);
  if (!role) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const [{ data: groupsData, error: groupsError }, { data: itemsData, error: itemsError }] = await Promise.all([
    supabase.from('project_env_var_groups').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('project_env_var_group_items').select('*').eq('organization_id', organizationId).order('created_at', { ascending: true })
  ]);

  if (groupsError || itemsError) {
    throw new Error(groupsError?.message ?? itemsError?.message ?? 'Failed to load organization environment groups');
  }

  const itemsByGroup = buildItemsByGroup((itemsData ?? []) as ProjectEnvVarGroupItemRecord[]);
  return ((groupsData ?? []) as ProjectEnvVarGroupRecord[]).map((group) => toOrganizationGroupView(group, itemsByGroup.get(group.id) ?? []));
}

export async function createProjectEnvGroup(
  projectId: string,
  actorId: string | undefined,
  input: { name: string; description?: string | null; scope?: EnvGroupScope }
) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    throw new Error('You do not have permission to manage environment groups');
  }

  const name = normalizeEnvGroupName(input.name);
  const description = input.description?.trim() || null;
  const now = new Date().toISOString();

  const projectOrgId = await resolveProjectOrganizationId(projectId);
  const orgRole = projectOrgId ? await getOrganizationRole(projectOrgId, actorId) : null;

  const ownership = resolveEnvGroupOwnership({
    requestedScope: input.scope ?? 'personal',
    projectOrganizationId: projectOrgId,
    actorId: actorId ?? access.ownerId,
    effectiveOwnerId: access.ownerId,
    organizationRole: orgRole
  });

  const group: ProjectEnvVarGroupRecord = {
    id: crypto.randomUUID(),
    owner_id: ownership.ownerId,
    organization_id: ownership.organizationId,
    name,
    description,
    created_at: now,
    updated_at: now
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: groupData, error: groupError } = await supabase.from('project_env_var_groups').insert(group).select('*').single();
  if (groupError || !groupData) {
    throw new Error(groupError?.message ?? 'Failed to create environment group');
  }

  const { error: linkError } = await supabase.from('project_env_var_group_links').insert({
    project_id: projectId,
    group_id: groupData.id,
    owner_id: access.ownerId
  });
  if (linkError) {
    throw new Error(linkError.message);
  }

  const persistedGroup = groupData as ProjectEnvVarGroupRecord;
  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'env_group.created', summary: `Created environment group ${name}`, metadata: { groupId: persistedGroup.id, scope: getEnvGroupScope(persistedGroup) } });
  if (persistedGroup.organization_id) {
    await recordOrganizationActivity({ organizationId: persistedGroup.organization_id, ownerId: persistedGroup.owner_id, actorId: actorId ?? null, eventType: 'organization.env_group.created', summary: `Created organization environment group ${name}`, metadata: { groupId: persistedGroup.id } });
  }
  return toProjectGroupView(persistedGroup, [], true);
}

export async function createOrganizationEnvGroup(
  organizationId: string,
  actorId: string | undefined,
  input: { name: string; description?: string | null }
): Promise<OrganizationEnvGroupView> {
  const { organization } = await ensureOrganizationOwner(organizationId, actorId);
  const name = normalizeEnvGroupName(input.name);
  const description = input.description?.trim() || null;
  const now = new Date().toISOString();

  const group: ProjectEnvVarGroupRecord = {
    id: crypto.randomUUID(),
    owner_id: organization.owner_id,
    organization_id: organizationId,
    name,
    description,
    created_at: now,
    updated_at: now
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase.from('project_env_var_groups').insert(group).select('*').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create organization environment group');
  }

  await recordOrganizationActivity({ organizationId, ownerId: organization.owner_id, actorId: actorId ?? null, eventType: 'organization.env_group.created', summary: `Created organization environment group ${name}`, metadata: { groupId: (data as ProjectEnvVarGroupRecord).id } });
  return toOrganizationGroupView(data as ProjectEnvVarGroupRecord, []);
}

export async function upsertProjectEnvGroupItem(
  projectId: string,
  groupId: string,
  actorId: string | undefined,
  input: { key: string; value: string; environment?: string }
) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    throw new Error('You do not have permission to manage environment groups');
  }

  await assertOrganizationScopedGroupEditable(groupId, actorId);

  const key = normalizeEnvVarKey(input.key);
  const value = input.value;
  const environment = projectEnvScopeSchema.parse(input.environment ?? 'all');
  const now = new Date().toISOString();
  const groupOrganizationId = await resolvePersistedGroupOrganizationId(groupId);

  const item: ProjectEnvVarGroupItemRecord = {
    id: crypto.randomUUID(),
    group_id: groupId,
    owner_id: access.ownerId,
    organization_id: groupOrganizationId,
    key,
    value,
    environment,
    created_at: now,
    updated_at: now
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase.from('project_env_var_group_items').upsert({ group_id: groupId, owner_id: access.ownerId, organization_id: groupOrganizationId, key, value, environment }, { onConflict: 'group_id,key,environment' });
  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'env_group.item_saved', summary: `Saved ${environment} variable ${key} in group`, metadata: { groupId, key, environment } });
  if (groupOrganizationId) {
    await recordOrganizationActivity({ organizationId: groupOrganizationId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'organization.env_group.item_saved', summary: `Saved ${environment} variable ${key} in organization environment group`, metadata: { groupId, key, environment } });
  }
}


export async function upsertOrganizationEnvGroupItem(
  organizationId: string,
  groupId: string,
  actorId: string | undefined,
  input: { key: string; value: string; environment?: string }
) {
  const { organization } = await ensureOrganizationOwner(organizationId, actorId);
  const key = normalizeEnvVarKey(input.key);
  const value = input.value;
  const environment = projectEnvScopeSchema.parse(input.environment ?? 'all');
  const now = new Date().toISOString();
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: groupData, error: groupError } = await supabase
    .from('project_env_var_groups')
    .select('id')
    .eq('id', groupId)
    .eq('organization_id', organizationId)
    .eq('owner_id', organization.owner_id)
    .maybeSingle();

  if (groupError || !groupData) {
    throw new Error(groupError?.message ?? 'Environment group not found');
  }

  const { error } = await supabase.from('project_env_var_group_items').upsert(
    {
      group_id: groupId,
      owner_id: organization.owner_id,
      organization_id: organizationId,
      key,
      value,
      environment
    },
    { onConflict: 'group_id,key,environment' }
  );
  if (error) {
    throw new Error(error.message);
  }

  await recordOrganizationActivity({ organizationId, ownerId: organization.owner_id, actorId: actorId ?? null, eventType: 'organization.env_group.item_saved', summary: `Saved ${environment} variable ${key} in organization environment group`, metadata: { groupId, key, environment } });
}

export async function deleteOrganizationEnvGroup(organizationId: string, groupId: string, actorId?: string) {
  const { organization } = await ensureOrganizationOwner(organizationId, actorId);
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('project_env_var_groups')
    .delete()
    .eq('id', groupId)
    .eq('organization_id', organizationId)
    .eq('owner_id', organization.owner_id);

  if (error) {
    throw new Error(error.message);
  }

  await recordOrganizationActivity({ organizationId, ownerId: organization.owner_id, actorId: actorId ?? null, eventType: 'organization.env_group.deleted', summary: `Deleted organization environment group ${groupId}`, metadata: { groupId } });
}

export async function attachProjectEnvGroup(projectId: string, groupId: string, actorId?: string) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    throw new Error('You do not have permission to manage environment groups');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase.from('project_env_var_group_links').upsert({ project_id: projectId, group_id: groupId, owner_id: access.ownerId }, { onConflict: 'project_id,group_id' });
  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'env_group.attached', summary: `Attached environment group ${groupId}`, metadata: { groupId } });
}

export async function detachProjectEnvGroup(projectId: string, groupId: string, actorId?: string) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    throw new Error('You do not have permission to manage environment groups');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase.from('project_env_var_group_links').delete().eq('project_id', projectId).eq('group_id', groupId).eq('owner_id', access.ownerId);
  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'env_group.detached', summary: `Detached environment group ${groupId}`, metadata: { groupId } });
}

export async function getProjectGroupEnv(projectId: string): Promise<Array<{ key: string; value: string; environment: ProjectEnvScope }>> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data: links, error: linksError } = await supabase.from('project_env_var_group_links').select('group_id').eq('project_id', projectId);
  if (linksError) {
    throw new Error(linksError.message);
  }

  const groupIds = (links ?? []).map((link) => (link as { group_id: string }).group_id);
  if (groupIds.length === 0) {
    return [];
  }

  const { data: items, error: itemsError } = await supabase.from('project_env_var_group_items').select('key, value, environment').in('group_id', groupIds).order('created_at', { ascending: true });
  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return ((items ?? []) as Array<{ key: string; value: string; environment: string }>).map((item) => ({
    key: item.key,
    value: item.value,
    environment: projectEnvScopeSchema.parse(item.environment)
  }));
}
