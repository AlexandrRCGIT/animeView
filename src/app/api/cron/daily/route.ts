import { NextResponse } from 'next/server';
import { syncFreshFromKodik } from '@/lib/sync/syncFromKodik';
import { enrichRelatedBatch } from '@/lib/sync/enrichRelated';
import { forceRefresh } from '@/lib/cache';
import { fetchHomeData } from '@/lib/api/home-data';
import { supabase } from '@/lib/supabase';

export const maxDuration = 300;

const LAST_SYNC_KEY = 'sync:kodik:last_fresh';
// Fallback для первого запуска: 25 часов назад
const FALLBACK_WINDOW_MS = 25 * 3600 * 1000;

async function readLastSyncMs(): Promise<number> {
  const { data } = await supabase
    .from('api_cache')
    .select('data')
    .eq('key', LAST_SYNC_KEY)
    .single();

  if (data?.data && typeof (data.data as { ts?: number }).ts === 'number') {
    return (data.data as { ts: number }).ts;
  }
  return Date.now() - FALLBACK_WINDOW_MS;
}

async function saveLastSyncMs(ts: number): Promise<void> {
  await supabase
    .from('api_cache')
    .upsert(
      { key: LAST_SYNC_KEY, data: { ts }, cached_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    if (auth !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 1. Читаем дату последнего успешного синка
    const lastSyncMs = await readLastSyncMs();
    const runStartMs = Date.now();
    const sinceIso = new Date(lastSyncMs).toISOString();

    console.log(`[cron/daily] Syncing since ${sinceIso}`);

    // 2. Синхронизация свежих тайтлов из Kodik
    const syncResult = await syncFreshFromKodik(lastSyncMs);
    console.log(`[cron/daily] Sync done: upserted=${syncResult.upserted} errors=${syncResult.errors}`);

    // 4. Определяем тайтлы без related_ids среди свежесинхронизированных
    let toEnrich: number[] = [];
    if (syncResult.syncedIds.length > 0) {
      const { data: rows } = await supabase
        .from('anime')
        .select('shikimori_id, related_ids')
        .in('shikimori_id', syncResult.syncedIds);

      toEnrich = (rows ?? [])
        .filter(row => !Array.isArray(row.related_ids) || row.related_ids.length === 0)
        .map(row => Number(row.shikimori_id));
    }

    // 5. Загружаем все shikimori_id из БД для фильтрации related
    const allIds = new Set<number>();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data } = await supabase
        .from('anime')
        .select('shikimori_id')
        .range(from, from + pageSize - 1);
      const chunk = data ?? [];
      for (const row of chunk) allIds.add(Number(row.shikimori_id));
      if (chunk.length < pageSize) break;
    }

    // 6. Enrich related для новых тайтлов без связей
    let enrichResult = { updated: 0, skipped: 0, errors: 0 };
    if (toEnrich.length > 0) {
      console.log(`[cron/daily] Enriching related for ${toEnrich.length} titles`);
      enrichResult = await enrichRelatedBatch(toEnrich, allIds);
    }

    // 7. Фиксируем время начала этого запуска как новую точку отсчёта.
    //    Сохраняем runStartMs (а не Date.now()), чтобы не пропустить
    //    обновления Kodik, которые пришли пока шёл синк.
    await saveLastSyncMs(runStartMs);

    // 8. Обновляем кэш главной страницы
    await forceRefresh('home:v1', fetchHomeData);

    return NextResponse.json({
      ok: true,
      since: sinceIso,
      at: new Date(runStartMs).toISOString(),
      sync: {
        upserted: syncResult.upserted,
        errors: syncResult.errors,
        pages: syncResult.pages,
      },
      enrich: {
        candidates: toEnrich.length,
        ...enrichResult,
      },
    });
  } catch (err) {
    console.error('[cron/daily] Fatal error:', err);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
