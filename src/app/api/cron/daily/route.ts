import { NextResponse } from 'next/server';
import { enrichRelatedBatch } from '@/lib/sync/enrichRelated';
import { forceRefresh } from '@/lib/cache';
import { fetchHomeData } from '@/lib/api/home-data';
import { supabase } from '@/lib/supabase';
import { notifyTelegramDigest } from '@/lib/sync/notifyTelegram';

export const maxDuration = 300;

const SYNCED_IDS_KEY = 'sync:kodik:last_synced_ids';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 1. Читаем список ID, синхронизированных Go-бинарником synckodik
    const { data: cacheRow } = await supabase
      .from('api_cache')
      .select('data')
      .eq('key', SYNCED_IDS_KEY)
      .single();

    const syncedIds: number[] = (cacheRow?.data as { ids?: number[] } | null)?.ids ?? [];

    // 2. Определяем тайтлы без related_ids среди свежесинхронизированных
    let toEnrich: number[] = [];
    if (syncedIds.length > 0) {
      const { data: rows } = await supabase
        .from('anime')
        .select('shikimori_id, related_ids')
        .in('shikimori_id', syncedIds);

      toEnrich = (rows ?? [])
        .filter(row => !Array.isArray(row.related_ids) || row.related_ids.length === 0)
        .map(row => Number(row.shikimori_id));
    }

    // 3. Загружаем все shikimori_id для фильтрации related
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

    // 4. Enrich related для тайтлов без связей
    let enrichResult = { updated: 0, skipped: 0, errors: 0 };
    if (toEnrich.length > 0) {
      console.log(`[cron/daily] Enriching related for ${toEnrich.length} titles`);
      enrichResult = await enrichRelatedBatch(toEnrich, allIds);
    }

    // 5. Обновляем кеш главной страницы
    await forceRefresh('home:v1', fetchHomeData);

    // 6. Отправляем дайджест в Telegram
    await notifyTelegramDigest(syncedIds);

    return NextResponse.json({
      ok: true,
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
