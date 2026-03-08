import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { syncGitHubInstallationFromWebhookPayload, verifyGitHubSignature } from '../../../../lib/github';
import { queueDeploymentForRepository } from '../../../../lib/projects-service';

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifyGitHubSignature(payload, signature)) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  const event = request.headers.get('x-github-event');
  const body = JSON.parse(payload) as {
    action?: string;
    ref?: string;
    head_commit?: { id?: string; message?: string };
    repository?: { full_name?: string };
    installation?: {
      id?: number;
      app_slug?: string;
      target_type?: string;
      repository_selection?: string;
      permissions?: Record<string, string>;
      account?: { login?: string; id?: number; type?: string };
    };
  };

  if (event === 'installation' || event === 'installation_repositories') {
    await syncGitHubInstallationFromWebhookPayload({
      action: body.action,
      installation: body.installation
    });

    return NextResponse.json({ ok: true, synced: true });
  }

  if (event !== 'push') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const branch = body.ref?.replace('refs/heads/', '') ?? 'main';
  const repoFullName = body.repository?.full_name;

  if (!repoFullName) {
    return NextResponse.json({ ok: false, error: 'Missing repository name' }, { status: 400 });
  }

  const deployment = await queueDeploymentForRepository({
    repoFullName,
    branch,
    commitSha: body.head_commit?.id,
    commitMessage: body.head_commit?.message
  });

  if (!deployment) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'project-not-found' });
  }

  revalidatePath('/dashboard');
  revalidatePath(`/projects/${deployment.project_id}`);

  return NextResponse.json({ ok: true, deployment }, { status: 202 });
}
