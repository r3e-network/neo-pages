'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  defaultOrganizationProjectFilters,
  filterOrganizationProjects,
  getActiveOrganizationProjectPreset,
  getOrganizationProjectFiltersStorageKey,
  getOrganizationProjectPresetFilters,
  hasNonDefaultOrganizationProjectFilters,
  organizationProjectStatusOptions,
  parseOrganizationProjectFilters,
  type OrganizationProjectFilterStatus,
  type OrganizationProjectPreset
} from '../lib/organization-projects';
import { StatusPill } from './status-pill';

interface OrganizationProjectItem {
  id: string;
  name: string;
  repoFullName: string;
  framework: string | null;
  deploymentUrl: string | null;
  status: string;
  latestStatus: string;
  latestCommitMessage: string | null;
  latestCreatedAt?: string | null;
}

interface OrganizationProjectsListProps {
  organizationId: string;
  projects: OrganizationProjectItem[];
}

const statusOptions = organizationProjectStatusOptions;
const sortOptions = ['recent', 'health', 'name'] as const;
const presets: Array<{ id: OrganizationProjectPreset; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'failures', label: 'Failures' },
  { id: 'live', label: 'Live' },
  { id: 'alphabetical', label: 'A-Z' }
];

export function OrganizationProjectsList({ organizationId, projects }: OrganizationProjectsListProps) {
  const defaults = defaultOrganizationProjectFilters();
  const [query, setQuery] = useState(defaults.query);
  const [status, setStatus] = useState<OrganizationProjectFilterStatus>(defaults.status);
  const [sort, setSort] = useState<(typeof sortOptions)[number]>(defaults.sort);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = parseOrganizationProjectFilters(window.localStorage.getItem(getOrganizationProjectFiltersStorageKey(organizationId)));
    setQuery(saved.query);
    setStatus(saved.status);
    setSort(saved.sort);
  }, [organizationId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      getOrganizationProjectFiltersStorageKey(organizationId),
      JSON.stringify({ query, status, sort })
    );
  }, [organizationId, query, status, sort]);

  function applyPreset(preset: OrganizationProjectPreset) {
    const next = getOrganizationProjectPresetFilters(preset);
    setQuery(next.query);
    setStatus(next.status);
    setSort(next.sort);
  }

  function resetFilters() {
    const next = defaultOrganizationProjectFilters();
    setQuery(next.query);
    setStatus(next.status);
    setSort(next.sort);
  }

  const filters = { query, status, sort };
  const activePreset = getActiveOrganizationProjectPreset(filters);
  const isDirty = hasNonDefaultOrganizationProjectFilters(filters);
  const filteredProjects = useMemo(
    () => filterOrganizationProjects(projects, filters),
    [projects, query, status, sort]
  );

  return (
    <section className="stack">
      <div>
        <p className="eyebrow">Projects</p>
        <h3>Org-owned deployments</h3>
        <p className="muted">Active preset: {activePreset === 'custom' ? 'Custom' : presets.find((preset) => preset.id === activePreset)?.label ?? 'All'}</p>
      </div>
      <div className="form-grid__footer">
        {presets.map((preset) => (
          <button
            key={preset.id}
            className="link-button"
            type="button"
            aria-pressed={activePreset === preset.id}
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
        <button className="link-button" type="button" onClick={resetFilters} disabled={!isDirty}>
          Reset filters
        </button>
        {activePreset === 'custom' ? <span className="muted">Custom</span> : null}
      </div>
      <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
        <div>
          <label htmlFor={`org-project-search-${organizationId}`}>Search projects</label>
          <input id={`org-project-search-${organizationId}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or repo" />
        </div>
        <div>
          <label htmlFor={`org-project-status-${organizationId}`}>Status</label>
          <select id={`org-project-status-${organizationId}`} value={status} onChange={(event) => setStatus(event.target.value as OrganizationProjectFilterStatus)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`org-project-sort-${organizationId}`}>Sort</label>
          <select id={`org-project-sort-${organizationId}`} value={sort} onChange={(event) => setSort(event.target.value as (typeof sortOptions)[number])}>
            {sortOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </form>
      <div className="deployment-list">
        {filteredProjects.map((project) => (
          <article key={project.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <p className="eyebrow">{project.repoFullName}</p>
                <h3>{project.name}</h3>
                <p className="muted">{project.latestCommitMessage ?? 'Waiting for the next deployment update.'}</p>
              </div>
              <StatusPill status={project.latestStatus || project.status} />
            </div>
            <div className="project-card__meta">
              <span>{project.framework ?? 'auto-detect'}</span>
            </div>
            <div className="project-card__actions">
              <Link href={`/projects/${project.id}`} className="link-button">
                View project
              </Link>
              {project.deploymentUrl ? (
                <a className="link-button" href={project.deploymentUrl} target="_blank" rel="noreferrer">
                  Open latest
                </a>
              ) : null}
            </div>
          </article>
        ))}
        {filteredProjects.length === 0 ? <p className="muted">No org-owned projects match the current filters.</p> : null}
      </div>
    </section>
  );
}
