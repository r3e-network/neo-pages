import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  buildGitHubAppInstallUrl,
  createGitHubAppJwt,
  normalizeGitHubAppPrivateKey,
  parseRepoOwner,
  type GitHubInstallationRecord,
  type GitHubInstallationRepositoryRecord
} from '@neopages/core';

import { getGitHubAppConfig, isGitHubAppEnabled } from './env';
import { createAdminSupabaseClient } from './supabase';
import {
  buildRepositoryCacheMutation,
  groupCachedRepositoriesByInstallation,
  isRepositoryCacheStale,
  type CachedGitHubRepositoryRow,
  type CacheableGitHubRepository
} from './github-cache';

const GITHUB_API_ORIGIN = 'https://api.github.com';
const GITHUB_OAUTH_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_VERSION = '2022-11-28';

interface GitHubAccountPayload {
  login?: string;
  id?: number;
  type?: string;
}

interface GitHubInstallationPayload {
  id?: number;
  app_slug?: string;
  target_type?: string;
  repository_selection?: string;
  permissions?: Record<string, string>;
  account?: GitHubAccountPayload;
}

interface GitHubUserInstallationsResponse {
  installations?: GitHubInstallationPayload[];
}

interface GitHubRepositoriesResponse {
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
    default_branch: string;
    clone_url: string;
    html_url: string;
    private: boolean;
  }>;
}

interface GitHubRepositoryPayload {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  clone_url: string;
  html_url: string;
  private: boolean;
}

export interface GitHubRepositoryOption extends CacheableGitHubRepository {}

export interface GitHubInstallationSummary {
  installationId: number;
  accountLogin: string;
  accountType: string | null;
  repositorySelection: string | null;
  repositoriesSyncedAt: string | null;
  cacheStale: boolean;
  repositories: GitHubRepositoryOption[];
}

export interface GitHubRepositoryContext {
  installationId: number;
  repositoryId: number;
  defaultBranch: string;
  cloneUrl: string;
  htmlUrl: string;
}

