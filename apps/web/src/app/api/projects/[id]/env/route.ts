import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { listProjectEnvVars, upsertProjectEnvVar } from '../../../../../lib/project-env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const envVars = await listProjectEnvVars(id, user?.id);
  return NextResponse.json({ ok: true, envVars });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { key?: string; value?: string; environment?: string };
    const envVar = await upsertProjectEnvVar(id, user?.id, { key: body.key ?? '', value: body.value ?? '', environment: body.environment });
    return NextResponse.json({ ok: true, envVar }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to save environment variable' },
      { status: 400 }
    );
  }
}
