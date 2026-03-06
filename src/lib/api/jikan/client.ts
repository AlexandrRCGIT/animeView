// Jikan v4 — unofficial MAL API. ID совпадает с Shikimori/MAL ID.
// Rate limit: ~3 req/sec. Данные кэшируются 24ч на серверах Jikan.

const BASE_URL = 'https://api.jikan.moe/v4';

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp?: { image_url: string; large_image_url: string };
  };
  trailer?: {
    images?: {
      maximum_image_url?: string | null;
      large_image_url?: string | null;
      medium_image_url?: string | null;
      image_url?: string | null;
    } | null;
  } | null;
  episodes: number | null;
  score: number | null;
  genres: Array<{ mal_id: number; name: string }>;
  studios: Array<{ mal_id: number; name: string }>;
  year: number | null;
  season: string | null;
  status: string;
  airing: boolean;
  synopsis: string | null;
  broadcast?: {
    day: string | null;
    time: string | null;
  };
}

interface JikanListResponse {
  data: JikanAnime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
  };
}

async function jikanRequest<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 600 }, // ISR 10 минут
  });
  if (!res.ok) throw new Error(`Jikan error ${res.status}: ${endpoint}`);
  return res.json() as Promise<T>;
}

/**
 * Топ онгоингов по рейтингу — для Hero секции.
 */
export async function getJikanTrending(limit = 5): Promise<JikanAnime[]> {
  const data = await jikanRequest<JikanListResponse>(
    `/top/anime?filter=airing&limit=${limit}`
  );
  return data.data;
}

/**
 * Аниме текущего сезона — для секции «Новые серии».
 */
export async function getJikanCurrentSeason(limit = 6): Promise<JikanAnime[]> {
  const data = await jikanRequest<JikanListResponse>(
    `/seasons/now?limit=${limit}`
  );
  return data.data;
}
