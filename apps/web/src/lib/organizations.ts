import type { OrganizationMembershipRecord, OrganizationRecord } from '@neopages/core';
import { recordOrganizationActivity } from './organization-activity';
import { createAdminSupabaseClient } from './supabase';

export type OrganizationRole = 'owner' | 'member';

export interface OrganizationView {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
  planTier: 'free' | 'pro' | 'enterprise' | 'custom';
  monthlyBandwidthLimitBytes: number;
  monthlyRequestLimit: number;
  requirePromotionApproval: boolean;
  protectedBranches: string[];
}

export interface OrganizationMemberView {
  memberId: string;
  githubLogin: string | null;
  role: OrganizationRole;
  createdAt: string;
}

function toView(org: OrganizationRecord, role: OrganizationRole): OrganizationView {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    role,
    planTier: org.plan_tier,
    monthlyBandwidthLimitBytes: org.monthly_bandwidth_limit_bytes,
    monthlyRequestLimit: org.monthly_request_limit,
    requirePromotionApproval: org.require_promotion_approval,
    protectedBranches: org.protected_branches
  };
}

export function normalizeOrganizationSlug(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!normalized) {
    throw new Error('Organization slug is required');
  }
  return normalized;
}

export function normalizeOrganizationMemberLogin(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    throw new Error('GitHub login is required');
  }
  return normalized;
}

export function mapOrganizationRoleToProjectRole(role: OrganizationRole): 'owner' | 'editor' {
  return role === 'owner' ? 'owner' : 'editor';
}

export function resolveInheritedProjectGovernance(input: {
  project: {
    useOrganizationQuotas: boolean;
    useOrganizationReleasePolicy: boolean;
    planTier: 'free' | 'pro' | 'enterprise' | 'custom';
    monthlyBandwidthLimitBytes: number;
    monthlyRequestLimit: number;
    requirePromotionApproval: boolean;
    protectedBranches: string[];
  };
  organization: {
    planTier: 'free' | 'pro' | 'enterprise' | 'custom';
    monthlyBandwidthLimitBytes: number;
    monthlyRequestLimit: number;
    requirePromotionApproval: boolean;
    protectedBranches: string[];
  };
}) {
  return {
    planTier: input.project.useOrganizationQuotas ? input.organization.planTier : input.project.planTier,
    monthlyBandwidthLimitBytes: input.project.useOrganizationQuotas
      ? input.organization.monthlyBandwidthLimitBytes
      : input.project.monthlyBandwidthLimitBytes,
    monthlyRequestLimit: input.project.useOrganizationQuotas ? input.organization.monthlyRequestLimit : input.project.monthlyRequestLimit,
    requirePromotionApproval: input.project.useOrganizationReleasePolicy
      ? input.organization.requirePromotionApproval
      : input.project.requirePromotionApproval,
    protectedBranches: input.project.useOrganizationReleasePolicy ? input.organization.protectedBranches : input.project.protectedBranches
  };
}

export async function listUserOrganizations(userId?: string): Promise<OrganizationView[]> {
  if (!userId) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from('organizations').select('*').eq('owner_id', userId),
    supabase.from('organization_memberships').select('organization_id, role').eq('user_id', userId)
  ]);

  const membershipRoleByOrg = new Map((memberships ?? []).map((row) => [String((row as { organization_id: string }).organization_id), String((row as { role: string }).role) as OrganizationRole]));
  const orgIds = Array.from(new Set([...(owned ?? []).map((org) => String((org as { id: string }).id)), ...membershipRoleByOrg.keys()]));
  if (orgIds.length === 0) {
    return [];
  }

  const { data: organizations } = await supabase.from('organizations').select('*').in('id', orgIds).order('created_at', { ascending: true });
  return ((organizations ?? []) as OrganizationRecord[]).map((org) => toView(org, org.owner_id === userId ? 'owner' : membershipRoleByOrg.get(org.id) ?? 'member'));
}

