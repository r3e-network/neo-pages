import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';
import {
  buildDeploymentUrl,
  buildPreviewDeploymentUrl,
  buildProjectWebhookPayload,
  createGitHubAppJwt,
  normalizeGitHubAppPrivateKey,
  type DeploymentRecord,
  type ProjectRecord
} from '@neopages/core';

import { hasGitHubAppConfig, hasSupabaseConfig, type BuilderConfig } from '../config';
import { getProjectBuildEnv } from '../../../web/src/lib/project-env';
import { deliverProjectWebhooks } from '../../../web/src/lib/project-webhooks';
import { createBuildPlan } from './build-plan';
import { runSandboxedBuild } from './sandbox';
import { LocalStorageProvider } from '../storage/local';
import { NeoFSStorageProvider } from '../storage/neofs';

const GITHUB_API_ORIGIN = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

const activeDeploymentControllers = new Map<string, AbortController>();


export function cancelRunningDeployment(deploymentId: string): boolean {
  const controller = activeDeploymentControllers.get(deploymentId);
  if (!controller) {
    return false;
  }

  controller.abort();
  return true;
}

interface DeploymentContext {
  deployment: DeploymentRecord;
  project: ProjectRecord;
}

function createCloneUrl(project: ProjectRecord, token?: string): string {
  if (!token || (!project.repo_full_name.startsWith('http') && !project.repo_url)) {
    return project.repo_url ?? `https://github.com/${project.repo_full_name}.git`;
  }

  const source = project.repo_url ?? `https://github.com/${project.repo_full_name}.git`;
  return source.replace('https://', `https://x-access-token:${token}@`);
}

