'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { shouldPollDeploymentLogs } from '../lib/deployments';
import { filterDeployments, formatDeploymentDuration, type DeploymentFilterState } from '../lib/deployment-timeline';
import { canCancelDeployment } from '../lib/deployment-state';
import { getDeploymentReleaseAction, getLatestProductionDeploymentId } from '../lib/releases';
import { StatusPill } from './status-pill';

interface DeploymentItem {
  id: string;
  status: string;
  environment: 'production' | 'preview';
  preview_alias: string | null;
  branch: string;
  commit_sha: string | null;
  commit_message: string | null;
  container_id: string | null;
  deployment_url: string | null;
  logs: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface ProjectDeploymentsLiveProps {
  projectId: string;
  initialDeployments: DeploymentItem[];
  requireApproval: boolean;
}

export function ProjectDeploymentsLive({ projectId, initialDeployments, requireApproval }: ProjectDeploymentsLiveProps) {
  const [deployments, setDeployments] = useState(initialDeployments);
  const [pollError, setPollError] = useState<string | null>(null);
  const [busyDeploymentId, setBusyDeploymentId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<DeploymentFilterState>({ environment: 'all', status: 'all' });

  useEffect(() => {
    setDeployments(initialDeployments);
  }, [initialDeployments]);

  const polling = useMemo(() => shouldPollDeploymentLogs(deployments), [deployments]);
  const latestProductionDeploymentId = useMemo(() => getLatestProductionDeploymentId(deployments), [deployments]);
  const visibleDeployments = useMemo(() => filterDeployments(deployments, filters), [deployments, filters]);

  useEffect(() => {
    if (!polling) {
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/projects/${projectId}/deployments`, { cache: 'no-store' });
        const payload = (await response.json()) as { deployments?: DeploymentItem[]; error?: string };
        if (!response.ok) {
          if (!cancelled) {
            setPollError(payload.error ?? 'Failed to refresh deployments');
          }
          return;
        }

        if (!cancelled && payload.deployments) {
          setDeployments(payload.deployments);
          setPollError(null);
        }
      } catch {
        if (!cancelled) {
          setPollError('Failed to refresh deployments');
        }
      }
    }

    const interval = window.setInterval(poll, 2000);
    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [polling, projectId]);

  async function handlePromote(deploymentId: string) {
    setBusyDeploymentId(deploymentId);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/deployments/${deploymentId}/promote`, {
        method: 'POST'
      });
      const payload = (await response.json()) as { deployment?: DeploymentItem; error?: string };

      if (!response.ok || !payload.deployment) {
        setActionMessage(payload.error ?? (requireApproval ? 'Promotion request created.' : 'Release action failed'));
        setBusyDeploymentId(null);
        return;
      }

      const refreshResponse = await fetch(`/api/projects/${projectId}/deployments`, { cache: 'no-store' });
      const refreshed = (await refreshResponse.json()) as { deployments?: DeploymentItem[] };
      if (refreshResponse.ok && refreshed.deployments) {
        setDeployments(refreshed.deployments);
      }

      setActionMessage('Production release updated.');
    } catch {
      setActionMessage('Release action failed');
    } finally {
      setBusyDeploymentId(null);
    }
  }


  async function handleCancel(deploymentId: string) {
    setBusyDeploymentId(deploymentId);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/deployments/${deploymentId}/cancel`, {
        method: 'POST'
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setActionMessage(payload.error ?? 'Cancellation failed');
        setBusyDeploymentId(null);
        return;
      }

      const refreshResponse = await fetch(`/api/projects/${projectId}/deployments`, { cache: 'no-store' });
      const refreshed = (await refreshResponse.json()) as { deployments?: DeploymentItem[] };
      if (refreshResponse.ok && refreshed.deployments) {
        setDeployments(refreshed.deployments);
      }

      setActionMessage('Deployment cancelled.');
    } catch {
      setActionMessage('Cancellation failed');
    } finally {
      setBusyDeploymentId(null);
    }
  }

  return (
    <section className="card">
      <div className="split-row">
        <div>
          <p className="eyebrow">Deployment history</p>
          <h2>Live logs</h2>
        </div>
        <p className="muted">{polling ? 'Refreshing every 2s while a deployment is active.' : 'All deployments are in a terminal state.'}</p>
      </div>
      {pollError ? <p className="muted">{pollError}</p> : null}
      {actionMessage ? <p className="muted">{actionMessage}</p> : null}
      <div className="filter-bar">
        <label className="muted">
          Environment
          <select value={filters.environment} onChange={(event) => setFilters((current) => ({ ...current, environment: event.target.value as DeploymentFilterState['environment'] }))}>
            <option value="all">All</option>
            <option value="production">Production</option>
            <option value="preview">Preview</option>
          </select>
        </label>
        <label className="muted">
          Status
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DeploymentFilterState['status'] }))}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="deployed">Deployed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <div className="deployment-list">
        {visibleDeployments.map((deployment) => {
          const action = getDeploymentReleaseAction(deployment, latestProductionDeploymentId);
          const duration = formatDeploymentDuration(deployment.started_at, deployment.finished_at);

          return (
            <article key={deployment.id} className="card">
              <div className="project-card__header">
                <div>
                  <h3>{deployment.commit_message ?? 'Queued deployment'}</h3>
                  <p className="muted">
                    {deployment.environment} · {deployment.branch} · {deployment.commit_sha ?? 'pending SHA'}
                    {deployment.preview_alias ? ` · ${deployment.preview_alias}` : ''}
                  </p>
                </div>
                <StatusPill status={deployment.status} />
              </div>
              {deployment.deployment_url ? (
                <p className="muted">
                  <a href={deployment.deployment_url} target="_blank" rel="noreferrer">Open deployment</a>
                </p>
              ) : null}
              {duration ? <p className="muted">Duration: {duration}</p> : null}
              {(action || canCancelDeployment(deployment.status)) ? (
                <div className="form-grid__footer">
                  {action ? (
                    <button className="link-button" type="button" onClick={() => handlePromote(deployment.id)} disabled={busyDeploymentId === deployment.id}>
                      {busyDeploymentId === deployment.id ? 'Applying…' : action.label}
                    </button>
                  ) : null}
                  {canCancelDeployment(deployment.status) ? (
                    <button className="link-button" type="button" onClick={() => handleCancel(deployment.id)} disabled={busyDeploymentId === deployment.id}>
                      {busyDeploymentId === deployment.id ? 'Cancelling…' : 'Cancel deployment'}
                    </button>
                  ) : null}
                </div>
              ) : null}
              <pre className="deployment-log">{deployment.logs ?? 'No logs yet.'}</pre>
            </article>
          );
        })}
        {visibleDeployments.length === 0 ? <p className="muted">No deployments match the current filters.</p> : null}
      </div>
    </section>
  );
}
