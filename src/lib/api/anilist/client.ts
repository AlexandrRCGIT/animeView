import type {
  AniListMediaDetail,
  AniListMediaShort,
  AniListPageResponse,
  AniListMediaResponse,
  MediaSeason,
} from './types';
import {
  TRENDING_ANIME_QUERY,
  POPULAR_ANIME_QUERY,
  SEARCH_ANIME_QUERY,
  ANIME_DETAIL_QUERY,
} from './queries';

// ─── Конфигурация ─────────────────────────────────────────────────────────────

const ANILIST_URL = 'https://graphql.anilist.co';

// AniList лимит: ~90 запросов в минуту для анонимных пользователей.
// Кэширование через Next.js ISR снижает нагрузку.

// ─── Базовый GraphQL-клиент ───────────────────────────────────────────────────

async function anilistRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  cacheOptions: RequestInit['next'] = { revalidate: 300 }
): Promise<T> {
  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    next: cacheOptions,
  });

  if (!response.ok) {
    throw new AniListError(
      `AniList API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new AniListError(`AniList GraphQL error: ${json.errors[0].message}`, 400);
  }

  return json.data as T;
}

// ─── Кастомный класс ошибки ───────────────────────────────────────────────────

export class AniListError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'AniListError';
  }
}

// ─── API-методы ───────────────────────────────────────────────────────────────

/**
 * Трендовые аниме текущего сезона.
 * ISR: 10 минут (тренды обновляются часто).
 */
export async function getTrendingAnime(
  page = 1,
  perPage = 20
): Promise<AniListMediaShort[]> {
  const { season, year } = getCurrentSeason();

  const data = await anilistRequest<AniListPageResponse<AniListMediaShort>['data']>(
    TRENDING_ANIME_QUERY,
    { page, perPage, season, seasonYear: year },
    { revalidate: 600 }
  );

  return data.Page.media;
}

/**
 * Популярное аниме за всё время.
 * ISR: 1 час (меняется редко).
 */
export async function getPopularAnime(
  page = 1,
  perPage = 20
): Promise<AniListMediaShort[]> {
  const data = await anilistRequest<AniListPageResponse<AniListMediaShort>['data']>(
    POPULAR_ANIME_QUERY,
    { page, perPage },
    { revalidate: 3600 }
  );

  return data.Page.media;
}

/**
 * Поиск аниме по названию.
 * Без кэша — результат зависит от запроса пользователя.
 */
export async function searchAnime(
  search: string,
  page = 1,
  perPage = 20
): Promise<AniListMediaShort[]> {
  const data = await anilistRequest<AniListPageResponse<AniListMediaShort>['data']>(
    SEARCH_ANIME_QUERY,
    { search, page, perPage },
    { revalidate: 0 }
  );

  return data.Page.media;
}

/**
 * Полная информация о тайтле по AniList ID.
 * ISR: 1 час.
 */
export async function getAnimeDetail(id: number): Promise<AniListMediaDetail> {
  const data = await anilistRequest<AniListMediaResponse<AniListMediaDetail>['data']>(
    ANIME_DETAIL_QUERY,
    { id },
    { revalidate: 3600 }
  );

  return data.Media;
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function getCurrentSeason(): { season: MediaSeason; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let season: MediaSeason;
  if (month >= 1 && month <= 3) season = 'WINTER';
  else if (month >= 4 && month <= 6) season = 'SPRING';
  else if (month >= 7 && month <= 9) season = 'SUMMER';
  else season = 'FALL';

  return { season, year };
}

/**
 * Выбирает лучший доступный заголовок.
 * Приоритет: english → romaji → native
 */
export function getBestTitle(
  title: { romaji: string | null; english: string | null; native: string | null }
): string {
  return title.english ?? title.romaji ?? title.native ?? 'Unknown';
}

/**
 * Форматирует статус для отображения.
 */
export function formatStatus(status: string | null): string {
  const map: Record<string, string> = {
    FINISHED: 'Завершён',
    RELEASING: 'Онгоинг',
    NOT_YET_RELEASED: 'Анонс',
    CANCELLED: 'Отменён',
    HIATUS: 'Пауза',
  };
  return status ? (map[status] ?? status) : '';
}

/**
 * Форматирует формат аниме.
 */
export function formatMediaFormat(format: string | null): string {
  const map: Record<string, string> = {
    TV: 'TV',
    TV_SHORT: 'TV Short',
    MOVIE: 'Фильм',
    SPECIAL: 'Спешл',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Клип',
  };
  return format ? (map[format] ?? format) : '';
}
