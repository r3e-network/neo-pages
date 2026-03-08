import process from 'node:process';

import { createAdminSupabaseClient } from '../apps/web/src/lib/supabase';
import { refreshGitHubInstallationCaches } from '../apps/web/src/lib/github';

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

const force = process.argv.includes('--force');

async function main() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required');
  }

  const { data, error } = await supabase
    .from('github_app_installations')
    .select('owner_id')
    .is('deleted_at', null)
    .not('owner_id', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  const ownerIds = Array.from(new Set((data ?? []).map((row) => String((row as { owner_id: string }).owner_id)).filter(Boolean)));

  let refreshedInstallations = 0;
  let refreshedRepositories = 0;
  const details: Array<{ ownerId: string; refreshedInstallations: number; refreshedRepositories: number }> = [];

  for (const ownerId of ownerIds) {
    const summary = await refreshGitHubInstallationCaches(ownerId, force);
    refreshedInstallations += summary.refreshedInstallations;
    refreshedRepositories += summary.refreshedRepositories;
    details.push({ ownerId, ...summary });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        force,
        ownersScanned: ownerIds.length,
        refreshedInstallations,
        refreshedRepositories,
        details
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
