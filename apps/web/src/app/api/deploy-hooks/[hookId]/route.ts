import { NextResponse } from 'next/server';

import { getProjectDeployHookById, touchProjectDeployHook, verifyDeployHookSignature } from '../../../../lib/project-deploy-hooks';
import { queueDeploymentForRepository } from '../../../../lib/projects-service';
import { recordProjectActivity } from '../../../../lib/project-activity';

export async function POST(request: Request, context: { params: Promise<{ hookId: string }> }) {
  const { hookId } = await context.params;
  const hook = await getProjectDeployHookById(hookId);

  if (!hook) {
    return NextResponse.json({ ok: false, error: 'Deploy hook not found' }, { status: 404 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-neopages-signature-256');
  if (!verifyDeployHookSignature(hook.secret, rawBody, signature)) {
    return NextResponse.json({ ok: false, error: 'Invalid deploy hook signature' }, { status: 401 });
  }

  const body = (rawBody ? JSON.parse(rawBody) : {}) as { branch?: string; commitSha?: string; commitMessage?: string };
  const projectRepoLookup = await (async () => {
    const projectDetails = await import('../../../../lib/projects-service');
    const details = await projectDetails.getProjectDetails(hook.project_id, hook.owner_id);
    return details?.project.repo_full_name ?? null;
  })();

  if (!projectRepoLookup) {
    return NextResponse.json({ ok: false, error: 'Project not found for deploy hook' }, { status: 404 });
  }

  const queued = await queueDeploymentForRepository({
    repoFullName: projectRepoLookup,
    branch: body.branch ?? 'main',
    commitSha: body.commitSha,
    commitMessage: body.commitMessage ?? 'Queued from signed deploy hook'
  });

  if (!queued) {
    return NextResponse.json({ ok: false, error: 'Failed to queue deployment' }, { status: 400 });
  }

  await touchProjectDeployHook(hookId);
  await recordProjectActivity({ projectId: hook.project_id, ownerId: hook.owner_id, actorId: null, eventType: 'deploy_hook.triggered', summary: `Triggered deploy hook ${hook.label}`, metadata: { hookId, deploymentId: queued.id } });

  return NextResponse.json({ ok: true, deployment: queued }, { status: 202 });
}
