import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminUserId } from '@/lib/admin';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function parseWindowMinutes(input: string | null): number {
  const value = Number.parseInt(input ?? '', 10);
  if (!Number.isFinite(value)) return 5;
  return Math.min(30, Math.max(1, value));
}

type PresenceValue = {
  user_id?: string | null;
  last_seen_at?: number;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) return unauthorized();

  const windowMinutes = parseWindowMinutes(req.nextUrl.searchParams.get('window'));
  const cutoff = Date.now() - windowMinutes * 60_000;

  let total = 0;
  let authCount = 0;

  const stream = redis.scanStream({ match: 'presence:*', count: 200 });
  for await (const keys of stream) {
    if (!keys.length) continue;
    const values = await redis.mget(...(keys as string[]));
    for (const v of values) {
      if (!v) continue;
      try {
        const data = JSON.parse(v) as PresenceValue;
        if ((data.last_seen_at ?? 0) < cutoff) continue;
        total++;
        if (data.user_id) authCount++;
      } catch {}
    }
  }

  return NextResponse.json({
    window_minutes: windowMinutes,
    total_online: total,
    authenticated_online: authCount,
    guests_online: total - authCount,
    updated_at: new Date().toISOString(),
  });
}
