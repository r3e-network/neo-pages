import { NextResponse } from 'next/server';

import { recordProjectUsage } from '../../../../lib/usage';

export async function POST(request: Request) {
  const secret = process.env.USAGE_INGEST_SECRET;
  const incomingSecret = request.headers.get('x-neopages-ingest-secret');

  if (!secret || incomingSecret !== secret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { projectId?: string; bytes?: number; requestCount?: number };
    await recordProjectUsage({ projectId: body.projectId ?? '', bytes: Number(body.bytes ?? 0), requestCount: Number(body.requestCount ?? 1) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to record usage' }, { status: 400 });
  }
}
