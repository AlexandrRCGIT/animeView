import { supabase } from '@/lib/supabase';
import { getOrFetch } from '@/lib/cache';
import { getKodikByShikimoriId } from '@/lib/api/kodik/client';
import type { KodikMaterialData, KodikResult, KodikSeasons } from '@/lib/api/kodik/types';
import { createHash } from 'crypto';

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface DBAnime {
  shikimori_id:     number;
  kinopoisk_id:     string | null;
  imdb_id:          string | null;
  worldart_link:    string | null;

  title:            string;
  title_orig:       string | null;
  title_jp:         string | null;
  title_en:         string | null;

  type:             string | null;
  year:             number | null;
  anime_kind:       string | null;
  anime_status:     string | null;

  shikimori_rating: number | null;
  shikimori_votes:  number | null;
  kinopoisk_rating: number | null;
  kinopoisk_votes:  number | null;
  imdb_rating:      number | null;
  imdb_votes:       number | null;

  poster_url:       string | null;
  screenshots:      string[];

  last_season:      number | null;
  last_episode:     number | null;
  episodes_count:   number;
  episodes_info:    EpisodesInfo | null;
  related_ids:      number[] | null;
  related_data:     unknown[] | null;

  genres:           string[];
  studios:          string[];
  countries:        string[];
  description:      string | null;
  duration:         number | null;
  rating_mpaa:      string | null;
  minimal_age:      number | null;

  material_data:    KodikMaterialData | null;
  blocked_countries: string[];

  kodik_updated_at: string | null;
  synced_at:        string;

  /** { season: { episode: rutube_video_id } } */
  rutube_episodes:  Record<string, Record<string, string>> | null;

  site_rating:      number | null;
  site_rating_count: number | null;
}

export interface DBTranslation {
  id:               number;
  shikimori_id:     number;
  kodik_id:         string;
  translation_id:   number;
  translation_title: string;
  translation_type: 'voice' | 'subtitles';
  link:             string;
  quality:          string | null;
  last_season:      number | null;
  last_episode:     number | null;
  episodes_count:   number;
  seasons:          TranslationSeasons | null;
  kodik_updated_at: string | null;
}

/** { season: { ep: { title, screenshot, link? } } } */
export type EpisodesInfo = Record<
  string,
  Record<string, { title: string | null; screenshot: string | null; link?: string | null }>
>;

/** { season: { link, episodes: { ep: link } } } */
export type TranslationSeasons = Record<
  string,
  { link: string; episodes: Record<string, string> }
>;

const RUNTIME_CACHE_TTL_SECONDS = 6 * 3600;
const ANIME_DATA_CACHE_TTL_SECONDS = 24 * 3600;
const RU_PRIORITY = [704, 734, 610, 609, 2550, 611];

function toAbsoluteUrl(raw: string): string {
  return raw.startsWith('//') ? `https:${raw}` : raw;
}

function extractTranslationSeasons(
  seasons: KodikSeasons | null
): TranslationSeasons | null {
  if (!seasons) return null;

  const normalized: TranslationSeasons = {};
  for (const [seasonNum, seasonData] of Object.entries(seasons)) {
    normalized[seasonNum] = {
      link: toAbsoluteUrl(seasonData.link),
      episodes: Object.fromEntries(
        Object.entries(seasonData.episodes).map(([epNum, epData]) => [epNum, toAbsoluteUrl(epData.link)])
      ),
    };
  }

  return Object.keys(normalized).length ? normalized : null;
}

function mapRuntimeTranslation(item: KodikResult, shikimoriId: number): DBTranslation {
  return {
    id: item.translation.id,
    shikimori_id: shikimoriId,
    kodik_id: item.id,
    translation_id: item.translation.id,
    translation_title: item.translation.title,
    translation_type: item.translation.type,
    link: toAbsoluteUrl(item.link),
    quality: item.quality ?? null,
    last_season: item.last_season ?? null,
    last_episode: item.last_episode ?? null,
    episodes_count: item.episodes_count ?? 0,
    seasons: extractTranslationSeasons(item.seasons),
    kodik_updated_at: item.updated_at ?? null,
  };
}

