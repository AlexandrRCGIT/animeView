import { supabase } from '@/lib/supabase';
import type { KodikMaterialData } from '@/lib/api/kodik/types';

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

/** { season: { ep: { title, screenshot } } } */
export type EpisodesInfo = Record<
  string,
  Record<string, { title: string | null; screenshot: string | null }>
>;

/** { season: { link, episodes: { ep: link } } } */
export type TranslationSeasons = Record<
  string,
  { link: string; episodes: Record<string, string> }
>;

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
}

export function dbToAnimeShort(a: DBAnime): AnimeShort {
  return {
    id:               a.shikimori_id,
    title:            a.title,
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

export async function queryAnimeFromDB(filters: CatalogFilters = {}): Promise<QueryResult> {
  const {
    q, genres, kind, status, season,
    yearFrom, yearTo,
    order = 'rating',
    page = 1, limit = 24,
  } = filters;

  let query = supabase.from('anime').select('*', { count: 'exact' });

  // Текстовый поиск по русскому и оригинальному названию
  if (q) {
    query = query.or(`title.ilike.%${q}%,title_orig.ilike.%${q}%,title_en.ilike.%${q}%`);
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

  // Сезон (winter/spring/summer/fall — хранится в material_data, фильтруем по нему)
  if (season) {
    query = query.contains('material_data', { anime_season: season } as Record<string, string>);
  }

  // Диапазон лет
  if (yearFrom) query = query.gte('year', yearFrom);
  if (yearTo)   query = query.lte('year', yearTo);

  // Сортировка
  switch (order) {
    case 'rating':
      query = query.order('shikimori_rating', { ascending: false, nullsFirst: false });
      break;
    case 'updated':
      query = query.order('kodik_updated_at', { ascending: false, nullsFirst: false });
      break;
    case 'year':
      query = query.order('year', { ascending: false, nullsFirst: false });
      break;
    case 'episodes':
      query = query.order('episodes_count', { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order('shikimori_rating', { ascending: false, nullsFirst: false });
  }

  // Вторичная сортировка для стабильности
  query = query.order('shikimori_id', { ascending: false });

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as DBAnime[], total: count ?? 0 };
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
  const { data } = await supabase
    .from('anime')
    .select('*')
    .eq('shikimori_id', id)
    .maybeSingle();
  return data ? (data as DBAnime) : null;
}

/**
 * Получить аниме с переводами для страницы просмотра.
 * Переводы отсортированы: русская озвучка → оригинал → субтитры → остальное.
 */
export async function getAnimeWithTranslations(
  shikimoriId: number
): Promise<{ anime: DBAnime; translations: DBTranslation[] } | null> {
  const [animeRes, translationsRes] = await Promise.all([
    supabase
      .from('anime')
      .select('*')
      .eq('shikimori_id', shikimoriId)
      .maybeSingle(),
    supabase
      .from('anime_translations')
      .select('*')
      .eq('shikimori_id', shikimoriId)
      .order('translation_type', { ascending: false }) // voice > subtitles
      .order('translation_id', { ascending: true }),
  ]);

  if (!animeRes.data) return null;

  const translations = (translationsRes.data ?? []) as DBTranslation[];

  // Сортируем: русская озвучка первой (приоритет по ID из наших знаний),
  // затем остальные voice, потом subtitles
  const RU_PRIORITY = [704, 734, 610, 609, 2550, 611]; // известные рус. дубляжи
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

/** Аниме по массиву ID (для страницы избранного) */
export async function getAnimeByIds(ids: number[]): Promise<DBAnime[]> {
  if (!ids.length) return [];
  const { data } = await supabase
    .from('anime')
    .select('*')
    .in('shikimori_id', ids);
  return (data ?? []) as DBAnime[];
}
