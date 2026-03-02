import type {
  AnimeDetail,
  AnimeListParams,
  AnimeRelated,
  AnimeShort,
} from './types';

// ─── Конфигурация ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://shikimori.one/api';
const USER_AGENT = 'AnimeView/1.0 (https://github.com/your-org/animeview)';

// Shikimori допускает до 5 запросов в секунду и 90 в минуту
// При SSR это нужно учитывать

// ─── Базовый fetch-клиент ─────────────────────────────────────────────────────

async function shikimoriRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ShikimoriError(
      `Shikimori API error: ${response.status} ${response.statusText}`,
      response.status,
      url
    );
  }

  return response.json() as Promise<T>;
}

// ─── Кастомный класс ошибки ───────────────────────────────────────────────────

export class ShikimoriError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string
  ) {
    super(message);
    this.name = 'ShikimoriError';
  }
}

// ─── Хелпер: сериализация query-параметров ────────────────────────────────────

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

// ─── API методы ───────────────────────────────────────────────────────────────

/**
 * Получить список аниме с фильтрацией и сортировкой.
 * Кэш: 5 минут (ISR) — данные обновляются часто, но не каждую секунду.
 */
export async function getAnimeList(
  params: AnimeListParams = {}
): Promise<AnimeShort[]> {
  const query = buildQuery({
    limit: 28,
    order: 'aired_on',
    ...params,
  } as Record<string, unknown>);

  return shikimoriRequest<AnimeShort[]>(`/animes${query}`, {
    next: { revalidate: 300 }, // ISR: обновлять каждые 5 минут
  });
}

/**
 * Получить онгоинги текущего сезона, отсортированные по популярности.
 */
export async function getTrendingAnime(
  page = 1,
  limit = 24
): Promise<AnimeShort[]> {
  const season = getCurrentSeason();
  return getAnimeList({
    status: 'ongoing',
    order: 'popularity',
    season,
    page,
    limit,
    censored: true,
  });
}

/**
 * Получить популярные завершённые тайтлы, отсортированные по рейтингу.
 */
export async function getPopularAnime(
  page = 1,
  limit = 24
): Promise<AnimeShort[]> {
  return getAnimeList({
    order: 'ranked',
    status: 'released',
    page,
    limit,
    censored: true,
  });
}

export interface BrowseAnimeOpts {
  page?: number;
  limit?: number;
  genre?: string[] | null;
  order?: string | null;
  year?: number | null;
  yearTo?: number | null;
  season?: string | null;
  status?: 'anons' | 'ongoing' | 'released' | null;
  search?: string | null;
  kind?: string[] | null;
}

/**
 * Каталог с фильтрами: жанр, сортировка, сезон, год, статус, поиск.
 * season — название сезона ('winter'|'spring'|'summer'|'fall'), year — число.
 * Комбинируются в Shikimori-формат: 'winter_2026'.
 */
export async function getBrowseAnime(
  opts: BrowseAnimeOpts = {}
): Promise<AnimeShort[]> {
  const { page = 1, limit = 24, genre, order, year, yearTo, season, status, search, kind } = opts;

  let seasonStr: string | undefined;
  if (season && year) seasonStr = `${season}_${year}`;
  else if (year && yearTo && year !== yearTo) {
    const from = Math.min(year, yearTo);
    const to   = Math.max(year, yearTo);
    seasonStr = `${from}_${to}`;
  } else if (year)   seasonStr = String(year);
  else if (yearTo)   seasonStr = String(yearTo);
  else if (season)   seasonStr = season;

  return getAnimeList({
    page,
    limit,
    ...(genre?.length ? { genre: genre.join(',') } : {}),
    ...(kind?.length  ? { kind:  kind.join(',')  } : {}),
    ...(order ? { order: order as AnimeListParams['order'] } : {}),
    ...(seasonStr ? { season: seasonStr } : {}),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    censored: true,
  });
}

/**
 * Получить список аниме по массиву Shikimori ID (для страницы избранного).
 */
