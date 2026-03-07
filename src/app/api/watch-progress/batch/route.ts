import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

// GET /api/watch-progress/batch?ids=1,2,3
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ progress: {} });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('ids') ?? '';
  const ids = raw
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n > 0)
    .slice(0, 100); // не более 100 за раз

  if (!ids.length) {
    return NextResponse.json({ progress: {} });
  }

  const { data } = await supabase
    .from('watch_progress')
    .select('shikimori_id, episode, is_completed')
    .eq('user_id', session.user.id)
    .in('shikimori_id', ids);

  const progress: Record<string, { episode: number; is_completed: boolean }> = {};
  for (const row of data ?? []) {
    progress[String(row.shikimori_id)] = {
      episode: row.episode ?? 1,
      is_completed: row.is_completed ?? false,
    };
  }

  return NextResponse.json({ progress });
}
