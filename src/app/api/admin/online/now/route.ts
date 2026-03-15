import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminUserId } from '@/lib/admin';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function parseWindowMinutes(input: string | null): number {
  const value = Number.parseInt(input ?? '', 10);
  if (!Number.isFinite(value)) return 5;
  return Math.min(30, Math.max(1, value));
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) return unauthorized();

  const windowMinutes = parseWindowMinutes(req.nextUrl.searchParams.get('window'));
  const cutoff = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const [totalRes, authRes, guestRes] = await Promise.all([
    supabase
      .from('online_presence')
      .select('visitor_id', { count: 'exact', head: true })
      .gte('last_seen_at', cutoff),
    supabase
      .from('online_presence')
      .select('visitor_id', { count: 'exact', head: true })
      .gte('last_seen_at', cutoff)
      .not('user_id', 'is', null),
    supabase
      .from('online_presence')
      .select('visitor_id', { count: 'exact', head: true })
      .gte('last_seen_at', cutoff)
      .is('user_id', null),
  ]);

  if (totalRes.error || authRes.error || guestRes.error) {
    return NextResponse.json({ error: 'Failed to load online stats' }, { status: 500 });
  }

  return NextResponse.json({
    window_minutes: windowMinutes,
    total_online: totalRes.count ?? 0,
    authenticated_online: authRes.count ?? 0,
    guests_online: guestRes.count ?? 0,
    updated_at: new Date().toISOString(),
  });
}
