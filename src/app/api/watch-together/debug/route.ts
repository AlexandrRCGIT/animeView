import { NextResponse } from 'next/server';

interface DebugPayload {
  event?: string;
  payload?: unknown;
  at?: string;
  animeId?: number;
  userId?: string | null;
}

export async function POST(request: Request) {
  let body: DebugPayload | null = null;
  try {
    body = (await request.json()) as DebugPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const event = typeof body?.event === 'string' ? body.event : 'unknown';
  const at = typeof body?.at === 'string' ? body.at : new Date().toISOString();
  const animeId = Number(body?.animeId ?? 0);
  const userId = typeof body?.userId === 'string' ? body.userId : null;

  console.log('[watch-together/debug]', {
    at,
    event,
    animeId: Number.isFinite(animeId) ? animeId : null,
    userId,
    payload: body?.payload ?? null,
  });

  return NextResponse.json({ ok: true });
}

