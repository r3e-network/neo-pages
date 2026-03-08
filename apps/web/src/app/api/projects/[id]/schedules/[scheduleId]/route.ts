import { NextResponse } from 'next/server';

import { deleteProjectDeploySchedule } from '../../../../../../lib/project-schedules';
import { hasSupabasePublicConfig } from '../../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../../lib/supabase-auth';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; scheduleId: string }> }) {
  const { id, scheduleId } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await deleteProjectDeploySchedule(id, scheduleId, user?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to delete deploy schedule' }, { status: 400 });
  }
}