// ─── AnimeShort — универсальный тип для карточек ──────────────────────────────

export interface AnimeShort {
  id:           number;
  title:        string;
  title_orig:   string | null;
  type:         string | null;
  year:         number | null;
  anime_kind:   string | null;
  anime_status: string | null;
  poster_url:   string | null;
  screenshot:   string | null;   // первый скриншот
  episodes_count: number;
  last_episode: number | null;
  shikimori_rating: number | null;
  genres:       string[];
  season_number?: number | null;
}

export function getPreferredAnimeTitle(a: Pick<DBAnime, 'title' | 'material_data'>): string {
  const alt = a.material_data?.anime_title?.trim();
  if (alt) return alt;
  return a.title;
}

export function dbToAnimeShort(a: DBAnime): AnimeShort {
  return {
    id:               a.shikimori_id,
    title:            getPreferredAnimeTitle(a),
    title_orig:       a.title_orig,
    type:             a.type,
    year:             a.year,
    anime_kind:       a.anime_kind,
    anime_status:     a.anime_status,
    poster_url:       a.poster_url,
    screenshot:       a.screenshots?.[0] ?? null,
    episodes_count:   a.episodes_count,
    last_episode:     a.last_episode,
    shikimori_rating: a.shikimori_rating,
    genres:           a.genres ?? [],
    season_number:    a.last_season && a.last_season > 0 ? a.last_season : null,
  };
}

// ─── Фильтры каталога ─────────────────────────────────────────────────────────

export interface CatalogFilters {
  q?:         string | null;
  genres?:    string[];
  kind?:      string[] | null;
  status?:    string | null;
  season?:    string | null;
  yearFrom?:  number | null;
  yearTo?:    number | null;
  order?:     string;
  page?:      number;
  limit?:     number;
}

export interface QueryResult {
  data: DBAnime[];
  total: number;
}

type SortOrder = 'popularity' | 'popularity_asc' | 'ranked' | 'year_desc' | 'year_asc' | 'updated' | 'episodes';

function normalizeSortOrder(order?: string): SortOrder {
  switch (order) {
    case 'ranked':
    case 'rating':
      return 'ranked';
    case 'popularity_asc':
      return 'popularity_asc';
    case 'year_desc':
    case 'year':        // обратная совместимость
      return 'year_desc';
    case 'year_asc':
      return 'year_asc';
    case 'updated':
    case 'aired_on':    // обратная совместимость
      return 'updated';
    case 'episodes':
      return 'episodes';
    case 'popularity':
    default:
      return 'popularity';
  }
}

function buildCatalogCacheKey(filters: CatalogFilters): string {
  const normalized = {
    q: filters.q?.trim().toLowerCase() ?? '',
    genres: [...(filters.genres ?? [])].map((g) => g.trim()).filter(Boolean).sort(),
    kind: [...(filters.kind ?? [])].map((k) => k.trim()).filter(Boolean).sort(),
    status: filters.status ?? null,
    season: filters.season ?? null,
    yearFrom: filters.yearFrom ?? null,
    yearTo: filters.yearTo ?? null,
    order: normalizeSortOrder(filters.order),
    page: filters.page ?? 1,
    limit: filters.limit ?? 24,
  };
  const hash = createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
  return `catalog:v2:${hash}`;
}

