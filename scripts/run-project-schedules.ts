import process from 'node:process';

import { executeDueProjectSchedules } from '../apps/web/src/lib/project-schedules';

async function loadEnvFiles() {
  for (const file of ['.env', '.env.local', '.env.local.supabase']) {
    try {
      process.loadEnvFile?.(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

await loadEnvFiles();

const limit = Number.parseInt(process.argv[2] ?? '25', 10);

async function main() {
  const summary = await executeDueProjectSchedules(limit);
  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
