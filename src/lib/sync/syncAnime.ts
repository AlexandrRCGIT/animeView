/**
 * Синхронизация аниме из Jikan + Shikimori → таблица anime в Supabase.
 *
 * Стратегия:
 *  1. Jikan — пакетные эндпоинты (/top/anime, /seasons/now):
 *     даёт изображения MAL CDN + жанры по MAL ID + статус + год + сезон
 *  2. Shikimori batch (/animes?ids=1,2,3,...):
 *     даёт русское название для тех же ID
 *  3. Объединяем → upsert в Supabase
 *
 *  Итог: ~60 API-запросов для синхронизации 1000 тайтлов (~25 сек),
 *  без индивидуальных detail-запросов.
 */

import { supabase } from '@/lib/supabase';

const SHIKIMORI_BASE = 'https://shikimori.one/api';
const SHIKIMORI_UA   = 'AnimeView/1.0';
const JIKAN_BASE     = 'https://api.jikan.moe/v4';

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ─── Маппинги ─────────────────────────────────────────────────────────────────

/** MAL/Jikan genre ID → русское название (совпадают с Shikimori genre IDs) */
const MAL_GENRE_RU: Record<number, string> = {
  1: 'Экшен',        2: 'Приключения',  4: 'Комедия',
  8: 'Драма',       10: 'Фэнтези',    13: 'Исторический',
  14: 'Ужасы',      18: 'Меха',       19: 'Музыка',
  22: 'Романтика',  23: 'Школа',      24: 'Фантастика',
  25: 'Сэйнэн',    26: 'Сёдзё',      28: 'Сёнэн',
  31: 'Спорт',      36: 'Повседневность', 37: 'Мистика',
  38: 'Военное',    40: 'Психологическое', 41: 'Триллер',
  50: 'Детское',    58: 'Сверхъестественное',
};

const STATUS_MAP: Record<string, string> = {
  'Currently Airing': 'ongoing',
  'Finished Airing':  'released',
  'Not yet aired':    'anons',
};

const KIND_MAP: Record<string, string> = {
  'TV': 'tv', 'Movie': 'movie', 'OVA': 'ova',
  'ONA': 'ona', 'Special': 'special', 'Music': 'music',
};

// ─── Jikan helpers ────────────────────────────────────────────────────────────

interface JikanAnime {
  mal_id: number;
  title: string;
  images: {
    jpg: { large_image_url?: string; image_url?: string };
    webp?: { large_image_url?: string; image_url?: string };
  };
  trailer?: {
    images?: {
      maximum_image_url?: string;
      large_image_url?: string;
      medium_image_url?: string;
      image_url?: string;
    };
  };
  score: number | null;
  episodes: number | null;
  members: number | null;
  status: string;
  type: string;
  aired: { from: string | null };
  genres: Array<{ mal_id: number }>;
  studios: Array<{ name: string }>;
  year: number | null;
  season: string | null;
}