async function queryAnimeFromDBRaw(filters: CatalogFilters = {}): Promise<QueryResult> {
  const {
    q, genres, kind, status, season,
    yearFrom, yearTo,
    order = 'popularity',
    page = 1, limit = 24,
  } = filters;

  const sortOrder = normalizeSortOrder(order);

  // Нормализованный текстовый поиск через RPC
  // Убирает дефисы/пробелы с обеих сторон → "ванпис" найдёт "ван-пис"
  let matchingIds: number[] | undefined;
  if (q) {
    const { data: idRows } = await supabase
      .rpc('search_anime_normalized', { search_query: q, result_limit: 500 });
    const ids = (idRows ?? []).map((r: { shikimori_id: number }) => r.shikimori_id);
    if (ids.length === 0) return { data: [], total: 0 };
    matchingIds = ids;
  }

  let query = supabase.from('anime').select('*', { count: 'exact' });

  if (matchingIds !== undefined) {
    query = query.in('shikimori_id', matchingIds);
  }

  // Жанры (все должны присутствовать — AND)
  if (genres?.length) {
    query = query.contains('genres', genres);
  }

  // Тип аниме (tv/movie/ova...) — один или несколько
  if (kind?.length) {
    query = query.in('anime_kind', kind);
  }

  // Статус
  if (status) {
    query = query.eq('anime_status', status);
  }

  // Сезон
  if (season) {
    query = query.contains('material_data', { anime_season: season } as Record<string, string>);
  }

  // Диапазон лет
  if (yearFrom) query = query.gte('year', yearFrom);
  if (yearTo) query = query.lte('year', yearTo);

  // Сортировка
  switch (sortOrder) {
    case 'ranked':
      query = query.order('shikimori_rating', { ascending: false, nullsFirst: false });
      query = query.order('shikimori_votes', { ascending: false, nullsFirst: false });
      break;
    case 'popularity_asc':
      query = query.order('shikimori_votes', { ascending: true, nullsFirst: false });
      query = query.order('shikimori_rating', { ascending: true, nullsFirst: false });
      break;
    case 'year_desc':
      query = query.order('year', { ascending: false, nullsFirst: false });
      query = query.order('shikimori_votes', { ascending: false, nullsFirst: false });
      break;
    case 'year_asc':
      query = query.order('year', { ascending: true, nullsFirst: false });
      query = query.order('shikimori_votes', { ascending: false, nullsFirst: false });
      break;
    case 'updated':
      query = query.order('kodik_updated_at', { ascending: false, nullsFirst: false });
      query = query.order('year', { ascending: false, nullsFirst: false });
      break;
    case 'episodes':
      query = query.order('episodes_count', { ascending: false, nullsFirst: false });
      query = query.order('shikimori_rating', { ascending: false, nullsFirst: false });
      break;
    case 'popularity':
    default:
      query = query.order('shikimori_votes', { ascending: false, nullsFirst: false });
      query = query.order('shikimori_rating', { ascending: false, nullsFirst: false });
      break;
  }

  // Вторичная сортировка для стабильности
  query = query.order('shikimori_id', { ascending: false });

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as DBAnime[], total: count ?? 0 };
}

