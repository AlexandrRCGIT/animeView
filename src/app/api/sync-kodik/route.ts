import { NextResponse } from 'next/server';
import { syncFromKodik, type SyncMode } from '@/lib/sync/syncFromKodik';

export const maxDuration = 300; // 5 минут (Vercel Pro limit)

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);

  // Проверка токена
  if (secret && searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mode = (searchParams.get('mode') ?? 'ongoing') as SyncMode;

  try {
    const result = await syncFromKodik(mode);
    return NextResponse.json({ ok: true, mode, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
