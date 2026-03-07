import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

interface RutubeVideo {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  season: number | null;
  episode: number | null;
  publication_ts: number;
}

interface RutubePageResponse {
  results: RutubeVideo[];
  has_next: boolean;
  next: string | null;
}

function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

// GET /api/admin/rutube/fetch?tv_id=12345
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tvId = req.nextUrl.searchParams.get('tv_id')?.trim();
  if (!tvId) {
    return NextResponse.json({ error: 'tv_id required' }, { status: 400 });
  }

  const videos: RutubeVideo[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= 20) {
    const url = `https://rutube.ru/api/metainfo/tv/${tvId}/video?format=json&page=${page}&show_all=1&sort=original`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': 'AnimeView/1.0' },
        cache: 'no-store',
      });
    } catch {
      return NextResponse.json({ error: 'Ошибка соединения с Rutube' }, { status: 502 });
    }

    if (res.status === 404) {
      return NextResponse.json({ error: `TV ID «${tvId}» не найден на Rutube` }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Rutube API вернул ${res.status}` }, { status: 502 });
    }

    const data: RutubePageResponse = await res.json();
    videos.push(...data.results);
    hasNext = data.has_next && !!data.next;
    page++;
  }

  return NextResponse.json({ videos, total: videos.length });
}
