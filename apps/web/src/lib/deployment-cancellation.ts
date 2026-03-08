import { canEditProject, getProjectAccess } from './collaborators';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

import { canCancelDeployment, resolveProjectStatusAfterCancellation } from './deployment-state';


export async function cancelProjectDeployment(projectId: string, deploymentId: string, actorId?: string) {
  const access = await getProjectAccess(projectId, actorId);
  if (!access || !canEditProject(access.role)) {
    throw new Error('You do not have permission to cancel this deployment');
  }
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }

  const [{ data: projectData, error: projectError }, { data: deploymentData, error: deploymentError }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
    supabase.from('deployments').select('*').eq('id', deploymentId).eq('project_id', projectId).maybeSingle()
  ]);

  if (projectError || !projectData) {
    throw new Error('Project not found');
  }
  if (deploymentError || !deploymentData) {
    throw new Error('Deployment not found');
  }

  const project = projectData as { container_id: string | null };
  const deployment = deploymentData as { status: string; environment: string; logs: string | null };

  if (!canCancelDeployment(deployment.status)) {
    throw new Error('Deployment can no longer be cancelled');
  }

  const now = new Date().toISOString();
  const logs = `${deployment.logs ?? ''}\nCancelled from control plane\n`;

  const { error: updateError } = await supabase
    .from('deployments')
    .update({ status: 'cancelled', finished_at: now, logs })
    .eq('id', deploymentId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (deployment.environment === 'production') {
    const { error: projectUpdateError } = await supabase
      .from('projects')
      .update({ status: resolveProjectStatusAfterCancellation(project.container_id) })
      .eq('id', projectId);

    if (projectUpdateError) {
      throw new Error(projectUpdateError.message);
    }
  }

  const builderUrl = process.env.BUILDER_PUBLIC_URL;
  if (builderUrl) {
    try {
      await fetch(new URL(`/internal/deployments/${deploymentId}/cancel`, builderUrl), { method: 'POST' });
    } catch {
      // best-effort abort for in-flight builds
    }
  }

  await recordProjectActivity({ projectId, ownerId: access.ownerId, actorId: actorId ?? null, eventType: 'deployment.cancelled', summary: `Cancelled deployment ${deploymentId}`, metadata: { deploymentId } });
  return { status: 'cancelled' as const };
}
