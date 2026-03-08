'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const initialForm = {
  name: '',
  repoFullName: '',
  organizationId: '',
  defaultBranch: 'main',
  rootDirectory: '.',
  outputDirectory: '',
  subdomain: ''
};

interface InstallationResponse {
  ok: boolean;
  error?: string;
  configured?: boolean;
  installations?: Array<{
    installationId: number;
    accountLogin: string;
    cacheStale?: boolean;
    repositoriesSyncedAt?: string | null;
    repositories: Array<{
      id: number;
      fullName: string;
      defaultBranch: string;
    }>;
  }>;
  summary?: {
    refreshedInstallations: number;
    refreshedRepositories: number;
  };
}

interface RepoOption {
  fullName: string;
  defaultBranch: string;
}

interface OrganizationOption {
  id: string;
  name: string;
  role: 'owner' | 'member';
}

export function CreateProjectForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [repoStatus, setRepoStatus] = useState<string>('Enter owner/repo manually, or install the GitHub App to browse connected repositories.');
  const [repoOptions, setRepoOptions] = useState<RepoOption[]>([]);
  const [refreshingRepos, setRefreshingRepos] = useState(false);
  const [canRefreshRepos, setCanRefreshRepos] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  const updateInstallations = useCallback((payload: InstallationResponse, refreshMessage?: string) => {
    const options = (payload.installations ?? []).flatMap((installation) =>
      installation.repositories.map((repository) => ({
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch
      }))
    );

    setRepoOptions(options);
    setCanRefreshRepos(Boolean(payload.configured));

    if (refreshMessage) {
      setRepoStatus(refreshMessage);
      return;
    }

    if (payload.ok === false) {
      setRepoStatus(payload.error ?? 'GitHub repository lookup failed. Manual owner/repo entry still works.');
      return;
    }

    if (payload.configured) {
      const staleCount = (payload.installations ?? []).filter((installation) => installation.cacheStale).length;
      setRepoStatus(
        options.length > 0
          ? staleCount > 0
            ? `GitHub App connected. ${options.length} cached repositories found. ${staleCount} installation cache(s) look stale.`
            : `GitHub App connected. ${options.length} repositories are available for auto-detection.`
          : 'GitHub App is configured, but no synced installations are available yet.'
      );
    }
  }, []);

  const loadInstallations = useCallback(async () => {
    const response = await fetch('/api/github/installations', { cache: 'no-store' });
    const payload = (await response.json()) as InstallationResponse;
    updateInstallations(payload);
  }, [updateInstallations]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [installationResponse, organizationResponse] = await Promise.all([
          fetch('/api/github/installations', { cache: 'no-store' }),
          fetch('/api/organizations', { cache: 'no-store' })
        ]);
        const payload = (await installationResponse.json()) as InstallationResponse;
        const orgPayload = (await organizationResponse.json()) as { organizations?: OrganizationOption[] };
        if (!cancelled) {
          updateInstallations(payload);
          setOrganizations(orgPayload.organizations ?? []);
        }
      } catch {
        if (!cancelled) {
          setRepoStatus('Could not load GitHub App repositories. Manual owner/repo entry still works.');
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [updateInstallations]);

  const repoLookup = useMemo(() => new Map(repoOptions.map((option) => [option.fullName, option.defaultBranch])), [repoOptions]);

  async function handleRepoRefresh(force = true) {
    setRefreshingRepos(true);

    try {
      const response = await fetch('/api/github/installations/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });
      const payload = (await response.json()) as InstallationResponse;
      const refreshStatus = payload.ok
        ? `Refreshed ${payload.summary?.refreshedInstallations ?? 0} installation cache(s) and ${payload.summary?.refreshedRepositories ?? 0} repositories.`
        : payload.error ?? (payload.configured ? 'GitHub repository refresh failed.' : 'GitHub App is not configured.');

      updateInstallations(payload, refreshStatus);
      await loadInstallations();
      setRepoStatus(refreshStatus);
    } catch {
      setRepoStatus('GitHub repository refresh failed. Manual owner/repo entry still works.');
    } finally {
      setRefreshingRepos(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const payload = (await response.json()) as { error?: string; project?: { id: string; subdomain: string } };

      if (!response.ok) {
        setMessage(payload.error ?? 'Failed to create project');
        setSubmitting(false);
        return;
      }

      setForm(initialForm);
      setMessage(`Project queued: ${payload.project?.subdomain ?? 'new site'}`);
      setSubmitting(false);
      router.refresh();
    } catch {
      setMessage('Failed to create project');
      setSubmitting(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Project name</label>
        <input id="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </div>

      <div>
        <label htmlFor="repoFullName">GitHub repository</label>
        <input
          id="repoFullName"
          list="github-repositories"
          placeholder="owner/repo"
          value={form.repoFullName}
          onChange={(event) => {
            const repoFullName = event.target.value;
            const detectedBranch = repoLookup.get(repoFullName);
            setForm({
              ...form,
              repoFullName,
              defaultBranch: detectedBranch ?? form.defaultBranch
            });
          }}
          required
        />
        <datalist id="github-repositories">
          {repoOptions.map((repository) => (
            <option key={repository.fullName} value={repository.fullName} />
          ))}
        </datalist>
        <p className="muted">{repoStatus}</p>
        {canRefreshRepos ? (
          <button className="link-button" type="button" onClick={() => handleRepoRefresh(true)} disabled={refreshingRepos}>
            {refreshingRepos ? 'Refreshing repositories…' : 'Refresh repository cache'}
          </button>
        ) : null}
      </div>

      <div>
        <label htmlFor="organizationId">Owner scope</label>
        <select id="organizationId" value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })}>
          <option value="">Personal workspace</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} ({organization.role})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="defaultBranch">Branch</label>
        <input
          id="defaultBranch"
          value={form.defaultBranch}
          onChange={(event) => setForm({ ...form, defaultBranch: event.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="rootDirectory">Root directory</label>
        <input
          id="rootDirectory"
          value={form.rootDirectory}
          onChange={(event) => setForm({ ...form, rootDirectory: event.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="outputDirectory">Output directory</label>
        <input
          id="outputDirectory"
          placeholder="dist / out / build"
          value={form.outputDirectory}
          onChange={(event) => setForm({ ...form, outputDirectory: event.target.value })}
        />
      </div>

      <div>
        <label htmlFor="subdomain">Subdomain</label>
        <input
          id="subdomain"
          placeholder="optional"
          value={form.subdomain}
          onChange={(event) => setForm({ ...form, subdomain: event.target.value })}
        />
      </div>

      <div className="form-grid__footer">
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Queueing…' : 'Deploy project'}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    </form>
  );
}
