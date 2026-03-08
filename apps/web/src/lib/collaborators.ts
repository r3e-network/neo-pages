import type { ProjectCollaboratorRecord } from '@neopages/core';
import { getOrganizationRole, mapOrganizationRoleToProjectRole } from './organizations';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface ProjectCollaboratorView {
  collaboratorId: string;
  githubLogin: string | null;
  role: ProjectRole;
  createdAt: string;
}

export function normalizeProjectRole(role: string): ProjectRole {
  if (role === 'owner' || role === 'editor' || role === 'viewer') {
    return role;
  }

  throw new Error('Unsupported collaborator role');
}

export function canViewProject(role: ProjectRole): boolean {
  return role === 'owner' || role === 'editor' || role === 'viewer';
}

export function canEditProject(role: ProjectRole): boolean {
  return role === 'owner' || role === 'editor';
}

export function canManageProjectCollaborators(role: ProjectRole): boolean {
  return role === 'owner';
}

export async function getProjectAccess(projectId: string, userId?: string): Promise<{ role: ProjectRole; ownerId: string } | null> {
  if (!userId) {
    return null;
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, owner_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !project) {
    return null;
  }

  const ownerId = String((project as { owner_id: string }).owner_id);
  const organizationId = (project as { organization_id?: string | null }).organization_id ?? null;
  if (ownerId === userId) {
    return { role: 'owner', ownerId };
  }

  if (organizationId) {
    const orgRole = await getOrganizationRole(organizationId, userId);
    if (orgRole) {
      return { role: mapOrganizationRoleToProjectRole(orgRole), ownerId };
    }
  }

  const { data: collaborator, error: collaboratorError } = await supabase
    .from('project_collaborators')
    .select('role')
    .eq('project_id', projectId)
    .eq('collaborator_id', userId)
    .maybeSingle();

  if (collaboratorError || !collaborator) {
    return null;
  }

  return { role: normalizeProjectRole(String((collaborator as { role: string }).role)), ownerId };
}

export async function listAccessibleProjectRoles(userId?: string): Promise<Map<string, ProjectRole>> {
  const roles = new Map<string, ProjectRole>();
  if (!userId) {
    return roles;
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return roles;
  }

  const [{ data: ownedProjects }, { data: collaboratorRows }, { data: orgMemberships }] = await Promise.all([
    supabase.from('projects').select('id').eq('owner_id', userId),
    supabase.from('project_collaborators').select('project_id, role').eq('collaborator_id', userId),
    supabase.from('organization_memberships').select('organization_id, role').eq('user_id', userId)
  ]);

  for (const row of (ownedProjects ?? []) as Array<{ id: string }>) {
    roles.set(row.id, 'owner');
  }

  for (const row of (collaboratorRows ?? []) as Array<{ project_id: string; role: string }>) {
    if (!roles.has(row.project_id)) {
      roles.set(row.project_id, normalizeProjectRole(row.role));
    }
  }

  const membershipRoleByOrg = new Map((orgMemberships ?? []).map((row) => [String((row as { organization_id: string }).organization_id), String((row as { role: string }).role) as 'owner' | 'member']));
  const orgIds = Array.from(membershipRoleByOrg.keys());
  if (orgIds.length > 0) {
    const { data: orgProjects } = await supabase.from('projects').select('id, organization_id').in('organization_id', orgIds);
    for (const row of (orgProjects ?? []) as Array<{ id: string; organization_id: string }>) {
      if (!roles.has(row.id)) {
        const orgRole = membershipRoleByOrg.get(row.organization_id);
        if (orgRole) {
          roles.set(row.id, mapOrganizationRoleToProjectRole(orgRole));
        }
      }
    }
  }

  return roles;
}

export async function listProjectCollaborators(projectId: string, userId?: string): Promise<ProjectCollaboratorView[]> {
  const access = await getProjectAccess(projectId, userId);
  if (!access || !canViewProject(access.role)) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data: collaboratorRows, error } = await supabase.from('project_collaborators').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  const collaboratorIds = ((collaboratorRows ?? []) as ProjectCollaboratorRecord[]).map((row) => row.collaborator_id);
  const { data: profiles } = collaboratorIds.length > 0
    ? await supabase.from('profiles').select('id, github_login').in('id', collaboratorIds)
    : { data: [] as Array<{ id: string; github_login: string | null }> };
  const loginById = new Map((profiles ?? []).map((profile) => [profile.id, profile.github_login]));

  return ((collaboratorRows ?? []) as ProjectCollaboratorRecord[]).map((record) => ({
    collaboratorId: record.collaborator_id,
    githubLogin: loginById.get(record.collaborator_id) ?? null,
    role: normalizeProjectRole(record.role),
    createdAt: record.created_at
  }));
}

export async function addProjectCollaborator(
  projectId: string,
  actorId: string | undefined,
  input: { githubLogin: string; role: string }
): Promise<ProjectCollaboratorView> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canManageProjectCollaborators(access.role)) {
    throw new Error('Only the project owner can manage collaborators');
  }

  const role = normalizeProjectRole(input.role);
  if (role === 'owner') {
    throw new Error('Collaborators cannot be assigned the owner role');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, github_login')
    .eq('github_login', input.githubLogin)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error('Collaborator profile not found');
  }

  if (profile.id === access.ownerId) {
    throw new Error('The project owner already has access');
  }

  const { data, error } = await supabase
    .from('project_collaborators')
    .upsert({
      project_id: projectId,
      owner_id: access.ownerId,
      collaborator_id: profile.id,
      role
    }, { onConflict: 'project_id,collaborator_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to add collaborator');
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'collaborator.added', summary: `Added ${input.githubLogin} as ${role}`, metadata: { githubLogin: input.githubLogin, role } });
  return {
    collaboratorId: String((data as ProjectCollaboratorRecord).collaborator_id),
    githubLogin: String((profile as { github_login: string | null }).github_login ?? input.githubLogin),
    role,
    createdAt: (data as ProjectCollaboratorRecord).created_at
  };
}

export async function removeProjectCollaborator(projectId: string, actorId: string | undefined, collaboratorId: string) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canManageProjectCollaborators(access.role)) {
    throw new Error('Only the project owner can manage collaborators');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('project_collaborators')
    .delete()
    .eq('project_id', projectId)
    .eq('collaborator_id', collaboratorId)
    .eq('owner_id', access.ownerId);

  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'collaborator.removed', summary: `Removed collaborator ${collaboratorId}`, metadata: { collaboratorId } });
}
