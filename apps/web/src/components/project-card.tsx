import React from 'react';
import Link from 'next/link';

import type { ProjectSummary } from '../lib/projects-service';
import { StatusPill } from './status-pill';

interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const rootDomain = process.env.NEOPAGES_ROOT_DOMAIN ?? 'neopages.dev';

  return (
    <article className="card project-card">
      <div className="project-card__header">
        <div>
          <p className="eyebrow">{project.repo_full_name}</p>
          <h3>{project.name}</h3>
        </div>
        <StatusPill status={project.latestDeployment?.status ?? project.status} />
      </div>

      <div className="project-card__meta">
        <span>{project.subdomain}.{rootDomain}</span>
        <span>{project.framework ?? 'auto-detect'}</span>
      </div>

      <p className="muted">
        {project.latestDeployment?.commit_message ?? 'Waiting for the first successful deployment.'}
      </p>

      <div className="project-card__actions" style={{ display: 'flex', gap: '12px' }}>
        <Link href={`/projects/${project.id}`} className="button" style={{ flex: 1 }}>
          View project
        </Link>
        {(project.latestDeployment?.deployment_url ?? project.deployment_url) ? (
          <a className="button button--muted" style={{ flex: 1 }} href={project.latestDeployment?.deployment_url ?? project.deployment_url ?? '#'} target="_blank" rel="noreferrer">
            Visit
          </a>
        ) : null}
      </div>
    </article>
  );
}