async function jikanPage(endpoint: string, page: number): Promise<JikanAnime[]> {
  await delay(400); // Jikan: 3 req/sec
  const res = await fetch(`${JIKAN_BASE}${endpoint}?page=${page}&limit=25`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json() as { data?: JikanAnime[] };
  return json.data ?? [];
}

// ─── Shikimori batch helper ───────────────────────────────────────────────────

interface ShikiBatchItem {
  russian: string;
  imageOriginal: string | null;
}

async function shikiRussianBatch(
  ids: number[],
): Promise<Map<number, ShikiBatchItem>> {
  await delay(250); // Shikimori: 5 req/sec
  const params = new URLSearchParams({
    ids: ids.join(','),
    limit: String(ids.length),
  });
  const res = await fetch(`${SHIKIMORI_BASE}/animes?${params}`, {
    headers: { 'User-Agent': SHIKIMORI_UA, Accept: 'application/json' },
    cache: 'no-store',
  });
  const map = new Map<number, ShikiBatchItem>();
  if (!res.ok) return map;
  const data = await res.json() as Array<{ id: number; russian: string; image: { original: string } }>;
  for (const a of data) {
    map.set(a.id, {
      russian: a.russian,
      imageOriginal: a.image?.original
        ? `https://shikimori.one${a.image.original}`
        : null,
    });
  }
  return map;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function jikanToRow(a: JikanAnime, shiki?: ShikiBatchItem) {
  const genres = a.genres
    .map(g => MAL_GENRE_RU[g.mal_id])
    .filter((g): g is string => Boolean(g));

  const airedOn = a.aired?.from ? a.aired.from.split('T')[0] : null;
  const year    = a.year ?? (airedOn ? Number(airedOn.split('-')[0]) : null);

  // Приоритет изображения: Jikan WebP large → Jikan JPG large → прочие варианты → Shikimori CDN
  const jikanImage =
    a.images.webp?.large_image_url ??
    a.images.jpg.large_image_url ??
    a.images.webp?.image_url ??
    a.images.jpg.image_url ??
    null;

  // Баннер для hero/страницы тайтла: приоритет на trailer thumbnail (чаще 16:9)
  const bannerImage =
    a.trailer?.images?.maximum_image_url ??
    a.trailer?.images?.large_image_url ??
    a.trailer?.images?.medium_image_url ??
    a.trailer?.images?.image_url ??
    null;

  return {
    id:          a.mal_id,
    name:        a.title,
    russian:     shiki?.russian ?? null,
    kind:        KIND_MAP[a.type]      ?? a.type?.toLowerCase() ?? 'tv',
    status:      STATUS_MAP[a.status]  ?? 'released',
    score:       a.score ?? null,
    episodes:    a.episodes ?? null,
    aired_on:    airedOn,
    image_url:   jikanImage ?? shiki?.imageOriginal ?? null,
    banner_url:  bannerImage ?? null,
    members:     a.members ?? null,
    description: null,                 // detail-запросы не делаем для скорости
    genres,
    studios:     a.studios.map(s => s.name),
    year,
    season_name: a.season ?? null,
    synced_at:   new Date().toISOString(),
  };
}

// ─── Общая логика синхронизации страниц ──────────────────────────────────────

async function syncPages(
  endpoint: string,
  pages: number,
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  for (let page = 1; page <= pages; page++) {
    try {
      const jikanData = await jikanPage(endpoint, page);
      if (!jikanData.length) break;

      // Batched Russian names from Shikimori
      const ids     = jikanData.map(a => a.mal_id);
      const ruNames = await shikiRussianBatch(ids).catch(() => new Map<number, ShikiBatchItem>());

      const rows = jikanData.map(a => jikanToRow(a, ruNames.get(a.mal_id)));

      let { error } = await supabase
        .from('anime')
        .upsert(rows, { onConflict: 'id' });

      // Обратная совместимость со схемой БД без banner_url:
      // сначала пробуем расширенный upsert, если столбца нет — повторяем без banner_url.
      if (error?.message?.includes('banner_url')) {
        const rowsWithoutBanner = rows.map((row) => (
          Object.fromEntries(
            Object.entries(row).filter(([key]) => key !== 'banner_url')
          )
        ));
        ({ error } = await supabase
          .from('anime')
          .upsert(rowsWithoutBanner, { onConflict: 'id' }));
      }

      if (error) {
        console.error('[sync] upsert error:', error.message);
        errors++;
      } else {
        synced += rows.length;
      }
    } catch (err) {
      console.error('[sync] page error:', err);
      errors++;
    }
  }

  return { synced, errors };
}

// ─── Публичные функции ────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  errors: number;
}

/**
 * Синхронизирует топ-N аниме по рейтингу MAL.
 * pages × 25 аниме за раз.
 */
export async function syncTopAnime(pages = 40): Promise<SyncResult> {
  return syncPages('/top/anime', pages);
}

/**
 * Синхронизирует текущий сезон (онгоинги).
 * Запускается чаще для актуальности данных.
 */
export async function syncCurrentSeason(pages = 8): Promise<SyncResult> {
  return syncPages('/seasons/now', pages);
}
