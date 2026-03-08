import type { DeploymentArtifactRecord, DeploymentRecord } from '@neopages/core';

import { getProjectAccess } from './collaborators';
import { createAdminSupabaseClient } from './supabase';

export interface DeploymentArtifactView {
  id: string;
  path: string;
  sizeBytes: number;
  contentType: string | null;
  downloadUrl: string | null;
}

export function buildArtifactUrl(deploymentUrl: string | null, artifactPath: string): string | null {
  if (!deploymentUrl) {
    return null;
  }

  if (artifactPath === 'index.html') {
    return deploymentUrl;
  }

  return new URL(`./${artifactPath}`, deploymentUrl.endsWith('/') ? deploymentUrl : `${deploymentUrl}/`).toString();
}

function toView(record: DeploymentArtifactRecord, deploymentUrl: string | null): DeploymentArtifactView {
  return {
    id: record.id,
    path: record.path,
    sizeBytes: record.size_bytes,
    contentType: record.content_type,
    downloadUrl: buildArtifactUrl(deploymentUrl, record.path)
  };
}

export async function listDeploymentArtifacts(projectId: string, deploymentId: string, actorId?: string): Promise<DeploymentArtifactView[]> {
  const access = await getProjectAccess(projectId, actorId);
  if (!access) {
    return [];
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return [];
  }

  const [{ data: deploymentData, error: deploymentError }, { data: artifactData, error: artifactError }] = await Promise.all([
    supabase.from('deployments').select('deployment_url').eq('id', deploymentId).eq('project_id', projectId).maybeSingle(),
    supabase.from('deployment_artifacts').select('*').eq('project_id', projectId).eq('deployment_id', deploymentId).order('path', { ascending: true })
  ]);

  if (deploymentError || artifactError) {
    throw new Error(deploymentError?.message ?? artifactError?.message ?? 'Failed to load deployment artifacts');
  }

  const deploymentUrl = (deploymentData as Pick<DeploymentRecord, 'deployment_url'> | null)?.deployment_url ?? null;
  return ((artifactData ?? []) as DeploymentArtifactRecord[]).map((artifact) => toView(artifact, deploymentUrl));
}
