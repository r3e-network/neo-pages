import { NextResponse } from 'next/server';

import { createProjectDeploySchedule, listProjectDeploySchedules } from '../../../../../lib/project-schedules';
import { hasSupabasePublicConfig } from '../../../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../../../lib/supabase-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const schedules = await listProjectDeploySchedules(id, user?.id);
  return NextResponse.json({ ok: true, schedules });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getOptionalAuthenticatedUser();

  if (hasSupabasePublicConfig() && !user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { label?: string; branch?: string; cronExpression?: string; timezone?: string };
    const schedule = await createProjectDeploySchedule(id, user?.id, {
      label: body.label ?? '',
      branch: body.branch ?? 'main',
      cronExpression: body.cronExpression ?? '',
      timezone: body.timezone
    });
    return NextResponse.json({ ok: true, schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to create deploy schedule' }, { status: 400 });
  }
}
