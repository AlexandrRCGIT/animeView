import { supabase } from '@/lib/supabase';
import type { KodikResult, KodikMaterialData, KodikSeasons } from '@/lib/api/kodik/types';

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
 * Извлечь display-данные эпизодов (title + первый скриншот) из seasons.
 * Не хранит ссылки — они translation-specific и идут в anime_translations.seasons.
 */
function extractEpisodesInfo(
  seasons: KodikSeasons
): Record<string, Record<string, { title: string | null; screenshot: string | null }>> {
  const result: Record<string, Record<string, { title: string | null; screenshot: string | null }>> = {};

  for (const [seasonNum, seasonData] of Object.entries(seasons)) {
    result[seasonNum] = {};
    for (const [epNum, epData] of Object.entries(seasonData.episodes)) {
      result[seasonNum][epNum] = {
        title: epData.title ?? null,
        screenshot: epData.screenshots?.[0] ?? null,
      };
    }
  }

  return result;
}

/**
 * Извлечь ссылки на эпизоды из seasons (translation-specific).
 */
function extractSeasonLinks(
  seasons: KodikSeasons
): Record<string, { link: string; episodes: Record<string, string> }> {
  const result: Record<string, { link: string; episodes: Record<string, string> }> = {};

  for (const [seasonNum, seasonData] of Object.entries(seasons)) {
    result[seasonNum] = {
      link: seasonData.link,
      episodes: Object.fromEntries(
        Object.entries(seasonData.episodes).map(([epNum, epData]) => [epNum, epData.link])
      ),
    };
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
function buildAnimeRow(item: KodikResult) {
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
 * Собрать данные для таблицы anime_translations из KodikResult.
 */
function buildTranslationRow(item: KodikResult, shikimoriId: number) {
  return {
    shikimori_id:      shikimoriId,
    kodik_id:          item.id,
    translation_id:    item.translation.id,
    translation_title: item.translation.title,
    translation_type:  item.translation.type,
    link:              item.link,
    quality:           item.quality ?? null,
    last_season:       item.last_season ?? null,
    last_episode:      item.last_episode ?? null,
    episodes_count:    item.episodes_count ?? 0,
    seasons:           item.seasons ? extractSeasonLinks(item.seasons) : null,
    kodik_updated_at:  item.updated_at ?? null,
  };
}

// ─── Основная функция синхронизации ──────────────────────────────────────────

/**
 * Синхронизация аниме из Kodik в Supabase.
 *
 * mode='full'    — все аниме (единоразово, тяжёлый запрос)
 * mode='ongoing' — только онгоинги и анонсы (для регулярного обновления)
 */
export async function syncFromKodik(mode: SyncMode = 'full'): Promise<SyncResult> {
  const result: SyncResult = { upserted: 0, translations: 0, errors: 0, pages: 0, skipped: 0 };

  const params = new URLSearchParams({
    token:               KODIK_TOKEN,
    types:               'anime,anime-serial',
    lgbt:                'false',
    with_episodes_data:  'true',
    with_material_data:  'true',
    limit:               '100',
    sort:                'updated_at',
    order:               'desc',
  });

  if (mode === 'ongoing') {
    params.set('anime_status', 'ongoing,anons');
  }

  let nextUrl: string | null = `${BASE_URL}/list?${params}`;

  while (nextUrl) {
    try {
      const response: Response = await fetch(nextUrl);

      if (!response.ok) {
        console.error(`[syncFromKodik] API error: ${response.status} ${response.statusText}`);
        result.errors++;
        break;
      }

      const data = await response.json();
      result.pages++;

      // Группируем результаты страницы по shikimori_id
      // Для каждого shikimori_id: один upsert в anime, по одному в anime_translations
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

      // Upsert anime + translations для всех записей с shikimori_id
      for (const [shikiId, items] of byShikiId) {
        try {
          // Выбираем "лучший" item для основной таблицы:
          // приоритет — у кого есть material_data + максимум эпизодов
          const canonical = items.reduce((best, cur) => {
            if (!best.material_data && cur.material_data) return cur;
            if (best.episodes_count < cur.episodes_count) return cur;
            return best;
          });

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

          // Upsert все переводы
          for (const item of items) {
            const translationRow = buildTranslationRow(item, shikiId);

            const { error: trErr } = await supabase
              .from('anime_translations')
              .upsert(translationRow, { onConflict: 'kodik_id' });

            if (trErr) {
              console.error(`[syncFromKodik] translation upsert error (${item.id}):`, trErr.message);
              result.errors++;
            } else {
              result.translations++;
            }
          }
        } catch (err) {
          console.error(`[syncFromKodik] processing error (shikiId=${shikiId}):`, err);
          result.errors++;
        }
      }

      nextUrl = data.next_page || null;

      // Небольшая задержка между страницами
      if (nextUrl) await sleep(150);

    } catch (err) {
      console.error('[syncFromKodik] fetch error:', err);
      result.errors++;
      break;
    }
  }

  console.log(`[syncFromKodik] Done. Pages: ${result.pages}, Upserted: ${result.upserted}, Translations: ${result.translations}, Skipped (no shikiId): ${result.skipped}, Errors: ${result.errors}`);
  return result;
}
