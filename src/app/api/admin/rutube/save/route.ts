import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

// POST /api/admin/rutube/save
// Body: { shikimori_id: number, rutube_episodes: Record<string, Record<string, string>> | null }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { shikimori_id?: number; rutube_episodes?: unknown };
  const { shikimori_id, rutube_episodes } = body;

  if (!shikimori_id) {
    return NextResponse.json({ error: 'shikimori_id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('anime')
    .update({ rutube_episodes: rutube_episodes ?? null })
    .eq('shikimori_id', shikimori_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
