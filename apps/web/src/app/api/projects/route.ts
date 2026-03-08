import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { hasSupabasePublicConfig } from '../../../lib/env';
import { createProject } from '../../../lib/projects-service';
import { getOptionalAuthenticatedUser } from '../../../lib/supabase-auth';

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getOptionalAuthenticatedUser();

    if (hasSupabasePublicConfig() && !user) {
      return NextResponse.json({ ok: false, error: 'You must sign in before creating a project' }, { status: 401 });
    }

    const created = await createProject(body, user?.id);

    revalidatePath('/dashboard');
    revalidatePath(`/projects/${created.project.id}`);

    return NextResponse.json({ ok: true, project: created.project, deployment: created.deployment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 400 }
    );
  }
}
