import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isAdminUserId } from '@/lib/admin';

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('id');
  const shikimori_id = Number(idParam);

  if (!Number.isInteger(shikimori_id) || shikimori_id <= 0) {
    return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('anime')
    .select('shikimori_id, title, title_orig, poster_url, year, anime_kind, anime_status, episodes_count, last_season, last_episode, synced_at')
    .eq('shikimori_id', shikimori_id)
    .single();

  if (error || !data) {
    // Проверяем dmca_blocked
    const { data: dmca } = await supabase
      .from('dmca_blocked')
      .select('shikimori_id, title, title_orig, blocked_at, reason')
      .eq('shikimori_id', shikimori_id)
      .single();

    if (dmca) {
      return NextResponse.json({ found: false, dmca_blocked: dmca });
    }
    return NextResponse.json({ found: false, dmca_blocked: null });
  }

  // Считаем переводы
  const { count } = await supabase
    .from('anime_translations')
    .select('id', { count: 'exact', head: true })
    .eq('shikimori_id', shikimori_id);

  return NextResponse.json({ found: true, anime: data, translations_count: count ?? 0 });
}
