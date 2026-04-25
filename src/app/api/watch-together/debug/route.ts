import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isTrustedWriteRequest } from '@/lib/security';

interface DebugPayload {
  event?: string;
  payload?: unknown;
  at?: string;
  animeId?: number;
  userId?: string | null;
}

const DEBUG_RATE_LIMIT_PER_MIN = 20;

export async function POST(request: Request) {
  const secret = process.env.WATCH_TOGETHER_DEBUG_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Forbidden origin' }, { status: 403 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!await rateLimit(`wt:debug:${ip}`, DEBUG_RATE_LIMIT_PER_MIN, 60_000)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: DebugPayload | null = null;
  try {
    body = (await request.json()) as DebugPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const event = typeof body?.event === 'string' ? body.event.slice(0, 80) : 'unknown';
  const at = typeof body?.at === 'string' ? body.at : new Date().toISOString();
  const animeId = Number(body?.animeId ?? 0);
  const userId = typeof body?.userId === 'string' ? body.userId.slice(0, 140) : null;

  console.log('[watch-together/debug]', {
    at,
    event,
    animeId: Number.isFinite(animeId) ? animeId : null,
    userId,
    payload: body?.payload ?? null,
  });

  return NextResponse.json({ ok: true });
}
