import { supabase } from '@/lib/supabase';
import type { KodikResult, KodikSeasons } from '@/lib/api/kodik/types';

const KODIK_TOKEN = process.env.KODIK_TOKEN!;
const BASE_URL = 'https://kodikapi.com';

export type SyncMode = 'full' | 'ongoing';

export interface SyncResult {
  upserted: number;
  translations: number;
  errors: number;
  pages: number;
  skipped: number;
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Извлечь display-данные эпизодов из seasons.
 * Храним title + screenshot + link для поиска и прямого перехода к серии.
 */
function extractEpisodesInfo(
  seasons: KodikSeasons
): Record<string, Record<string, { title: string | null; screenshot: string | null; link: string | null }>> {
  const result: Record<string, Record<string, { title: string | null; screenshot: string | null; link: string | null }>> = {};

  for (const [seasonNum, seasonData] of Object.entries(seasons)) {
    result[seasonNum] = {};
    for (const [epNum, epData] of Object.entries(seasonData.episodes)) {
      result[seasonNum][epNum] = {
        title: epData.title ?? null,
        screenshot: epData.screenshots?.[0] ?? null,
        link: epData.link ?? null,
      };
    }
  }

  return result;
}

/**
 * Определить русское название:
 * material_data.title (КиноПоиск обычно возвращает русское) → kodik.title
 */
function getRussianTitle(item: KodikResult): string {
  return item.material_data?.title || item.title || item.title_orig;
}

/**
 * Собрать данные для таблицы anime из KodikResult.
 */
export function buildAnimeRow(item: KodikResult) {
  const md = item.material_data;

  return {
    shikimori_id:     Number(item.shikimori_id),
    kinopoisk_id:     item.kinopoisk_id ?? null,
    imdb_id:          item.imdb_id ?? null,
    worldart_link:    item.worldart_link ?? null,

    title:            getRussianTitle(item),
    title_orig:       item.title_orig || null,
    title_jp:         item.other_title || null,
    title_en:         md?.title_en ?? null,

    type:             item.type,
    year:             item.year ?? md?.year ?? null,
    anime_kind:       md?.anime_kind ?? null,
    anime_status:     md?.anime_status ?? md?.all_status ?? null,

    shikimori_rating: md?.shikimori_rating ?? null,
    shikimori_votes:  md?.shikimori_votes ?? null,
    kinopoisk_rating: md?.kinopoisk_rating ?? null,
    kinopoisk_votes:  md?.kinopoisk_votes ?? null,
    imdb_rating:      md?.imdb_rating ?? null,
    imdb_votes:       md?.imdb_votes ?? null,

    poster_url:       md?.poster_url ?? md?.anime_poster_url ?? null,
    screenshots:      item.screenshots?.slice(0, 5) ?? [],

    last_season:      item.last_season ?? null,
    last_episode:     item.last_episode ?? null,
    episodes_count:   item.episodes_count ?? 0,
    episodes_info:    item.seasons ? extractEpisodesInfo(item.seasons) : null,

    genres:           md?.anime_genres ?? md?.all_genres ?? md?.genres ?? [],
    studios:          md?.anime_studios ?? [],
    countries:        md?.countries ?? [],
    description:      md?.anime_description ?? md?.description ?? null,
    duration:         md?.duration ?? null,
    rating_mpaa:      md?.rating_mpaa ?? null,
    minimal_age:      md?.minimal_age ?? null,

    material_data:    md ?? null,
    blocked_countries: item.blocked_countries ?? [],

    kodik_updated_at: item.updated_at ?? null,
    synced_at:        new Date().toISOString(),
  };
}

/**
 * Выбрать каноничную запись для тайтла.
 * Приоритет: больше эпизодов/сезонов, наличие material_data, свежее обновление.
 */
export function pickCanonical(items: KodikResult[]): KodikResult {
  return items.reduce((best, cur) => {
    const bestHasSeasons = !!best.seasons && Object.keys(best.seasons).length > 0;
    const curHasSeasons = !!cur.seasons && Object.keys(cur.seasons).length > 0;
    if (!bestHasSeasons && curHasSeasons) return cur;

    const bestEpisodes = best.episodes_count ?? 0;
    const curEpisodes = cur.episodes_count ?? 0;
    if (curEpisodes > bestEpisodes) return cur;

    if (!best.material_data && cur.material_data) return cur;

    const bestUpdated = Date.parse(best.updated_at ?? '') || 0;
    const curUpdated = Date.parse(cur.updated_at ?? '') || 0;
    if (curUpdated > bestUpdated) return cur;

    return best;
  });
}

// ─── Синхронизация свежих тайтлов ────────────────────────────────────────────

export interface FreshSyncResult {
  upserted: number;
  errors: number;
  pages: number;
  syncedIds: number[];
}

/**
 * Синхронизирует тайтлы из Kodik, обновлённые после sinceMs (unix timestamp в мс).
 * Пагинация прекращается, когда все элементы страницы старше sinceMs.
 */
export async function syncFreshFromKodik(sinceMs: number): Promise<FreshSyncResult> {
  const result: FreshSyncResult = { upserted: 0, errors: 0, pages: 0, syncedIds: [] };

  const cutoffMs = sinceMs;

  const params = new URLSearchParams({
    token:              KODIK_TOKEN,
    types:              'anime,anime-serial',
    has_field:          'shikimori_id',
    lgbt:               'false',
    with_episodes_data: 'true',
    with_material_data: 'true',
    limit:              '100',
    sort:               'updated_at',
    order:              'desc',
  });

  let nextUrl: string | null = `${BASE_URL}/list?${params}`;
  const MAX_PAGES = 500;

  while (nextUrl && result.pages < MAX_PAGES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    try {
      const freshResponse: Response = await fetch(nextUrl, { signal: controller.signal });

      if (!freshResponse.ok) {
        console.error(`[syncFresh] API error: ${freshResponse.status}`);
        result.errors++;
        break;
      }

      const freshData = await freshResponse.json();
      result.pages++;

      const items = freshData.results as KodikResult[];

      // Останавливаемся если вся страница старше cutoff
      const allOld = items.every(item => {
        const ts = item.updated_at ? Date.parse(item.updated_at) : 0;
        return ts < cutoffMs;
      });

      // Группируем свежие элементы по shikimori_id
      const byShikiId = new Map<number, KodikResult[]>();
      for (const item of items) {
        if (!item.shikimori_id) continue;
        const ts = item.updated_at ? Date.parse(item.updated_at) : 0;
        if (ts < cutoffMs) continue;
        const sid = Number(item.shikimori_id);
        if (!byShikiId.has(sid)) byShikiId.set(sid, []);
        byShikiId.get(sid)!.push(item);
      }

      for (const [shikiId, items] of byShikiId) {
        try {
          const canonical = pickCanonical(items);
          const animeRow = buildAnimeRow(canonical);

          const { error } = await supabase
            .from('anime')
            .upsert(animeRow, { onConflict: 'shikimori_id' });

          if (error) {
            console.error(`[syncFresh] upsert error (${shikiId}):`, error.message);
            result.errors++;
            continue;
          }

          result.upserted++;
          result.syncedIds.push(shikiId);
        } catch (err) {
          console.error(`[syncFresh] processing error (${shikiId}):`, err);
          result.errors++;
        }
      }

      if (allOld || !freshData.next_page) break;

      nextUrl = freshData.next_page;
      await sleep(150);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[syncFresh] fetch timeout, stopping pagination');
      } else {
        console.error('[syncFresh] fetch error:', err);
      }
      result.errors++;
      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (result.pages >= MAX_PAGES) {
    console.warn(`[syncFresh] Hit MAX_PAGES limit (${MAX_PAGES}), pagination stopped`);
  }

  console.log(`[syncFresh] Done. Pages: ${result.pages}, Upserted: ${result.upserted}, Errors: ${result.errors}`);
  return result;
}

// ─── Основная функция синхронизации ──────────────────────────────────────────

/**
 * Синхронизация аниме из Kodik в Supabase.
 *
 * В БД пишутся только уникальные тайтлы (anime) без anime_translations.
 * mode='full'    — полный импорт всех доступных тайтлов
 * mode='ongoing' — только онгоинги и анонсы (для регулярного обновления)
 */
export async function syncFromKodik(mode: SyncMode = 'full'): Promise<SyncResult> {
  const result: SyncResult = { upserted: 0, translations: 0, errors: 0, pages: 0, skipped: 0 };

  const params = new URLSearchParams({
    token:               KODIK_TOKEN,
    types:               'anime,anime-serial',
    has_field:           'shikimori_id',
    lgbt:                'false',
    with_episodes_data:  'true',
    with_material_data:  'true',
    limit:               '100',
    sort:                'shikimori_rating',
    order:               'desc',
  });

  if (mode === 'ongoing') {
    params.set('anime_status', 'ongoing,anons');
  }

  let nextUrl: string | null = `${BASE_URL}/list?${params}`;
  const MAX_PAGES_FULL = 500;

  while (nextUrl && result.pages < MAX_PAGES_FULL) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    try {
      const response: Response = await fetch(nextUrl, { signal: controller.signal });

      if (!response.ok) {
        console.error(`[syncFromKodik] API error: ${response.status} ${response.statusText}`);
        result.errors++;
        break;
      }

      const data = await response.json();
      result.pages++;

      // Группируем результаты страницы по shikimori_id
      // Для каждого shikimori_id: один upsert в anime
      const byShikiId = new Map<number, KodikResult[]>();
      const noShikiId: KodikResult[] = [];

      for (const item of data.results as KodikResult[]) {
        if (item.shikimori_id) {
          const sid = Number(item.shikimori_id);
          if (!byShikiId.has(sid)) byShikiId.set(sid, []);
          byShikiId.get(sid)!.push(item);
        } else {
          noShikiId.push(item);
        }
      }

      result.skipped += noShikiId.length;

      // Upsert только уникальных тайтлов
      for (const [shikiId, items] of byShikiId) {
        try {
          const canonical = pickCanonical(items);

          const animeRow = buildAnimeRow(canonical);

          const { error: animeErr } = await supabase
            .from('anime')
            .upsert(animeRow, { onConflict: 'shikimori_id' });

          if (animeErr) {
            console.error(`[syncFromKodik] anime upsert error (${shikiId}):`, animeErr.message);
            result.errors++;
            continue;
          }

          result.upserted++;
        } catch (err) {
          console.error(`[syncFromKodik] processing error (shikiId=${shikiId}):`, err);
          result.errors++;
        }
      }

      nextUrl = data.next_page || null;

      // Небольшая задержка между страницами
      if (nextUrl) await sleep(150);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[syncFromKodik] fetch timeout, stopping pagination');
      } else {
        console.error('[syncFromKodik] fetch error:', err);
      }
      result.errors++;
      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (result.pages >= MAX_PAGES_FULL) {
    console.warn(`[syncFromKodik] Hit MAX_PAGES limit (${MAX_PAGES_FULL}), pagination stopped`);
  }

  console.log(`[syncFromKodik] Done. Pages: ${result.pages}, Upserted: ${result.upserted}, Skipped (no shikiId): ${result.skipped}, Errors: ${result.errors}`);
  return result;
}
