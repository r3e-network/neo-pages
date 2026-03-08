import type { ProjectCollaboratorInviteRecord } from '@neopages/core';
import { getProjectAccess, normalizeProjectRole, type ProjectRole } from './collaborators';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectCollaboratorInviteView {
  id: string;
  email: string;
  role: ProjectRole;
  status: 'pending' | 'accepted' | 'revoked';
  inviteUrl: string;
  createdAt: string;
  respondedAt: string | null;
}

export function normalizeInviteEmail(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Enter a valid email address');
  }
  return normalized;
}

export function canAcceptCollaboratorInvite(inviteEmail: string, actorEmail: string | null | undefined): boolean {
  if (!actorEmail) {
    return false;
  }
  return normalizeInviteEmail(inviteEmail) === normalizeInviteEmail(actorEmail);
}

function toInviteView(record: ProjectCollaboratorInviteRecord): ProjectCollaboratorInviteView {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return {
    id: record.id,
    email: record.email,
    role: record.role as ProjectRole,
    status: record.status as 'pending' | 'accepted' | 'revoked',
    inviteUrl: `${appUrl}/invites/${record.invite_token}`,
    createdAt: record.created_at,
    respondedAt: record.responded_at
  };
}

export async function listProjectCollaboratorInvites(projectId: string, actorId?: string): Promise<ProjectCollaboratorInviteView[]> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('project_collaborator_invites')
    .select('*')
    .eq('project_id', projectId)
    .eq('owner_id', access.ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectCollaboratorInviteRecord[]).map(toInviteView);
}

export async function createProjectCollaboratorInvite(
  projectId: string,
  actorId: string | undefined,
  input: { email: string; role: string }
): Promise<ProjectCollaboratorInviteView> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only the project owner can invite collaborators');
  }

  const email = normalizeInviteEmail(input.email);
  const role = normalizeProjectRole(input.role);
  if (role === 'owner') {
    throw new Error('Invites cannot grant owner access');
  }

  const inviteToken = crypto.randomUUID();
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase
    .from('project_collaborator_invites')
    .insert({
      project_id: projectId,
      owner_id: access.ownerId,
      email,
      role,
      invite_token: inviteToken,
      status: 'pending',
      invited_by: actorId ?? access.ownerId
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create collaborator invite');
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'collaborator.invited', summary: `Invited ${email} as ${role}`, metadata: { email, role } });
  return toInviteView(data as ProjectCollaboratorInviteRecord);
}

export async function revokeProjectCollaboratorInvite(projectId: string, inviteId: string, actorId?: string) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only the project owner can revoke invites');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('project_collaborator_invites')
    .update({ status: 'revoked', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('project_id', projectId)
    .eq('owner_id', access.ownerId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(error.message);
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'collaborator.invite_revoked', summary: `Revoked collaborator invite ${inviteId}`, metadata: { inviteId } });
}

export async function getProjectCollaboratorInviteByToken(token: string): Promise<ProjectCollaboratorInviteView | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from('project_collaborator_invites').select('*').eq('invite_token', token).maybeSingle();
  if (error || !data) {
    return null;
  }

  return toInviteView(data as ProjectCollaboratorInviteRecord);
}

export async function acceptProjectCollaboratorInvite(input: {
  token: string;
  actorId: string;
  actorEmail: string | null | undefined;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: inviteData, error: inviteError } = await supabase
    .from('project_collaborator_invites')
    .select('*')
    .eq('invite_token', input.token)
    .eq('status', 'pending')
    .maybeSingle();

  if (inviteError || !inviteData) {
    throw new Error('Invitation not found');
  }

  const invite = inviteData as ProjectCollaboratorInviteRecord;
  if (!canAcceptCollaboratorInvite(invite.email, input.actorEmail)) {
    throw new Error('Signed-in email does not match this invitation');
  }

  const { error: collaboratorError } = await supabase
    .from('project_collaborators')
    .upsert({
      project_id: invite.project_id,
      owner_id: invite.owner_id,
      collaborator_id: input.actorId,
      role: invite.role
    }, { onConflict: 'project_id,collaborator_id' });

  if (collaboratorError) {
    throw new Error(collaboratorError.message);
  }

  const { error: inviteUpdateError } = await supabase
    .from('project_collaborator_invites')
    .update({ status: 'accepted', accepted_by: input.actorId, responded_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (inviteUpdateError) {
    throw new Error(inviteUpdateError.message);
  }

  await recordProjectActivity({ projectId: invite.project_id, ownerId: invite.owner_id, actorId: input.actorId, eventType: 'collaborator.invite_accepted', summary: `Accepted invite for ${invite.email}`, metadata: { email: invite.email, role: invite.role } });
  return { projectId: invite.project_id, collaboratorId: input.actorId };
}
