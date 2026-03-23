import { NextRequest, NextResponse } from 'next/server';
import { getRecentAnimeUpdates, dbToAnimeShort } from '@/lib/db/anime';

const PERIOD_MS: Record<string, number> = {
  today: 24 * 3600 * 1000,
  week: 7 * 24 * 3600 * 1000,
  month: 30 * 24 * 3600 * 1000,
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const period = searchParams.get('period') ?? 'all';
  const since = PERIOD_MS[period] ? new Date(Date.now() - PERIOD_MS[period]).toISOString() : undefined;

  const data = await getRecentAnimeUpdates(30, offset, since);
  const items = data.map((row) => ({ ...dbToAnimeShort(row), kodik_updated_at: row.kodik_updated_at }));
  return NextResponse.json({ items });
}
