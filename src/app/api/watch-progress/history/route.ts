import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { getPreferredAnimeTitle } from '@/lib/db/anime';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '6'), 20);

  // Получаем последние просмотры
  const { data: progressRows, error } = await supabase
    .from('watch_progress')
    .select('shikimori_id, season, episode, progress_seconds, duration_seconds, is_completed, updated_at')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!progressRows?.length) {
    return NextResponse.json({ ok: true, items: [] });
  }

  // Загружаем метаданные аниме одним запросом
  const ids = progressRows.map(r => r.shikimori_id);
  const { data: animeRows } = await supabase
    .from('anime')
    .select('shikimori_id, title, poster_url, year, anime_kind, episodes_count, last_episode, material_data')
    .in('shikimori_id', ids);

  const animeMap = new Map((animeRows ?? []).map(a => [a.shikimori_id, a]));

  const items = progressRows
    .map(p => {
      const anime = animeMap.get(p.shikimori_id);
      if (!anime) return null;
      return {
        shikimori_id: p.shikimori_id,
        season: p.season,
        episode: p.episode,
        progress_seconds: p.progress_seconds,
        duration_seconds: p.duration_seconds,
        is_completed: p.is_completed,
        updated_at: p.updated_at,
        title: getPreferredAnimeTitle(anime),
        poster_url: anime.poster_url,
        year: anime.year,
        anime_kind: anime.anime_kind,
        episodes_count: anime.episodes_count,
        last_episode: anime.last_episode,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ ok: true, items });
}
