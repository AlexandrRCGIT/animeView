import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPreferredAnimeTitle } from '@/lib/db/anime';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { data } = await supabase
    .from('anime')
    .select('shikimori_id, title, title_orig, poster_url, year, anime_kind, material_data')
    .or(`title.ilike.%${q}%,title_orig.ilike.%${q}%,title_en.ilike.%${q}%,material_data->>anime_title.ilike.%${q}%`)
    .order('shikimori_rating', { ascending: false })
    .limit(6);

  const results = (data ?? []).map((row) => ({
    shikimori_id: row.shikimori_id,
    title: getPreferredAnimeTitle(row),
    title_orig: row.title_orig,
    poster_url: row.poster_url,
    year: row.year,
    anime_kind: row.anime_kind,
  }));

  return NextResponse.json({ results });
}
