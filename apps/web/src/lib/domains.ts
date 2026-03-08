import { randomBytes } from 'node:crypto';
import { resolveCname, resolveTxt } from 'node:dns/promises';

import {
    buildDomainRoutingTarget,
    buildDomainVerificationHostname,
    normalizeCustomDomain,
    summarizeDomainVerification,
    type DomainRecord
} from '@neopages/core';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

export interface ProjectDomainView extends DomainRecord {
  verificationHostname: string;
  routingTarget: string;
  dnsConfigured: boolean;
}

export async function listProjectDomains(projectId: string, ownerId?: string): Promise<ProjectDomainView[]> {
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

  const { data, error } = await supabase.from('domains').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  return hydrateDomainViews((data ?? []) as DomainRecord[]);
}

export async function createProjectDomain(projectId: string, host: string, ownerId?: string): Promise<ProjectDomainView> {
  const normalizedHost = normalizeCustomDomain(host);
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
    .from('domains')
    .insert({
      project_id: projectId,
      host: normalizedHost,
      verification_token: randomBytes(12).toString('hex')
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create custom domain');
  }

  await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: 'domain.added', summary: `Added custom domain ${normalizedHost}`, metadata: { host: normalizedHost } });
  return hydrateDomainViews([data as DomainRecord])[0];
}

export async function verifyProjectDomain(projectId: string, domainId: string, ownerId?: string): Promise<ProjectDomainView> {
  if (!ownerId) {
    throw new Error('Authentication required');
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const { data: domainData, error: domainError } = await supabase
    .from('domains')
    .select('*, projects!inner(owner_id)')
    .eq('id', domainId)
    .eq('project_id', projectId)
    .eq('projects.owner_id', ownerId)
    .maybeSingle();

  if (domainError || !domainData) {
    throw new Error('Domain not found');
  }

  const domain = domainData as DomainRecord & { projects?: unknown };
  const verificationHostname = buildDomainVerificationHostname(domain.host);
  const routingTarget = buildDomainRoutingTarget(process.env.NEOPAGES_ROOT_DOMAIN ?? 'neopages.dev');

  const isNNS = domain.host.endsWith('.neo');
  const txtValues = isNNS ? [] : await lookupTxtValues(verificationHostname);
  const cname = isNNS ? null : await lookupCname(domain.host);

  const summary = summarizeDomainVerification({
    token: domain.verification_token ?? '',
    txtValues,
    cnameTarget: routingTarget,
    actualCname: cname,
    isNNS
  });

  const patch = {
    verified_at: summary.verified ? new Date().toISOString() : null,
    last_checked_at: new Date().toISOString(),
    verification_error: summary.verified
      ? summary.dnsConfigured
        ? null
        : summary.routingError
      : summary.verificationError
  };

  const { data, error } = await supabase.from('domains').update(patch).eq('id', domainId).select('*').single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update domain verification');
  }

  if (summary.verified) {
    await recordProjectActivity({ projectId, ownerId, actorId: ownerId, eventType: 'domain.verified', summary: `Verified custom domain ${domain.host}`, metadata: { host: domain.host } });
  }

  return hydrateDomainViews([data as DomainRecord], summary.dnsConfigured)[0];
}

function hydrateDomainViews(domains: DomainRecord[], knownDnsConfigured?: boolean): ProjectDomainView[] {
  const routingTarget = buildDomainRoutingTarget(process.env.NEOPAGES_ROOT_DOMAIN ?? 'neopages.dev');

  return domains.map((domain) => ({
    ...domain,
    verificationHostname: buildDomainVerificationHostname(domain.host),
    routingTarget,
    dnsConfigured: knownDnsConfigured ?? !domain.verification_error?.includes('Point your domain to')
  }));
}

async function lookupTxtValues(hostname: string): Promise<string[]> {
  try {
    const records = await resolveTxt(hostname);
    return records.flat().map((value) => value.trim());
  } catch {
    return [];
  }
}

async function lookupCname(hostname: string): Promise<string | null> {
  try {
    const records = await resolveCname(hostname);
    return records[0] ?? null;
  } catch {
    return null;
  }
}
