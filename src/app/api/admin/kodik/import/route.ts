import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getKodikByShikimoriId } from '@/lib/api/kodik/client';
import { buildAnimeRow, pickCanonical } from '@/lib/sync/syncFromKodik';
import { supabase } from '@/lib/supabase';
import type { KodikResult } from '@/lib/api/kodik/types';
import { isAdminUserId } from '@/lib/admin';
import { isTrustedWriteRequest } from '@/lib/security';

export async function POST(request: Request) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { shikimori_id?: number };
  try {
    body = (await request.json()) as { shikimori_id?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const shikimori_id = Number(body.shikimori_id ?? 0);
  if (!Number.isInteger(shikimori_id) || shikimori_id <= 0) {
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
