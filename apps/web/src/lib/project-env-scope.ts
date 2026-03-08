import { z } from 'zod';

export const projectEnvScopes = ['all', 'production', 'preview'] as const;
export type ProjectEnvScope = (typeof projectEnvScopes)[number];
export const projectEnvScopeSchema = z.enum(projectEnvScopes);

export function mergeProjectBuildEnv(
  records: Array<{ key: string; value: string; environment: ProjectEnvScope }>,
  environment: 'production' | 'preview'
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const record of records.filter((record) => record.environment === 'all')) {
    result[record.key] = record.value;
  }

  for (const record of records.filter((record) => record.environment === environment)) {
    result[record.key] = record.value;
  }

  return result;
}
