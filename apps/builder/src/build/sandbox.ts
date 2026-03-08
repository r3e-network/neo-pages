import { spawn } from 'node:child_process';

import type { BuildPlan } from './build-plan';

export interface SandboxExecution {
  command: string;
  args: string[];
}

export function createSandboxExecution(input: {
  mode: 'local' | 'docker';
  repoDir: string;
  dockerImage: string;
  buildPlan: BuildPlan;
  extraEnv?: Record<string, string>;
}): SandboxExecution {
  const script = `${input.buildPlan.installCommand} && ${input.buildPlan.buildCommand}`;

  const envArgs = Object.entries(input.extraEnv ?? {}).flatMap(([key, value]) => ['-e', `${key}=${value}`]);

  if (input.mode === 'docker') {
    return {
      command: 'docker',
      args: [
        'run',
        '--rm',
        ...envArgs,
        '-v',
        `${input.repoDir}:/workspace`,
        '-w',
        '/workspace',
        input.dockerImage,
        'bash',
        '-lc',
        script
      ]
    };
  }

  return {
    command: 'bash',
    args: ['-lc', script]
  };
}

export async function runSandboxedBuild(input: {
  mode: 'local' | 'docker';
  repoDir: string;
  dockerImage: string;
  buildPlan: BuildPlan;
  extraEnv?: Record<string, string>;
  signal?: AbortSignal;
  onLog?: (chunk: string) => void;
}): Promise<void> {
  const execution = createSandboxExecution(input);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(execution.command, execution.args, {
      cwd: input.mode === 'local' ? input.repoDir : undefined,
      env: { ...process.env, ...(input.extraEnv ?? {}) }
    });

    child.stdout.on('data', (chunk) => {
      input.onLog?.(chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      input.onLog?.(chunk.toString());
    });

    const abort = () => {
      child.kill('SIGTERM');
      const error = new Error('Build cancelled');
      error.name = 'AbortError';
      reject(error);
    };

    if (input.signal) {
      if (input.signal.aborted) {
        abort();
        return;
      }
      input.signal.addEventListener('abort', abort, { once: true });
    }

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build sandbox exited with code ${code ?? 'unknown'}`));
    });

    child.on('error', reject);
  });
}

