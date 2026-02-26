import type {
  AnimeDetail,
  AnimeListParams,
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
 * Кэш: отключён — результаты зависят от пользовательского ввода.
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
 * Сезон формируется автоматически: winter_2026, spring_2026 и т.д.
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
 * Формирует полный URL постера с домена Shikimori.
 */
export function getShikimoriImageUrl(path: string): string {
  return `https://shikimori.one${path}`;
}
