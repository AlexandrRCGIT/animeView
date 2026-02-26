import type {
  AniListMediaDetail,
  AniListMediaShort,
  AniListPageResponse,
  AniListMediaResponse,
  MediaSeason,
  PageInfo,
} from './types';
import {
  TRENDING_ANIME_QUERY,
  POPULAR_ANIME_QUERY,
  SEARCH_ANIME_QUERY,
  BROWSE_ANIME_QUERY,
  ANIME_DETAIL_QUERY,
  ANIME_BY_IDS_QUERY,
} from './queries';
import { ANIME_GENRES } from './genres';

// Набор значений, которые идут в genre_in (остальное — tag_in)
const GENRE_VALUES = new Set(
  ANIME_GENRES.filter((g) => g.type === 'genre').map((g) => g.value)
);

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

// ─── Тип страницы с пагинацией ────────────────────────────────────────────────

export interface AniListPage<T> {
  media: T[];
  pageInfo: PageInfo;
}

// ─── API-методы ───────────────────────────────────────────────────────────────

/**
 * Трендовые аниме текущего сезона.
 * ISR: 10 минут.
 */
export async function getTrendingAnime(
  page = 1,
  perPage = 24
): Promise<AniListPage<AniListMediaShort>> {
  const { season, year } = getCurrentSeason();

  const data = await anilistRequest<AniListPageResponse<AniListMediaShort>['data']>(
    TRENDING_ANIME_QUERY,
    { page, perPage, season, seasonYear: year },
    { revalidate: 600 }
  );

  return { media: data.Page.media, pageInfo: data.Page.pageInfo };
}

/**
 * Популярное аниме за всё время.
 * ISR: 1 час.
 */
export async function getPopularAnime(
  page = 1,
  perPage = 24
): Promise<AniListPage<AniListMediaShort>> {
  const data = await anilistRequest<AniListPageResponse<AniListMediaShort>['data']>(
    POPULAR_ANIME_QUERY,
    { page, perPage },
    { revalidate: 3600 }
  );

  return { media: data.Page.media, pageInfo: data.Page.pageInfo };
}

/**
 * Поиск аниме по названию.
 * Без кэша — зависит от пользовательского ввода.
 */
export async function searchAnime(
  search: string,
  page = 1,
  perPage = 24
): Promise<AniListPage<AniListMediaShort>> {
  const data = await anilistRequest<AniListPageResponse<AniListMediaShort>['data']>(
    SEARCH_ANIME_QUERY,
    { search, page, perPage },
    { revalidate: 0 }
  );

  return { media: data.Page.media, pageInfo: data.Page.pageInfo };
}

/**
 * Каталог с фильтрами: сортировка, жанр, опциональный поиск.
 * Без кэша — параметры меняются по запросу пользователя.
 */
export async function getBrowseAnime(opts: {
  page?: number;
  perPage?: number;
  search?: string;
  genre?: string | string[] | null;
  sort?: string;
  year?: number | null;
  season?: string | null;
  tag?: string | null;
  status?: string | null;
}): Promise<AniListPage<AniListMediaShort>> {
  const { page = 1, perPage = 24, search, genre, sort = 'TRENDING_DESC', year, season, tag, status } = opts;

  const variables: Record<string, unknown> = { page, perPage, sort: [sort] };
  if (search) variables.search = search;

  // Разбиваем выбранные жанры/теги на два отдельных массива для API
  if (genre) {
    const values = Array.isArray(genre) ? genre : [genre];
    const genreList = values.filter((v) => GENRE_VALUES.has(v));
    const tagList   = values.filter((v) => !GENRE_VALUES.has(v));
    if (genreList.length > 0) variables.genre_in = genreList;
    if (tagList.length > 0)   variables.tag_in   = tagList;
  }
  if (tag) variables.tag_in = [tag];
  if (year) variables.seasonYear = year;
  if (season) variables.season = season;

  if (status) {
    // Явный выбор статуса пользователем
    variables.status = status;
  } else if (sort === 'START_DATE_DESC') {
    // "Новее" без явного статуса → скрываем анонсы (ещё не вышедшие)
    variables.status_not_in = ['NOT_YET_RELEASED'];
  }

  const data = await anilistRequest<AniListPageResponse<AniListMediaShort>['data']>(
    BROWSE_ANIME_QUERY,
    variables,
    { revalidate: 0 }
  );

  return { media: data.Page.media, pageInfo: data.Page.pageInfo };
}

/**
 * Список аниме по массиву AniList ID (для избранного).
 * Без кэша — персональные данные.
 */
export async function getAnimeByIds(ids: number[]): Promise<AniListMediaShort[]> {
  if (ids.length === 0) return [];
  const data = await anilistRequest<AniListPageResponse<AniListMediaShort>['data']>(
    ANIME_BY_IDS_QUERY,
    { ids, perPage: Math.min(ids.length, 50) },
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
