'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface DeploymentOption {
  id: string;
  commitMessage: string | null;
  environment: 'production' | 'preview';
  branch: string;
  status: string;
}

interface ArtifactItem {
  id: string;
  path: string;
  sizeBytes: number;
  contentType: string | null;
  downloadUrl: string | null;
}

interface ProjectDeploymentArtifactsBrowserProps {
  projectId: string;
  deployments: DeploymentOption[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectDeploymentArtifactsBrowser({ projectId, deployments }: ProjectDeploymentArtifactsBrowserProps) {
  const deployedOptions = useMemo(() => deployments.filter((deployment) => deployment.status === 'deployed'), [deployments]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>(deployedOptions[0]?.id ?? '');
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (deployedOptions.length === 0) {
      setSelectedDeploymentId('');
      return;
    }

    if (!deployedOptions.some((deployment) => deployment.id === selectedDeploymentId)) {
      setSelectedDeploymentId(deployedOptions[0].id);
    }
  }, [deployedOptions, selectedDeploymentId]);

  useEffect(() => {
    if (!selectedDeploymentId) {
      setArtifacts([]);
      setMessage(null);
      return;
    }

    let cancelled = false;

    async function loadArtifacts() {
      if (!cancelled) {
        setArtifacts([]);
        setMessage(null);
      }

      try {
        const response = await fetch(`/api/projects/${projectId}/deployments/${selectedDeploymentId}/artifacts`, { cache: 'no-store' });
        const payload = (await response.json()) as { artifacts?: ArtifactItem[]; error?: string };
        if (!response.ok) {
          if (!cancelled) {
            setMessage(payload.error ?? 'Failed to load artifacts');
          }
          return;
        }

        if (!cancelled) {
          setArtifacts(payload.artifacts ?? []);
          setMessage(null);
        }
      } catch {
        if (!cancelled) {
          setMessage('Failed to load artifacts');
        }
      }
    }

    void loadArtifacts();
    return () => {
      cancelled = true;
    };
  }, [projectId, selectedDeploymentId]);

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Artifacts</p>
          <h2>Browse deployment outputs</h2>
        </div>
      </div>
      {deployedOptions.length > 0 ? (
        <label className="muted">
          Deployment
          <select value={selectedDeploymentId} onChange={(event) => setSelectedDeploymentId(event.target.value)}>
            {deployedOptions.map((deployment) => (
              <option key={deployment.id} value={deployment.id}>
                {deployment.environment} · {deployment.branch} · {deployment.commitMessage ?? deployment.id}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="muted">No successful deployments yet.</p>
      )}
      {message ? <p className="muted">{message}</p> : null}
      <div className="deployment-list">
        {artifacts.map((artifact) => (
          <article key={artifact.id} className="card project-card">
            <div className="project-card__header">
              <div>
                <h3>{artifact.path}</h3>
                <p className="muted">{formatSize(artifact.sizeBytes)}{artifact.contentType ? ` · ${artifact.contentType}` : ''}</p>
              </div>
              {artifact.downloadUrl ? (
                <a className="link-button" href={artifact.downloadUrl} target="_blank" rel="noreferrer">Open</a>
              ) : null}
            </div>
          </article>
        ))}
        {selectedDeploymentId && artifacts.length === 0 && !message ? <p className="muted">No artifact metadata stored for this deployment.</p> : null}
      </div>
    </section>
  );
}
