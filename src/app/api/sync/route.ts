import { NextResponse } from 'next/server';
import { syncFromKodik } from '@/lib/sync/syncFromKodik';

/**
 * GET /api/sync
 *
 * Синхронизирует таблицы anime + anime_translations из Kodik.
 *
 * ?mode=full    — полный начальный импорт всего каталога
 * ?mode=ongoing — только онгоинги и новые (по умолчанию)
 */
export const maxDuration = 300;

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

  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get('mode') ?? 'ongoing') as 'full' | 'ongoing';

  try {
    const result = await syncFromKodik(mode);
    return NextResponse.json({ ok: true, mode, ...result, at: new Date().toISOString() });
  } catch (err) {
    console.error('[sync] Fatal error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
