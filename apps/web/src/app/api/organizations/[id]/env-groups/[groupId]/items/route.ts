import { NextResponse } from 'next/server';

import { listOrganizationEnvGroups, upsertOrganizationEnvGroupItem } from '../../../../../../../lib/project-env-groups';
import { hasSupabasePublicConfig } from '../../../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../../../lib/supabase-auth';

export async function POST(request: Request, context: { params: Promise<{ id: string; groupId: string }> }) {
  const { id, groupId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { key?: string; value?: string; environment?: 'all' | 'production' | 'preview' };
    await upsertOrganizationEnvGroupItem(id, groupId, user?.id, {
      key: body.key ?? '',
      value: body.value ?? '',
      environment: body.environment ?? 'all'
    });
    const groups = await listOrganizationEnvGroups(id, user?.id);
    const group = groups.find((candidate) => candidate.id === groupId) ?? null;
    return NextResponse.json({ ok: true, group });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to save organization environment variable' }, { status: 400 });
  }
}
