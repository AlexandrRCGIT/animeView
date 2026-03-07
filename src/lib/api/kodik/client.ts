import type { KodikSearchResponse, KodikResult, TranslationGroup } from './types';

// ─── Конфигурация ─────────────────────────────────────────────────────────────

const KODIK_API_URL = 'https://kodikapi.com';

function getToken(): string {
  const token = process.env.KODIK_TOKEN;
  if (!token) throw new Error('KODIK_TOKEN environment variable is not set');
  return token;
}

// ─── Базовый запрос ───────────────────────────────────────────────────────────

async function kodikRequest(
  params: Record<string, string | number | boolean>,
  cacheSeconds = 3600
): Promise<KodikSearchResponse> {
  const token = getToken();

  const search = new URLSearchParams({ token: String(token) });
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }

  const response = await fetch(`${KODIK_API_URL}/search?${search}`, {
    next: { revalidate: cacheSeconds },
  });

  if (!response.ok) {
    throw new Error(`Kodik API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<KodikSearchResponse>;
}

// ─── API-методы ───────────────────────────────────────────────────────────────

/**
 * Поиск по shikimori_id (для аниме страницы и fallback-плеера).
 */
export async function getKodikByShikimoriId(
  shikimoriId: number
): Promise<KodikSearchResponse> {
  return kodikRequest({
    shikimori_id: shikimoriId,
    with_episodes_data: true,
    with_material_data: true,
    limit: 100,
  });
}

/**
 * Совместимость со старым названием хелпера.
 * Для Kodik shikimori_id и MAL ID часто совпадают.
 */
export async function getKodikByMalId(
  malId: number
): Promise<KodikSearchResponse> {
  return getKodikByShikimoriId(malId);
}

/**
 * Поиск по названию тайтла (фоллбэк, когда нет точного ID).
 */
export async function getKodikByTitle(
  title: string
): Promise<KodikSearchResponse> {
  return kodikRequest({
    title,
    type: 'anime,anime-serial',
    with_episodes: true,
    limit: 20,
  });
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/**
 * Группирует результаты Kodik по переводам.
 * Один тайтл может иметь несколько озвучек — каждая приходит отдельным объектом.
 */
export function groupByTranslation(results: KodikResult[]): TranslationGroup[] {
  // Дедупликация по translation.id — берём первый (с эпизодами)
  const seen = new Set<number>();
  const groups: TranslationGroup[] = [];

  for (const result of results) {
    const tid = result.translation.id;
    if (!seen.has(tid)) {
      seen.add(tid);
      groups.push({ translation: result.translation, result });
    }
  }

  // Сортируем: войсинг выше сабтитров, потом по ID (популярные переводы)
  return groups.sort((a, b) => {
    if (a.translation.type !== b.translation.type) {
      return a.translation.type === 'voice' ? -1 : 1;
    }
    return a.translation.id - b.translation.id;
  });
}

/**
 * Формирует iframe URL с нужными параметрами.
 * Kodik ссылки начинаются с `//` — добавляем протокол.
 */
export function buildKodikIframeUrl(
  link: string,
  options: {
    episode?: number;
    season?: number;
    autoplay?: boolean;
  } = {}
): string {
  const url = new URL(link.startsWith('//') ? `https:${link}` : link);

  if (options.autoplay) url.searchParams.set('autoplay', '1');
  if (options.episode) url.searchParams.set('episode', String(options.episode));

  return url.toString();
}

/**
 * Получить список эпизодов для конкретного перевода и сезона.
 */
export function getEpisodesForSeason(
  result: KodikResult,
  season = 1
): { episode: number; link: string }[] {
  if (!result.seasons) return [];

  const seasonData = result.seasons[String(season)];
  if (!seasonData) return [];

  return Object.entries(seasonData)
    .map(([ep, data]) => ({
      episode: Number(ep),
      link: data.link.startsWith('//') ? `https:${data.link}` : data.link,
    }))
    .sort((a, b) => a.episode - b.episode);
}
