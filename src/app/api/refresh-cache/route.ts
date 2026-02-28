import { NextResponse } from 'next/server';
import { forceRefresh } from '@/lib/cache';
import { fetchHomeData } from '@/lib/api/home-data';

/**
 * GET /api/refresh-cache
 *
 * Принудительно обновляет кэшированные данные главной страницы.
 * Вызывается cron-задачей (Vercel Cron) каждые 4 часа.
 *
 * Защита: Vercel автоматически добавляет заголовок
 *   Authorization: Bearer {CRON_SECRET}
 * при вызове из cron. При локальном тесте передайте заголовок вручную.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  // Проверяем секрет только если он задан в окружении
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await forceRefresh('home:v1', fetchHomeData);

    return NextResponse.json({
      ok: true,
      refreshed: ['home:v1'],
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[refresh-cache] Error:', err);
    return NextResponse.json(
      { error: 'Failed to refresh cache' },
      { status: 500 },
    );
  }
}
