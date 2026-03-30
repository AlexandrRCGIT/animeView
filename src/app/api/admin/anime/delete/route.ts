import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isAdminUserId } from '@/lib/admin';
import { isTrustedWriteRequest } from '@/lib/security';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { shikimori_id?: number; reason?: string };
  try {
    body = (await request.json()) as { shikimori_id?: number; reason?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const shikimori_id = Number(body.shikimori_id ?? 0);
  if (!Number.isInteger(shikimori_id) || shikimori_id <= 0) {
    return NextResponse.json({ error: 'Некорректный shikimori_id' }, { status: 400 });
  }

  // Получаем название перед удалением для лога
  const { data: animeData } = await supabase
    .from('anime')
    .select('title, title_orig')
    .eq('shikimori_id', shikimori_id)
    .single();

  if (!animeData) {
    return NextResponse.json({ error: 'Тайтл не найден в базе' }, { status: 404 });
  }

  const results: Record<string, number | string> = {};

  // 1. Удаляем переводы
  const { count: translationsCount, error: trErr } = await supabase
    .from('anime_translations')
    .delete({ count: 'exact' })
    .eq('shikimori_id', shikimori_id);

  if (trErr) {
    console.error('[admin/anime/delete] translations error:', trErr.message);
    return NextResponse.json({ error: 'Ошибка удаления переводов: ' + trErr.message }, { status: 500 });
  }
  results.translations = translationsCount ?? 0;

  // 2. Удаляем прогресс просмотра
  const { count: progressCount } = await supabase
    .from('watch_progress')
    .delete({ count: 'exact' })
    .eq('shikimori_id', shikimori_id);
  results.watch_progress = progressCount ?? 0;

  // 3. Удаляем из избранного
  const { count: favCount } = await supabase
    .from('favorites')
    .delete({ count: 'exact' })
    .eq('shikimori_id', shikimori_id);
  results.favorites = favCount ?? 0;

  // 4. Чистим api_cache
  await supabase
    .from('api_cache')
    .delete()
    .like('key', `kodik:runtime:single:${shikimori_id}:%`);

  // 5. Удаляем само аниме
  const { error: animeErr } = await supabase
    .from('anime')
    .delete()
    .eq('shikimori_id', shikimori_id);

  if (animeErr) {
    console.error('[admin/anime/delete] anime error:', animeErr.message);
    return NextResponse.json({ error: 'Ошибка удаления тайтла: ' + animeErr.message }, { status: 500 });
  }

  // 6. Инвалидируем страницу детали
  try {
    revalidatePath(`/anime/${shikimori_id}`);
  } catch {
    // Не критично
  }

  console.log(`[admin/anime/delete] DMCA удаление: id=${shikimori_id} title="${animeData.title}" reason="${body.reason ?? '—'}" by=${session?.user?.id}`);

  return NextResponse.json({
    ok: true,
    shikimori_id,
    title: animeData.title,
    deleted: results,
  });
}
