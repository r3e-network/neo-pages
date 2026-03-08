import path from 'node:path';

import { z } from 'zod';

const builderConfigSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GITHUB_ACCESS_TOKEN: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  EDGE_PUBLIC_ORIGIN: z.string().url().optional(),
  BUILDER_PORT: z.coerce.number().default(4000),
  BUILDER_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  BUILDER_SANDBOX_MODE: z.enum(['local', 'docker']).default('local'),
  BUILDER_POLL_INTERVAL_MS: z.coerce.number().default(0),
  BUILDER_WORKDIR: z.string().default('.tmp/builder'),
  BUILDER_DOCKER_IMAGE: z.string().default('node:22-bookworm'),
  STORAGE_BACKEND: z.enum(['local', 'neofs']).default('local'),
  LOCAL_STORAGE_ROOT: z.string().default('data/storage'),
  NEOFS_GATEWAY_ORIGIN: z.string().url().default('http://http.fs.neo.org/gw'),
  NEOFS_RPC_ENDPOINT: z.string().optional(),
  NEOFS_WALLET_PATH: z.string().optional(),
  NEOFS_WALLET_PASSWORD: z.string().optional(),
  NEOFS_CONTAINER_POLICY: z.string().default('REP 2 IN X CBF 3 SELECT 2 FROM * AS X'),
  NEOFS_CONTAINER_BASIC_ACL: z.string().default('0x1FBF'),
  NEOFS_CLI_BIN: z.string().default('neofs-cli'),
  NEOPAGES_ROOT_DOMAIN: z.string().default('neopages.dev')
});

export type BuilderConfig = ReturnType<typeof loadBuilderConfig>;

export function loadBuilderConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = builderConfigSchema.parse(env);

  return {
    supabaseUrl: parsed.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    githubAccessToken: parsed.GITHUB_ACCESS_TOKEN,
    githubAppId: parsed.GITHUB_APP_ID,
    githubAppPrivateKey: parsed.GITHUB_APP_PRIVATE_KEY,
    githubWebhookSecret: parsed.GITHUB_WEBHOOK_SECRET,
    edgePublicOrigin: parsed.EDGE_PUBLIC_ORIGIN,
    port: parsed.BUILDER_PORT,
    publicUrl: parsed.BUILDER_PUBLIC_URL,
    sandboxMode: parsed.BUILDER_SANDBOX_MODE,
    pollIntervalMs: parsed.BUILDER_POLL_INTERVAL_MS,
    workdir: path.resolve(parsed.BUILDER_WORKDIR),
    dockerImage: parsed.BUILDER_DOCKER_IMAGE,
    storageBackend: parsed.STORAGE_BACKEND,
    localStorageRoot: path.resolve(parsed.LOCAL_STORAGE_ROOT),
    neofsGatewayOrigin: parsed.NEOFS_GATEWAY_ORIGIN.replace(/\/$/, ''),
    neofsRpcEndpoint: parsed.NEOFS_RPC_ENDPOINT,
    neofsWalletPath: parsed.NEOFS_WALLET_PATH,
    neofsWalletPassword: parsed.NEOFS_WALLET_PASSWORD,
    neofsContainerPolicy: parsed.NEOFS_CONTAINER_POLICY,
    neofsContainerBasicAcl: parsed.NEOFS_CONTAINER_BASIC_ACL,
    neofsCliBin: parsed.NEOFS_CLI_BIN,
    rootDomain: parsed.NEOPAGES_ROOT_DOMAIN
  };
}

export function hasSupabaseConfig(config: BuilderConfig): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

export function hasGitHubAppConfig(config: BuilderConfig): boolean {
  return Boolean(config.githubAppId && config.githubAppPrivateKey);
}
