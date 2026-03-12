import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getKodikByShikimoriId } from '@/lib/api/kodik/client';
import { buildAnimeRow, pickCanonical } from '@/lib/sync/syncFromKodik';
import { supabase } from '@/lib/supabase';
import type { KodikResult } from '@/lib/api/kodik/types';

function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { shikimori_id } = await request.json() as { shikimori_id: number };
  if (!shikimori_id) {
    return NextResponse.json({ error: 'Missing shikimori_id' }, { status: 400 });
  }

  try {
    const response = await getKodikByShikimoriId(shikimori_id);
    const results = (response.results ?? []) as KodikResult[];

    if (!results.length) {
      return NextResponse.json({ ok: false, error: 'Тайтл не найден в Kodik' });
    }

    const canonical = pickCanonical(results);
    const animeRow = buildAnimeRow(canonical);

    const { error } = await supabase
      .from('anime')
      .upsert(animeRow, { onConflict: 'shikimori_id' });

    if (error) {
      console.error('[admin/kodik/import] upsert error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      shikimori_id,
      title: animeRow.title,
      translations_in_kodik: results.length,
    });
  } catch (err) {
    console.error('[admin/kodik/import]', err);
    return NextResponse.json({ error: 'Ошибка импорта' }, { status: 500 });
  }
}
