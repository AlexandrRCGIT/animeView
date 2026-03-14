import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPreferredAnimeTitle } from '@/lib/db/anime';
import { getOrFetch } from '@/lib/cache';
import { createHash } from 'crypto';

const SEARCH_SUGGEST_TTL_SECONDS = 24 * 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limitParam = Number(searchParams.get('limit') ?? '6');
  const limit = Math.min(Math.max(1, limitParam), 24);

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cacheHash = createHash('sha1')
    .update(JSON.stringify({ q: q.toLowerCase(), limit }))
    .digest('hex');

  const results = await getOrFetch(
    `search:suggest:v2:${cacheHash}`,
    SEARCH_SUGGEST_TTL_SECONDS,
    async () => {
      // Нормализованный поиск: убирает дефисы/пробелы с обеих сторон
      // "ванпис" → найдёт "ван-пис", "ван пис" → найдёт "ван-пис" и т.д.
      const { data: idRows } = await supabase
        .rpc('search_anime_normalized', { search_query: q, result_limit: limit });

      const ids = (idRows ?? []).map((r: { shikimori_id: number }) => r.shikimori_id);
      if (!ids.length) return [];

      const { data } = await supabase
        .from('anime')
        .select('shikimori_id, title, title_orig, title_en, poster_url, year, anime_kind, material_data, shikimori_rating')
        .in('shikimori_id', ids)
        .order('shikimori_rating', { ascending: false, nullsFirst: false });

      return (data ?? []).map((row) => ({
        shikimori_id: row.shikimori_id,
        title: getPreferredAnimeTitle(row),
        title_orig: row.title_orig,
        poster_url: row.poster_url,
        year: row.year,
        anime_kind: row.anime_kind,
      }));
    },
  );

  return NextResponse.json(
    { results },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