async function runCommand(command: string, args: string[], cwd?: string, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env });

    const abort = () => {
      child.kill('SIGTERM');
      const error = new Error(`${command} cancelled`);
      error.name = 'AbortError';
      reject(error);
    };

    if (signal) {
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener('abort', abort, { once: true });
    }
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed: ${stderr}`));
    });

    child.on('error', reject);
  });
}

function createSupabaseAdmin(config: BuilderConfig) {
  if (!hasSupabaseConfig(config)) {
    throw new Error('Supabase configuration is required for the builder service');
  }

  return createClient(config.supabaseUrl!, config.supabaseServiceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function loadDeploymentContext(config: BuilderConfig, deploymentId: string): Promise<DeploymentContext> {
  const supabase = createSupabaseAdmin(config);

  const { data: deployment, error: deploymentError } = await supabase
    .from('deployments')
    .select('*')
    .eq('id', deploymentId)
    .single();

  if (deploymentError || !deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', deployment.project_id)
    .single();

  if (projectError || !project) {
    throw new Error(`Project ${deployment.project_id} not found`);
  }

  return {
    deployment: deployment as DeploymentRecord,
    project: project as ProjectRecord
  };
}

async function appendDeploymentLog(config: BuilderConfig, deploymentId: string, logs: string[]) {
  const supabase = createSupabaseAdmin(config);

  await supabase
    .from('deployments')
    .update({ logs: logs.join('') })
    .eq('id', deploymentId);
}

async function updateDeploymentStatus(
  config: BuilderConfig,
  deploymentId: string,
  values: Record<string, string | null>
) {
  const supabase = createSupabaseAdmin(config);
  await supabase.from('deployments').update(values).eq('id', deploymentId);
}

async function updateProjectDeployment(
  config: BuilderConfig,
  projectId: string,
  values: Record<string, string | null>
) {
  const supabase = createSupabaseAdmin(config);
  await supabase.from('projects').update(values).eq('id', projectId);
}

async function createInstallationAccessToken(config: BuilderConfig, installationId: number): Promise<string> {
  if (!config.githubAppId || !config.githubAppPrivateKey) {
    throw new Error('GitHub App credentials are missing in builder config');
  }

  const jwt = createGitHubAppJwt({
    appId: config.githubAppId,
    privateKey: normalizeGitHubAppPrivateKey(config.githubAppPrivateKey)
  });

  const response = await fetch(`${GITHUB_API_ORIGIN}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${jwt}`,
      'X-GitHub-Api-Version': GITHUB_API_VERSION
    }
  });

  const payload = (await response.json()) as { token?: string };
  if (!response.ok || !payload.token) {
    throw new Error('Failed to create GitHub App installation token for builder');
  }

  return payload.token;
}

async function resolveCloneToken(config: BuilderConfig, project: ProjectRecord): Promise<string | undefined> {
  if (project.github_installation_id && hasGitHubAppConfig(config)) {
    return createInstallationAccessToken(config, project.github_installation_id);
  }

  return config.githubAccessToken;
}

async function cloneRepository(input: {
  config: BuilderConfig;
  project: ProjectRecord;
  branch: string;
  commitSha?: string | null;
  workspaceDir: string;
  configSignal?: AbortSignal;
}) {
  const repoDir = path.join(input.workspaceDir, 'repo');
  const cloneToken = await resolveCloneToken(input.config, input.project);

  await mkdir(input.workspaceDir, { recursive: true });
  await runCommand('git', ['clone', '--depth', '1', '--branch', input.branch, createCloneUrl(input.project, cloneToken), repoDir], undefined, input.configSignal);

  if (input.commitSha) {
    await runCommand('git', ['checkout', input.commitSha], repoDir, input.configSignal);
  }

  return repoDir;
}


async function persistDeploymentArtifacts(config: BuilderConfig, projectId: string, deploymentId: string, artifacts: Array<{ path: string; size_bytes: number; content_type: string | null }>) {
  if (!hasSupabaseConfig(config) || artifacts.length === 0) {
    return;
  }

  const supabase = createSupabaseAdmin(config);
  await supabase.from('deployment_artifacts').delete().eq('deployment_id', deploymentId);
  const { error } = await supabase.from('deployment_artifacts').insert(artifacts.map((artifact) => ({
    project_id: projectId,
    deployment_id: deploymentId,
    path: artifact.path,
    size_bytes: artifact.size_bytes,
    content_type: artifact.content_type
  })));

  if (error) {
    throw new Error(error.message);
  }
}

function createStorageProvider(config: BuilderConfig) {
  if (config.storageBackend === 'neofs') {
    return new NeoFSStorageProvider(config);
  }

  return new LocalStorageProvider(config.localStorageRoot, config.publicUrl);
}

export async function runDeployment(config: BuilderConfig, deploymentId: string) {
  const logs: string[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let flushPromise = Promise.resolve();

  const flushLogs = async (force = false) => {
    if (!hasSupabaseConfig(config)) {
      return;
    }

    const persist = async () => {
      await appendDeploymentLog(config, deploymentId, logs);
    };

    if (force) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushPromise = flushPromise.then(persist);
      await flushPromise;
      return;
    }

    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushPromise = flushPromise.then(persist);
      }, 350);
    }
  };

  const log = (line: string) => {
    logs.push(`${line.endsWith('\n') ? line : `${line}\n`}`);
    void flushLogs();
  };

  const workspaceDir = path.join(config.workdir, deploymentId);

  let context: DeploymentContext | null = null;
  const abortController = new AbortController();
  activeDeploymentControllers.set(deploymentId, abortController);

  try {
    context = await loadDeploymentContext(config, deploymentId);
    if (context.deployment.status === 'cancelled') {
      return { deploymentId, cancelled: true };
    }

    await rm(workspaceDir, { recursive: true, force: true });
    await updateDeploymentStatus(config, deploymentId, {
      status: 'building',
      started_at: new Date().toISOString()
    });

    await deliverProjectWebhooks({
      event: 'deployment.started',
      projectId: context.project.id,
      payload: buildProjectWebhookPayload({
        event: 'deployment.started',
        project: {
          id: context.project.id,
          name: context.project.name,
          subdomain: context.project.subdomain,
          repoFullName: context.project.repo_full_name
        },
        deployment: {
          id: context.deployment.id,
          environment: context.deployment.environment,
          branch: context.deployment.branch,
          status: 'building',
          deploymentUrl: context.deployment.deployment_url,
          commitSha: context.deployment.commit_sha,
          previewAlias: context.deployment.preview_alias
        }
      })
    });

    log(`Cloning ${context.project.repo_full_name}#${context.deployment.branch}`);
    await flushLogs(true);
    const repoDir = await cloneRepository({
      config,
      project: context.project,
      branch: context.deployment.branch,
      commitSha: context.deployment.commit_sha,
      workspaceDir,
      configSignal: abortController.signal
    });

    const appDir = path.resolve(repoDir, context.project.root_directory || '.');
    const extraEnv = await getProjectBuildEnv(context.project.id, context.deployment.environment);
    const buildPlan = await createBuildPlan({
      repoDir: appDir,
      framework: context.project.framework,
      outputDirectory: context.project.output_directory,
      installCommand: context.project.install_command,
      buildCommand: context.project.build_command
    });

    log(`Using ${buildPlan.packageManager} with ${buildPlan.outputDirectory} output`);
    if (Object.keys(extraEnv).length > 0) {
      log(`Injecting ${Object.keys(extraEnv).length} project environment variable(s)`);
    }
    await runSandboxedBuild({
      mode: config.sandboxMode,
      repoDir: appDir,
      dockerImage: config.dockerImage,
      buildPlan,
      extraEnv,
      signal: abortController.signal,
      onLog: log
    });

    const outputDir = path.resolve(appDir, buildPlan.outputDirectory);
    await readFile(path.join(outputDir, 'index.html'));

    await flushLogs(true);

    await updateDeploymentStatus(config, deploymentId, {
      status: 'uploading',
      logs: logs.join('')
    });

    const storage = createStorageProvider(config);
    const uploaded = await storage.uploadSite({
      deploymentId,
      outputDir
    });

    await persistDeploymentArtifacts(config, context.project.id, deploymentId, uploaded.artifacts);

    const deploymentUrl = context.deployment.environment === 'preview'
      ? buildPreviewDeploymentUrl(context.deployment.branch, context.project.subdomain, config.rootDomain, config.edgePublicOrigin)
      : config.edgePublicOrigin
        ? buildDeploymentUrl(context.project.subdomain, config.rootDomain, config.edgePublicOrigin)
        : uploaded.previewUrl;

    log(`Uploaded ${uploaded.fileCount} files to ${uploaded.containerId}`);
    await flushLogs(true);

    await updateDeploymentStatus(config, deploymentId, {
      status: 'deployed',
      finished_at: new Date().toISOString(),
      container_id: uploaded.containerId,
      deployment_url: deploymentUrl,
      logs: logs.join('')
    });

    if (context.deployment.environment === 'production') {
      await updateProjectDeployment(config, context.project.id, {
        status: 'deployed',
        container_id: uploaded.containerId,
        deployment_url: deploymentUrl
      });
    }

    await deliverProjectWebhooks({
      event: 'deployment.succeeded',
      projectId: context.project.id,
      payload: buildProjectWebhookPayload({
        event: 'deployment.succeeded',
        project: {
          id: context.project.id,
          name: context.project.name,
          subdomain: context.project.subdomain,
          repoFullName: context.project.repo_full_name
        },
        deployment: {
          id: context.deployment.id,
          environment: context.deployment.environment,
          branch: context.deployment.branch,
          status: 'deployed',
          deploymentUrl,
          commitSha: context.deployment.commit_sha,
          previewAlias: context.deployment.preview_alias
        }
      })
    });

    return {
      deploymentId,
      containerId: uploaded.containerId,
      deploymentUrl,
      logLines: logs.length
    };
  } catch (error) {
    log(error instanceof Error ? error.message : 'Unknown deployment error');
    await flushLogs(true);

    const aborted = error instanceof Error && error.name === 'AbortError';

    if (hasSupabaseConfig(config)) {
      await updateDeploymentStatus(config, deploymentId, {
        status: aborted ? 'cancelled' : 'failed',
        finished_at: new Date().toISOString(),
        logs: logs.join('')
      });

      if (context?.deployment.environment === 'production') {
        await updateProjectDeployment(config, context.project.id, { status: aborted ? 'deployed' : 'failed' });
      }
    }

    if (context && !aborted) {
      await deliverProjectWebhooks({
        event: 'deployment.failed',
        projectId: context.project.id,
        payload: buildProjectWebhookPayload({
          event: 'deployment.failed',
          project: {
            id: context.project.id,
            name: context.project.name,
            subdomain: context.project.subdomain,
            repoFullName: context.project.repo_full_name
          },
          deployment: {
            id: context.deployment.id,
            environment: context.deployment.environment,
            branch: context.deployment.branch,
            status: 'failed',
            deploymentUrl: context.deployment.deployment_url,
            commitSha: context.deployment.commit_sha,
            previewAlias: context.deployment.preview_alias
          }
        })
      });
    }

    throw error;
  } finally {
    activeDeploymentControllers.delete(deploymentId);
    await rm(workspaceDir, { recursive: true, force: true });
  }
}

export async function processNextQueuedDeployment(config: BuilderConfig) {
  const supabase = createSupabaseAdmin(config);
  const { data } = await supabase
    .from('deployments')
    .select('id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.id) {
    return null;
  }

  return runDeployment(config, data.id as string);
}
