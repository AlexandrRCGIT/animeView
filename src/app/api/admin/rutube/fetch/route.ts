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
  order_position?: number;
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

async function fetchAllPages(buildUrl: (page: number) => string): Promise<{ videos: RutubeVideo[]; error?: string }> {
  const videos: RutubeVideo[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= 20) {
    let res: Response;
    try {
      res = await fetch(buildUrl(page), {
        headers: { 'User-Agent': 'AnimeView/1.0' },
        cache: 'no-store',
      });
    } catch {
      return { videos, error: 'Ошибка соединения с Rutube' };
    }

    if (res.status === 404) return { videos, error: 'ID не найден на Rutube (404)' };
    if (!res.ok) return { videos, error: `Rutube API вернул ${res.status}` };

    const data: RutubePageResponse = await res.json();
    videos.push(...data.results);
    hasNext = data.has_next && !!data.next;
    page++;
  }

  return { videos };
}

// GET /api/admin/rutube/fetch?tv_id=12345&type=tv|playlist
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tvId = req.nextUrl.searchParams.get('tv_id')?.trim();
  const type = req.nextUrl.searchParams.get('type') ?? 'tv';
  if (!tvId) {
    return NextResponse.json({ error: 'tv_id required' }, { status: 400 });
  }

  let result: { videos: RutubeVideo[]; error?: string };

  if (type === 'playlist') {
    // User playlist: https://rutube.ru/api/playlist/{id}/videos/
    result = await fetchAllPages(
      (page) => `https://rutube.ru/api/playlist/${tvId}/videos/?format=json&page=${page}&per_page=50`,
    );

    // Если playlist endpoint не сработал — пробуем tv endpoint
    if (result.error || result.videos.length === 0) {
      const fallback = await fetchAllPages(
        (page) => `https://rutube.ru/api/metainfo/tv/${tvId}/video?format=json&page=${page}&show_all=1&sort=original`,
      );
      if (!fallback.error && fallback.videos.length > 0) {
        result = fallback;
      }
    }
  } else {
    // TV show / metainfo endpoint
    result = await fetchAllPages(
      (page) => `https://rutube.ru/api/metainfo/tv/${tvId}/video?format=json&page=${page}&show_all=1&sort=original`,
    );
  }

  if (result.error && result.videos.length === 0) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Для плейлистов где нет season/episode — нумеруем по порядку
  const videos = result.videos.map((v, i) => ({
    ...v,
    season: v.season ?? 1,
    episode: v.episode ?? (i + 1),
  }));

  return NextResponse.json({ videos, total: videos.length });
}