export function verifyGitHubSignature(payload: string, signature: string | null, secret?: string): boolean {
  const resolvedSecret = secret ?? getGitHubAppConfig().webhookSecret;

  if (!resolvedSecret) {
    return true;
  }

  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${createHmac('sha256', resolvedSecret).update(payload).digest('hex')}`;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getGitHubAppInstallUrl(targetId?: number): string | null {
  const config = getGitHubAppConfig();
  if (!config.appSlug) {
    return null;
  }

  return buildGitHubAppInstallUrl(config.appSlug, targetId);
}

export async function syncGitHubInstallationsFromCode(code: string, ownerId: string): Promise<number> {
  const userAccessToken = await exchangeGitHubAppCodeForUserToken(code);
  const installations = await listUserInstallations(userAccessToken);
  await upsertGitHubInstallationRows(installations, ownerId);

  await Promise.all(
    installations
      .filter((installation) => installation.id)
      .map((installation) => syncInstallationRepositories(installation.id as number, ownerId))
  );

  return installations.length;
}

export async function syncGitHubInstallationFromWebhookPayload(input: {
  action?: string;
  installation?: GitHubInstallationPayload;
}): Promise<void> {
  const installation = input.installation;
  if (!installation?.id || !installation.account?.login) {
    return;
  }

  const existing = await getGitHubInstallationRow(installation.id);
  const row = buildInstallationRow(installation, existing?.owner_id ?? null, input.action);
  await upsertGitHubInstallationRows([row], null, true);

  if (input.action === 'deleted') {
    await deleteInstallationRepositories(installation.id);
    return;
  }

  if (existing?.owner_id) {
    await syncInstallationRepositories(installation.id, existing.owner_id);
  }
}

export async function listGitHubInstallationsWithRepositories(ownerId: string): Promise<GitHubInstallationSummary[]> {
  const supabase = createAdminSupabaseClient();
  if (!supabase || !isGitHubAppEnabled()) {
    return [];
  }

  const [{ data: installationsData, error: installationsError }, { data: repositoriesData, error: repositoriesError }] = await Promise.all([
    supabase
      .from('github_app_installations')
      .select('*')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('github_installation_repositories')
      .select('*')
      .eq('owner_id', ownerId)
      .order('full_name', { ascending: true })
  ]);

  if (installationsError || repositoriesError) {
    throw new Error(installationsError?.message ?? repositoriesError?.message ?? 'Failed to load cached GitHub repositories');
  }

  const installations = ((installationsData ?? []) as GitHubInstallationRecord[]).filter((installation) => !installation.deleted_at);
  const repositoriesByInstallation = groupCachedRepositoriesByInstallation(
    (repositoriesData ?? []) as CachedGitHubRepositoryRow[]
  );

  return installations.map((installation) => ({
    installationId: installation.installation_id,
    accountLogin: installation.account_login,
    accountType: installation.account_type,
    repositorySelection: installation.repository_selection,
    repositoriesSyncedAt: installation.repositories_synced_at,
    cacheStale: isRepositoryCacheStale(installation.repositories_synced_at),
    repositories: repositoriesByInstallation.get(installation.installation_id) ?? []
  }));
}

export async function resolveGitHubRepositoryContext(
  repoFullName: string,
  ownerId: string
): Promise<GitHubRepositoryContext | null> {
  if (!isGitHubAppEnabled()) {
    return null;
  }

  const cached = await findCachedRepository(repoFullName, ownerId);

  const owner = parseRepoOwner(repoFullName);
  if (!owner) {
    return null;
  }

  const installation = await findInstallationForOwnerLogin(ownerId, owner);
  if (!installation) {
    return null;
  }

  if (!cached || isRepositoryCacheStale(installation.repositories_synced_at)) {
    await syncInstallationRepositories(installation.installation_id, ownerId);
    const refreshed = await findCachedRepository(repoFullName, ownerId);

    if (!refreshed) {
      return null;
    }

    return {
      installationId: refreshed.installation_id,
      repositoryId: refreshed.repository_id,
      defaultBranch: refreshed.default_branch,
      cloneUrl: refreshed.clone_url,
      htmlUrl: refreshed.html_url
    };
  }

  return {
    installationId: cached.installation_id,
    repositoryId: cached.repository_id,
    defaultBranch: cached.default_branch,
    cloneUrl: cached.clone_url,
    htmlUrl: cached.html_url
  };
}

export async function refreshGitHubInstallationCaches(ownerId: string, force = false) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { refreshedInstallations: 0, refreshedRepositories: 0 };
  }

  const { data, error } = await supabase
    .from('github_app_installations')
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const installations = (data ?? []) as GitHubInstallationRecord[];
  let refreshedInstallations = 0;
  let refreshedRepositories = 0;

  for (const installation of installations) {
    if (!force && !isRepositoryCacheStale(installation.repositories_synced_at)) {
      continue;
    }

    const repositories = await syncInstallationRepositories(installation.installation_id, ownerId);
    refreshedInstallations += 1;
    refreshedRepositories += repositories.length;
  }

  return { refreshedInstallations, refreshedRepositories };
}

async function syncInstallationRepositories(installationId: number, ownerId: string): Promise<GitHubRepositoryOption[]> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const repositories = await listRepositoriesForInstallation(installationId);
  const { data: existingRows, error: existingError } = await supabase
    .from('github_installation_repositories')
    .select('repository_id')
    .eq('owner_id', ownerId)
    .eq('installation_id', installationId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const mutation = buildRepositoryCacheMutation({
    ownerId,
    installationId,
    existingRepositoryIds: (existingRows ?? []).map((row) => Number((row as { repository_id: number }).repository_id)),
    repositories
  });

  if (mutation.upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from('github_installation_repositories')
      .upsert(mutation.upserts, { onConflict: 'installation_id,repository_id' });

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  if (mutation.staleRepositoryIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('github_installation_repositories')
      .delete()
      .eq('owner_id', ownerId)
      .eq('installation_id', installationId)
      .in('repository_id', mutation.staleRepositoryIds);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const { error: touchError } = await supabase
    .from('github_app_installations')
    .update({ repositories_synced_at: new Date().toISOString() })
    .eq('installation_id', installationId);

  if (touchError) {
    throw new Error(touchError.message);
  }

  return repositories;
}

async function deleteInstallationRepositories(installationId: number) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('github_installation_repositories').delete().eq('installation_id', installationId);
  if (error) {
    throw new Error(error.message);
  }
}

async function findCachedRepository(
  repoFullName: string,
  ownerId: string
): Promise<GitHubInstallationRepositoryRecord | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('github_installation_repositories')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('full_name', repoFullName)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as GitHubInstallationRepositoryRecord;
}

async function findInstallationForOwnerLogin(ownerId: string, accountLogin: string): Promise<GitHubInstallationRecord | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('github_app_installations')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('account_login', accountLogin)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as GitHubInstallationRecord;
}

async function listRepositoriesForInstallation(installationId: number): Promise<GitHubRepositoryOption[]> {
  const token = await createGitHubInstallationAccessToken(installationId);
  const response = await githubApiRequest<GitHubRepositoriesResponse>(`${GITHUB_API_ORIGIN}/installation/repositories?per_page=100`, {
    headers: githubJsonHeaders(token)
  });

  return (response.repositories ?? []).map((repository) => ({
    id: repository.id,
    name: repository.name,
    fullName: repository.full_name,
    defaultBranch: repository.default_branch,
    cloneUrl: repository.clone_url,
    htmlUrl: repository.html_url,
    private: repository.private
  }));
}

async function exchangeGitHubAppCodeForUserToken(code: string): Promise<string> {
  const config = getGitHubAppConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error('GitHub App client credentials are not configured');
  }

  const response = await fetch(GITHUB_OAUTH_ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code
    })
  });

  const payload = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? 'Failed to exchange GitHub App callback code');
  }

  return payload.access_token;
}

async function listUserInstallations(userAccessToken: string): Promise<GitHubInstallationPayload[]> {
  const response = await githubApiRequest<GitHubUserInstallationsResponse>(`${GITHUB_API_ORIGIN}/user/installations`, {
    headers: githubJsonHeaders(userAccessToken)
  });

  return response.installations ?? [];
}

async function createGitHubInstallationAccessToken(installationId: number): Promise<string> {
  const config = getGitHubAppConfig();
  if (!config.appId || !config.privateKey) {
    throw new Error('GitHub App private key configuration is missing');
  }

  const jwt = createGitHubAppJwt({
    appId: config.appId,
    privateKey: normalizeGitHubAppPrivateKey(config.privateKey)
  });

  const response = await githubApiRequest<{ token?: string }>(
    `${GITHUB_API_ORIGIN}/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: githubJsonHeaders(jwt)
    }
  );

  if (!response.token) {
    throw new Error('GitHub did not return an installation access token');
  }

  return response.token;
}

