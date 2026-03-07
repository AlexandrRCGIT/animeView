import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

// GET /api/admin/rutube/current?id=12345
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data } = await supabase
    .from('anime')
    .select('rutube_episodes')
    .eq('shikimori_id', Number(id))
    .maybeSingle();

  return NextResponse.json({ rutube_episodes: data?.rutube_episodes ?? null });
}
