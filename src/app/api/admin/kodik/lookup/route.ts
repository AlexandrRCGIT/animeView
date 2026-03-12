import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getKodikByShikimoriId } from '@/lib/api/kodik/client';
import { pickCanonical } from '@/lib/sync/syncFromKodik';
import type { KodikResult } from '@/lib/api/kodik/types';

function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const response = await getKodikByShikimoriId(id);
    const results = (response.results ?? []) as KodikResult[];

    if (!results.length) {
      return NextResponse.json({ found: false, total: 0 });
    }

    const canonical = pickCanonical(results);
    const md = canonical.material_data;

    const translations = results.map(r => ({
      kodik_id: r.id,
      translation_id: r.translation?.id,
      translation_title: r.translation?.title,
      translation_type: r.translation?.type,
      last_season: r.last_season,
      last_episode: r.last_episode,
      episodes_count: r.episodes_count,
    }));

    return NextResponse.json({
      found: true,
      total: results.length,
      canonical: {
        shikimori_id: Number(canonical.shikimori_id),
        title: md?.title || canonical.title || canonical.title_orig,
        title_orig: canonical.title_orig,
        poster_url: md?.poster_url ?? md?.anime_poster_url ?? null,
        year: canonical.year ?? md?.year ?? null,
        anime_kind: md?.anime_kind ?? null,
        anime_status: md?.anime_status ?? md?.all_status ?? null,
        genres: md?.anime_genres ?? md?.all_genres ?? [],
        shikimori_rating: md?.shikimori_rating ?? null,
        episodes_count: canonical.episodes_count ?? 0,
        last_season: canonical.last_season ?? null,
        last_episode: canonical.last_episode ?? null,
        description: md?.anime_description ?? md?.description ?? null,
      },
      translations,
    });
  } catch (err) {
    console.error('[admin/kodik/lookup]', err);
    return NextResponse.json({ error: 'Kodik API error' }, { status: 502 });
  }
}