function buildInstallationRow(
  installation: GitHubInstallationPayload,
  ownerId: string | null,
  action?: string
): GitHubInstallationRecord {
  const now = new Date().toISOString();

  return {
    installation_id: installation.id ?? 0,
    owner_id: ownerId,
    account_login: installation.account?.login ?? 'unknown',
    account_id: installation.account?.id ?? null,
    account_type: installation.account?.type ?? null,
    target_type: installation.target_type ?? null,
    app_slug: installation.app_slug ?? null,
    repository_selection: installation.repository_selection ?? null,
    permissions: installation.permissions ?? null,
    repositories_synced_at: existingRepositoriesSyncedAt(installation, action),
    suspended_at: action === 'suspend' ? now : null,
    deleted_at: action === 'deleted' ? now : null,
    created_at: now,
    updated_at: now
  };
}

function existingRepositoriesSyncedAt(_installation: GitHubInstallationPayload, action?: string): string | null {
  if (action === 'deleted') {
    return null;
  }

  return null;
}

async function upsertGitHubInstallationRows(
  installations: Array<GitHubInstallationPayload | GitHubInstallationRecord>,
  ownerId: string | null,
  rowsAreNormalized = false
) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return;
  }

  const rows = rowsAreNormalized
    ? (installations as GitHubInstallationRecord[])
    : (installations as GitHubInstallationPayload[])
        .filter((installation) => installation.id && installation.account?.login)
        .map((installation) => buildInstallationRow(installation, ownerId));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from('github_app_installations').upsert(rows, { onConflict: 'installation_id' });
  if (error) {
    throw new Error(error.message);
  }
}

async function getGitHubInstallationRow(installationId: number): Promise<GitHubInstallationRecord | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('github_app_installations')
    .select('*')
    .eq('installation_id', installationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as GitHubInstallationRecord;
}

async function githubApiRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}

function githubJsonHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': GITHUB_API_VERSION
  };
}
