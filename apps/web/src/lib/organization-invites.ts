import type { OrganizationMemberInviteRecord } from '@neopages/core';
import { recordOrganizationActivity } from './organization-activity';
import {
    getOrganizationById,
    getOrganizationRole,
    type OrganizationRole
} from './organizations';
import { createAdminSupabaseClient } from './supabase';

export interface OrganizationInviteView {
  id: string;
  email: string;
  role: 'member';
  status: 'pending' | 'accepted' | 'revoked';
  inviteUrl: string;
  inviteToken: string;
  createdAt: string;
  respondedAt: string | null;
}

export function normalizeOrganizationInviteEmail(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Enter a valid email address');
  }
  return normalized;
}

export function canAcceptOrganizationInvite(inviteEmail: string, actorEmail: string | null | undefined): boolean {
  if (!actorEmail) {
    return false;
  }
  return normalizeOrganizationInviteEmail(inviteEmail) === normalizeOrganizationInviteEmail(actorEmail);
}

function toInviteView(record: OrganizationMemberInviteRecord): OrganizationInviteView {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return {
    id: record.id,
    email: record.email,
    role: 'member',
    status: record.status as 'pending' | 'accepted' | 'revoked',
    inviteUrl: `${appUrl}/organization-invites/${record.invite_token}`,
    inviteToken: record.invite_token,
    createdAt: record.created_at,
    respondedAt: record.responded_at
  };
}

export async function listOrganizationInvites(organizationId: string, actorId?: string): Promise<OrganizationInviteView[]> {
  const role = await getOrganizationRole(organizationId, actorId);
  const organization = await getOrganizationById(organizationId);
  if (!role || role !== 'owner' || !organization) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('organization_member_invites')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('owner_id', organization.owner_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as OrganizationMemberInviteRecord[]).map(toInviteView);
}

export async function createOrganizationInvite(
  organizationId: string,
  actorId: string | undefined,
  input: { email: string; role?: OrganizationRole }
): Promise<OrganizationInviteView> {
  const role = await getOrganizationRole(organizationId, actorId);
  const organization = await getOrganizationById(organizationId);
  if (!actorId || role !== 'owner' || !organization) {
    throw new Error('Only organization owners can manage invites');
  }

  const email = normalizeOrganizationInviteEmail(input.email);
  const inviteToken = crypto.randomUUID();
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase
    .from('organization_member_invites')
    .insert({
      organization_id: organizationId,
      owner_id: organization.owner_id,
      email,
      role: 'member',
      invite_token: inviteToken,
      status: 'pending',
      invited_by: actorId
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create organization invite');
  }

  await recordOrganizationActivity({ organizationId, ownerId: organization.owner_id, actorId, eventType: 'organization.member.invited', summary: `Invited ${email} to ${organization.name}`, metadata: { email } });
  return toInviteView(data as OrganizationMemberInviteRecord);
}

export async function revokeOrganizationInvite(organizationId: string, inviteId: string, actorId?: string) {
  const role = await getOrganizationRole(organizationId, actorId);
  const organization = await getOrganizationById(organizationId);
  if (!actorId || role !== 'owner' || !organization) {
    throw new Error('Only organization owners can manage invites');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('organization_member_invites')
    .update({ status: 'revoked', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('organization_id', organizationId)
    .eq('owner_id', organization.owner_id)
    .eq('status', 'pending');

  if (error) {
    throw new Error(error.message);
  }

  await recordOrganizationActivity({ organizationId, ownerId: organization.owner_id, actorId, eventType: 'organization.member.invite_revoked', summary: `Revoked organization invite ${inviteId}`, metadata: { inviteId } });
}

export async function getOrganizationInviteByToken(token: string): Promise<OrganizationInviteView | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('organization_member_invites')
    .select('*')
    .eq('invite_token', token)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toInviteView(data as OrganizationMemberInviteRecord);
}

export async function acceptOrganizationInvite(input: {
  token: string;
  actorId: string;
  actorEmail: string | null | undefined;
}) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: inviteData, error: inviteError } = await supabase
    .from('organization_member_invites')
    .select('*')
    .eq('invite_token', input.token)
    .eq('status', 'pending')
    .maybeSingle();

  if (inviteError || !inviteData) {
    throw new Error('Invitation not found');
  }

  const invite = inviteData as OrganizationMemberInviteRecord;
  if (!canAcceptOrganizationInvite(invite.email, input.actorEmail)) {
    throw new Error('Signed-in email does not match this invitation');
  }

  const { error: membershipError } = await supabase
    .from('organization_memberships')
    .upsert({ organization_id: invite.organization_id, user_id: input.actorId, role: 'member' }, { onConflict: 'organization_id,user_id' });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { error: inviteUpdateError } = await supabase
    .from('organization_member_invites')
    .update({ status: 'accepted', accepted_by: input.actorId, responded_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (inviteUpdateError) {
    throw new Error(inviteUpdateError.message);
  }

  await recordOrganizationActivity({ organizationId: invite.organization_id, ownerId: invite.owner_id, actorId: input.actorId, eventType: 'organization.member.invite_accepted', summary: `Accepted organization invite for ${invite.email}`, metadata: { email: invite.email } });
  return { organizationId: invite.organization_id, memberId: input.actorId };
}