export async function queryAnimeFromDB(filters: CatalogFilters = {}): Promise<QueryResult> {
  const cacheKey = buildCatalogCacheKey(filters);
  return getOrFetch<QueryResult>(
    cacheKey,
    ANIME_DATA_CACHE_TTL_SECONDS,
    () => queryAnimeFromDBRaw(filters),
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────

/** Топ аниме по рейтингу Shikimori (для Hero) */
export async function getTrendingFromDB(limit = 5): Promise<DBAnime[]> {
  const { data } = await supabase
    .from('anime')
    .select('*')
    .not('poster_url', 'is', null)
    .not('shikimori_rating', 'is', null)
    .gte('shikimori_rating', 7)
    .order('shikimori_rating', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as DBAnime[];
}

/** Текущие онгоинги для плашки NewEpisodes */
export async function getOngoingsFromDB(limit = 8): Promise<DBAnime[]> {
  const { data } = await supabase
    .from('anime')
    .select('*')
    .eq('anime_status', 'ongoing')
    .not('poster_url', 'is', null)
    .order('kodik_updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as DBAnime[];
}

/** Новые поступления (недавно обновлённые) */
export async function getNewReleasesFromDB(limit = 12): Promise<DBAnime[]> {
  const { data } = await supabase
    .from('anime')
    .select('*')
    .not('poster_url', 'is', null)
    .order('kodik_updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as DBAnime[];
}

// ─── Деталь аниме ─────────────────────────────────────────────────────────────

export async function getAnimeByIdFromDB(id: number): Promise<DBAnime | null> {
  return getOrFetch<DBAnime | null>(
    `anime:by-id:v1:${id}`,
    ANIME_DATA_CACHE_TTL_SECONDS,
    async () => {
      const { data } = await supabase
        .from('anime')
        .select('*')
        .eq('shikimori_id', id)
        .maybeSingle();
      return data ? (data as DBAnime) : null;
    },
  );
}

/**
 * Получить аниме с переводами для страницы просмотра.
 * Переводы отсортированы: русская озвучка → оригинал → субтитры → остальное.
 */
async function getAnimeWithTranslationsRaw(
  shikimoriId: number
): Promise<{ anime: DBAnime; translations: DBTranslation[] } | null> {
  const [animeRes] = await Promise.all([
    supabase
      .from('anime')
      .select('*')
      .eq('shikimori_id', shikimoriId)
      .maybeSingle(),
    // TODO: раскомментировать если понадобится постоянное хранилище переводов
    // supabase
    //   .from('anime_translations')
    //   .select('*')
    //   .eq('shikimori_id', shikimoriId)
    //   .order('translation_type', { ascending: false })
    //   .order('translation_id', { ascending: true }),
  ]);

  if (!animeRes.data) return null;

  let translations: DBTranslation[] = [];

  // Если в БД нет озвучек или есть только субтитры — запрашиваем все переводы из Kodik
  // и сохраняем органически. Следующий запрос будет читать из anime_translations.
  const needsEnrich = !translations.length || !translations.some(t => t.translation_type === 'voice');
  if (needsEnrich) {
    try {
      const fetched = await getOrFetch<DBTranslation[]>(
        `kodik:translations:${shikimoriId}:v1`,
        RUNTIME_CACHE_TTL_SECONDS,
        async () => {
          const runtime = await getKodikByShikimoriId(shikimoriId);
          const items = Array.isArray(runtime.results) ? runtime.results : [];
          if (!items.length) return translations;
          return items.map(item => mapRuntimeTranslation(item, shikimoriId));
        },
      );
      if (fetched.length > 0) {
        translations = fetched;
        // TODO: раскомментировать если понадобится постоянное хранилище переводов
        // void supabase.from('anime_translations').upsert(
        //   fetched.map(t => ({
        //     shikimori_id:      t.shikimori_id,
        //     kodik_id:          t.kodik_id,
        //     translation_id:    t.translation_id,
        //     translation_title: t.translation_title,
        //     translation_type:  t.translation_type,
        //     link:              t.link,
        //     quality:           t.quality,
        //     last_season:       t.last_season,
        //     last_episode:      t.last_episode,
        //     episodes_count:    t.episodes_count,
        //     seasons:           t.seasons,
        //     kodik_updated_at:  t.kodik_updated_at,
        //   })),
        //   { onConflict: 'shikimori_id,translation_id' },
        // );
      }
    } catch {
      // оставляем что есть в translations
    }
  }

  // Сортируем: русская озвучка первой (приоритет по ID из наших знаний),
  // затем остальные voice, потом subtitles
  const sorted = translations.sort((a, b) => {
    const aRu = RU_PRIORITY.indexOf(a.translation_id);
    const bRu = RU_PRIORITY.indexOf(b.translation_id);
    if (aRu !== -1 && bRu !== -1) return aRu - bRu;
    if (aRu !== -1) return -1;
    if (bRu !== -1) return 1;
    if (a.translation_type !== b.translation_type) {
      return a.translation_type === 'voice' ? -1 : 1;
    }
    return a.translation_id - b.translation_id;
  });

  return { anime: animeRes.data as DBAnime, translations: sorted };
}

export async function getAnimeWithTranslations(
  shikimoriId: number
): Promise<{ anime: DBAnime; translations: DBTranslation[] } | null> {
  return getOrFetch<{ anime: DBAnime; translations: DBTranslation[] } | null>(
    `anime:with-translations:v2:${shikimoriId}`,
    ANIME_DATA_CACHE_TTL_SECONDS,
    () => getAnimeWithTranslationsRaw(shikimoriId),
  );
}

/** Аниме по массиву ID (для страницы избранного) */
export async function getAnimeByIds(ids: number[]): Promise<DBAnime[]> {
  if (!ids.length) return [];
  const { data } = await supabase
    .from('anime')
    .select('*')
    .in('shikimori_id', ids);
  return (data ?? []) as DBAnime[];
}

const TV_KINDS = ['tv', 'tv_13', 'tv_24', 'tv_48'];

export async function getSeasonIndexMapByTitles(titles: string[]): Promise<Map<number, number>> {
  const uniqueTitles = [...new Set(titles.map((t) => t.trim()).filter(Boolean))];
  if (!uniqueTitles.length) return new Map();

  const { data, error } = await supabase
    .from('anime')
    .select('shikimori_id, title, anime_kind, year')
    .in('title', uniqueTitles)
    .in('anime_kind', TV_KINDS)
    .order('title', { ascending: true })
    .order('year', { ascending: true, nullsFirst: false })
    .order('shikimori_id', { ascending: true });

  if (error || !data) return new Map();

  const byTitle = new Map<string, { shikimori_id: number; year: number | null }[]>();
  for (const row of data as { shikimori_id: number; title: string; year: number | null }[]) {
    if (!byTitle.has(row.title)) byTitle.set(row.title, []);
    byTitle.get(row.title)!.push({ shikimori_id: row.shikimori_id, year: row.year });
  }

  const seasonMap = new Map<number, number>();
  for (const rows of byTitle.values()) {
    if (rows.length < 2) continue;
    rows.forEach((row, index) => {
      seasonMap.set(row.shikimori_id, index + 1);
    });
  }

  return seasonMap;
}

export async function getRecentAnimeUpdates(limit = 30, offset = 0, since?: string): Promise<DBAnime[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);
  const base = supabase
    .from('anime')
    .select(
      'shikimori_id, title, title_orig, title_jp, title_en, type, year, anime_kind, anime_status, poster_url, screenshots, last_episode, last_season, episodes_count, episodes_info, genres, studios, countries, description, duration, rating_mpaa, minimal_age, material_data, blocked_countries, kodik_updated_at, synced_at, related_ids, related_data, rutube_episodes, site_rating, site_rating_count, shikimori_rating, shikimori_votes, kinopoisk_rating, kinopoisk_votes, imdb_rating, imdb_votes, kinopoisk_id, imdb_id, worldart_link',
    )
    .not('poster_url', 'is', null)
    .order('kodik_updated_at', { ascending: false });
  const filtered = since ? base.gte('kodik_updated_at', since) : base;
  const { data } = await filtered.range(safeOffset, safeOffset + safeLimit - 1);
  return (data ?? []) as DBAnime[];
}

export async function getRelatedAnimeById(
  shikimoriId: number,
  limit = 20
): Promise<DBAnime[]> {
  return getOrFetch<DBAnime[]>(
    `anime:related:v1:${shikimoriId}:limit:${limit}`,
    ANIME_DATA_CACHE_TTL_SECONDS,
    async () => {
      const { data: source, error } = await supabase
        .from('anime')
        .select('related_ids')
        .eq('shikimori_id', shikimoriId)
        .maybeSingle();
      if (error) return [];

      const relatedIds = ((source?.related_ids ?? []) as number[])
        .filter((id) => Number.isFinite(id) && id > 0 && id !== shikimoriId)
        .slice(0, limit);

      if (!relatedIds.length) return [];

      const { data } = await supabase
        .from('anime')
        .select('*')
        .in('shikimori_id', relatedIds);

      const map = new Map(((data ?? []) as DBAnime[]).map((a) => [a.shikimori_id, a]));
      return relatedIds.map((id) => map.get(id)).filter((row): row is DBAnime => Boolean(row));
    },
  );
}
