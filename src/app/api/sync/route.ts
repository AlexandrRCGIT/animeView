import { NextResponse } from 'next/server';
import { syncTopAnime, syncCurrentSeason } from '@/lib/sync/syncAnime';
import { forceRefresh } from '@/lib/cache';
import { fetchHomeData } from '@/lib/api/home-data';

/**
 * GET /api/sync
 *
 * Синхронизирует локальную таблицу anime из Jikan + Shikimori.
 * Запускается cron-задачей каждые 4 часа.
 *
 * ?mode=season — только текущий сезон (быстро, ~30 сек)
 * ?mode=full   — топ-1000 + сезон (медленнее, ~60 сек)
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') ?? 'season';

  try {
    // Всегда синхронизируем текущий сезон (8 страниц × 25 = 200 онгоингов)
    const seasonResult = await syncCurrentSeason(8);

    // При полной синхронизации — добавляем топ-1000
    let topResult: { synced: number; errors: number } | null = null;
    if (mode === 'full') {
      topResult = await syncTopAnime(40); // 40 × 25 = 1000 аниме
    }

    // Обновляем кэш главной страницы (данные изменились)
    await forceRefresh('home:v1', fetchHomeData).catch(() => null);

    return NextResponse.json({
      ok: true,
      mode,
      season: seasonResult,
      ...(topResult ? { top: topResult } : {}),
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sync] Fatal error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