export async function getAnimeByShikimoriIds(
  ids: number[]
): Promise<AnimeShort[]> {
  if (!ids.length) return [];
  return getAnimeList({
    ids: ids.join(','),
    limit: ids.length,
  });
}

/**
 * Получить последние обновления (онгоинги, отсортированные по дате выхода).
 */
export async function getLatestUpdates(
  page = 1,
  limit = 28
): Promise<AnimeShort[]> {
  return getAnimeList({
    status: 'ongoing',
    order: 'aired_on',
    page,
    limit,
    censored: true,
  });
}

/**
 * Получить полную информацию о конкретном аниме по ID.
 * Кэш: 1 час — метаданные меняются редко.
 */
export async function getAnimeById(id: number): Promise<AnimeDetail> {
  return shikimoriRequest<AnimeDetail>(`/animes/${id}`, {
    next: { revalidate: 3600 },
  });
}

/**
 * Поиск аниме по названию.
 */
export async function searchAnime(
  query: string,
  limit = 20
): Promise<AnimeShort[]> {
  return getAnimeList({
    search: query,
    limit,
    order: 'ranked',
  });
}

/**
 * Получить топ аниме (по рейтингу Shikimori).
 */
export async function getTopAnime(
  page = 1,
  limit = 28
): Promise<AnimeShort[]> {
  return getAnimeList({
    order: 'ranked',
    status: 'released',
    page,
    limit,
    censored: true,
  });
}

/**
 * Получить онгоинги текущего сезона.
 */
export async function getCurrentSeasonAnime(
  limit = 28
): Promise<AnimeShort[]> {
  const season = getCurrentSeason();
  return getAnimeList({
    season,
    status: 'ongoing',
    order: 'popularity',
    limit,
    censored: true,
  });
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  let season: string;
  if (month >= 1 && month <= 3) season = 'winter';
  else if (month >= 4 && month <= 6) season = 'spring';
  else if (month >= 7 && month <= 9) season = 'summer';
  else season = 'fall';

  return `${season}_${year}`;
}

/**
 * Возвращает лучшее доступное название: русское → оригинальное (romaji).
 */
export function getBestTitle(anime: AnimeShort): string {
  return anime.russian || anime.name;
}

/**
 * Форматирует статус аниме на русском.
 */
export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    ongoing: 'Онгоинг',
    released: 'Завершён',
    anons: 'Анонс',
  };
  return map[status] ?? status;
}

/**
 * Форматирует тип/формат аниме на русском.
 */
export function formatKind(kind: string): string {
  const map: Record<string, string> = {
    tv: 'TV',
    movie: 'Фильм',
    ova: 'OVA',
    ona: 'ONA',
    special: 'Спецвыпуск',
    music: 'Музыкальное',
    tv_13: 'TV-13',
    tv_24: 'TV-24',
    tv_48: 'TV-48',
  };
  return map[kind] ?? kind.toUpperCase();
}

/**
 * Формирует полный URL постера с домена Shikimori.
 */
export function getShikimoriImageUrl(path: string): string {
  return `https://shikimori.one${path}`;
}

/**
 * Получить список связанных аниме/манги с типом отношения (Sequel, Prequel и т.д.).
 * Использует /api/animes/{id}/related — возвращает relation: "Sequel" для продолжений.
 */
export async function getRelatedAnime(id: number): Promise<AnimeRelated[]> {
  return shikimoriRequest<AnimeRelated[]>(`/animes/${id}/related`, {
    next: { revalidate: 86400 }, // 24ч — список связанных меняется редко
  });
}

/**
 * Получить связанные аниме одной франшизы, исключая текущий тайтл.
 */
export async function getRelatedByFranchise(
  franchise: string,
  excludeId: number
): Promise<AnimeShort[]> {
  const list = await getAnimeList({ franchise, limit: 20 }).catch(() => []);
  return list.filter(a => a.id !== excludeId);
}
