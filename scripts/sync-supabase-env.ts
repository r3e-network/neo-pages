import process from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { buildSupabaseLocalEnvFile, parseSupabaseStatusEnv } from '@neopages/core';

const outputPath = path.resolve(process.argv[2] ?? '.env.local.supabase');
const args = [
  'status',
  '-o',
  'env',
  '--override-name',
  'API_URL=NEXT_PUBLIC_SUPABASE_URL',
  '--override-name',
  'ANON_KEY=NEXT_PUBLIC_SUPABASE_ANON_KEY',
  '--override-name',
  'SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY'
];

function runSupabaseStatus(): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('supabase', args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr || stdout || `supabase status exited with code ${code ?? 1}`));
    });
  });
}

async function main() {
  const output = await runSupabaseStatus();
  const env = parseSupabaseStatusEnv(output);
  env.SUPABASE_URL ??= env.NEXT_PUBLIC_SUPABASE_URL;
  env.SUPABASE_ANON_KEY ??= env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fileContents = buildSupabaseLocalEnvFile(env);
  await fs.writeFile(outputPath, fileContents, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