export async function createOrganization(actorId: string | undefined, input: { name: string; slug?: string }) {
  if (!actorId) {
    throw new Error('Authentication required');
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error('Organization name is required');
  }
  const slug = normalizeOrganizationSlug(input.slug ?? input.name);

  const record: OrganizationRecord = {
    id: crypto.randomUUID(),
    owner_id: actorId,
    name,
    slug,
    plan_tier: 'free',
    monthly_bandwidth_limit_bytes: 10 * 1024 * 1024 * 1024,
    monthly_request_limit: 100_000,
    require_promotion_approval: false,
    protected_branches: ['main'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase.from('organizations').insert(record).select('*').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create organization');
  }

  const { error: membershipError } = await supabase.from('organization_memberships').upsert({
    organization_id: (data as OrganizationRecord).id,
    user_id: actorId,
    role: 'owner'
  }, { onConflict: 'organization_id,user_id' });
  if (membershipError) {
    throw new Error(membershipError.message);
  }

  await recordOrganizationActivity({ organizationId: (data as OrganizationRecord).id, ownerId: actorId, actorId, eventType: 'organization.created', summary: `Created organization ${(data as OrganizationRecord).name}` });
  return data as OrganizationRecord;
}

export async function updateOrganizationGovernance(
  organizationId: string,
  actorId: string | undefined,
  input: {
    planTier: 'free' | 'pro' | 'enterprise' | 'custom';
    monthlyBandwidthLimitBytes: number;
    monthlyRequestLimit: number;
    requirePromotionApproval: boolean;
    protectedBranches: string[];
  }
): Promise<OrganizationView> {
  const role = await getOrganizationRole(organizationId, actorId);
  if (!actorId || role !== 'owner') {
    throw new Error('Only organization owners can manage governance');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase
    .from('organizations')
    .update({
      plan_tier: input.planTier,
      monthly_bandwidth_limit_bytes: input.monthlyBandwidthLimitBytes,
      monthly_request_limit: input.monthlyRequestLimit,
      require_promotion_approval: input.requirePromotionApproval,
      protected_branches: input.protectedBranches,
      updated_at: new Date().toISOString()
    })
    .eq('id', organizationId)
    .eq('owner_id', actorId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update organization governance');
  }

  await recordOrganizationActivity({ organizationId, ownerId: actorId, actorId, eventType: 'organization.governance.updated', summary: `Updated governance for ${(data as OrganizationRecord).name}` });
  return toView(data as OrganizationRecord, 'owner');
}

export async function getOrganizationById(organizationId: string): Promise<OrganizationRecord | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from('organizations').select('*').eq('id', organizationId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return data as OrganizationRecord;
}

export async function getOrganizationRole(organizationId: string, userId?: string): Promise<OrganizationRole | null> {
  if (!userId) {
    return null;
  }

  const org = await getOrganizationById(organizationId);
  if (!org) {
    return null;
  }

  if (org.owner_id === userId) {
    return 'owner';
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('organization_memberships')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return String((data as { role: string }).role) as OrganizationRole;
}

export async function listOrganizationMembers(organizationId: string, actorId?: string): Promise<OrganizationMemberView[]> {
  const role = await getOrganizationRole(organizationId, actorId);
  const organization = await getOrganizationById(organizationId);
  if (!role || !organization) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data: memberships, error } = await supabase
    .from('organization_memberships')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const userIds = Array.from(new Set([organization.owner_id, ...((memberships ?? []) as OrganizationMembershipRecord[]).map((membership) => membership.user_id)]));
  const { data: profiles } = await supabase.from('profiles').select('id, github_login').in('id', userIds);
  const loginById = new Map((profiles ?? []).map((profile) => [profile.id, profile.github_login]));

  return [
    {
      memberId: organization.owner_id,
      githubLogin: loginById.get(organization.owner_id) ?? null,
      role: 'owner',
      createdAt: organization.created_at
    },
    ...((memberships ?? []) as OrganizationMembershipRecord[])
      .filter((membership) => membership.user_id !== organization.owner_id)
      .map((membership) => ({
        memberId: membership.user_id,
        githubLogin: loginById.get(membership.user_id) ?? null,
        role: membership.role as OrganizationRole,
        createdAt: membership.created_at
      }))
  ];
}

export async function upsertOrganizationMembership(organizationId: string, memberId: string, role: OrganizationRole = 'member') {
  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    throw new Error('Organization not found');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data, error } = await supabase
    .from('organization_memberships')
    .upsert({ organization_id: organizationId, user_id: memberId, role }, { onConflict: 'organization_id,user_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to upsert organization membership');
  }

  return data as OrganizationMembershipRecord;
}

export async function addOrganizationMember(
  organizationId: string,
  actorId: string | undefined,
  input: { githubLogin: string; role?: OrganizationRole }
): Promise<OrganizationMemberView> {
  const actorRole = await getOrganizationRole(organizationId, actorId);
  const organization = await getOrganizationById(organizationId);
  if (!actorId || actorRole !== 'owner' || !organization) {
    throw new Error('Only organization owners can manage members');
  }

  const githubLogin = normalizeOrganizationMemberLogin(input.githubLogin);
  const role: OrganizationRole = input.role === 'owner' ? 'member' : 'member';
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, github_login')
    .ilike('github_login', githubLogin)
    .limit(1)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error('GitHub user not found in NeoPages');
  }

  const memberId = String((profile as { id: string }).id);
  if (memberId === organization.owner_id) {
    throw new Error('Organization owner is already a member');
  }

  const record = await upsertOrganizationMembership(organizationId, memberId, role);

  await recordOrganizationActivity({ organizationId, ownerId: organization.owner_id, actorId, eventType: 'organization.member.added', summary: `Added ${String((profile as { github_login: string | null }).github_login ?? githubLogin)} to ${organization.name}`, metadata: { githubLogin: String((profile as { github_login: string | null }).github_login ?? githubLogin) } });

  return {
    memberId,
    githubLogin: String((profile as { github_login: string | null }).github_login ?? githubLogin),
    role,
    createdAt: record.created_at
  };
}

export async function removeOrganizationMember(organizationId: string, actorId: string | undefined, memberId: string) {
  const actorRole = await getOrganizationRole(organizationId, actorId);
  const organization = await getOrganizationById(organizationId);
  if (!actorId || actorRole !== 'owner' || !organization) {
    throw new Error('Only organization owners can manage members');
  }

  if (memberId === organization.owner_id) {
    throw new Error('Organization owner cannot be removed');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { error } = await supabase
    .from('organization_memberships')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', memberId);

  if (error) {
    throw new Error(error.message);
  }

  await recordOrganizationActivity({ organizationId, ownerId: organization.owner_id, actorId, eventType: 'organization.member.removed', summary: `Removed member ${memberId} from ${organization.name}`, metadata: { memberId } });
}
