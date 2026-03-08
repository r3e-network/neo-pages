import { NextResponse } from 'next/server';

import { upsertProjectEnvGroupItem } from '../../../../../../../lib/project-env-groups';
import { hasSupabasePublicConfig } from '../../../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';

export async function POST(request: Request, context: { params: Promise<{ id: string; groupId: string }> }) {
  const { id, groupId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { key?: string; value?: string; environment?: string };
    await upsertProjectEnvGroupItem(id, groupId, user?.id, { key: body.key ?? '', value: body.value ?? '', environment: body.environment });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to save group variable' }, { status: 400 });
  }
}
