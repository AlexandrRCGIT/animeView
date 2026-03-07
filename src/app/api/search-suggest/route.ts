import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { data } = await supabase
    .from('anime')
    .select('shikimori_id, title, title_orig, poster_url, year, anime_kind')
    .or(`title.ilike.%${q}%,title_orig.ilike.%${q}%,title_en.ilike.%${q}%`)
    .order('shikimori_rating', { ascending: false })
    .limit(6);

  return NextResponse.json({ results: data ?? [] });
}
