import { supabase } from '@/lib/supabase';
import type { AnimeShort, AnimeDetail } from '@/lib/api/shikimori';

// ─── Тип строки в таблице anime ───────────────────────────────────────────────

export interface DBAnime {
  id: number;
  name: string;
  russian: string | null;
  kind: string;
  status: string;
  score: number | null;
  episodes: number | null;
  members: number | null;
  aired_on: string | null;
  image_url: string | null;
  banner_url: string | null;
  description: string | null;
  genres: string[];
  studios: string[];
  year: number | null;
  season_name: string | null;
  synced_at: string;
  detail_data: AnimeDetail | null;
  detail_synced_at: string | null;
  related_data: AnimeShort[] | null;
  related_synced_at: string | null;
  anilibria_id: number | null;
  count_planned:   number;
  count_watching:  number;
  count_completed: number;
  count_on_hold:   number;
  count_dropped:   number;
}

// ─── Фильтры каталога ─────────────────────────────────────────────────────────

export interface CatalogFilters {
  q?: string | null;
  genres?: string[];
  kinds?: string[];
  status?: string | null;
  season?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  order?: string;
  page?: number;
  limit?: number;
}

// ─── Запрос каталога ──────────────────────────────────────────────────────────

export interface QueryResult {
  data: DBAnime[];
  total: number;
}

export async function queryAnimeFromDB(filters: CatalogFilters = {}): Promise<QueryResult> {
  const {
    q, genres, kinds, status, season,
    yearFrom, yearTo, order = 'score',
    page = 1, limit = 24,
  } = filters;

  let query = supabase.from('anime').select('*', { count: 'exact' });

  // Текстовый поиск по русскому и romaji названию
  if (q) {
    query = query.or(`russian.ilike.%${q}%,name.ilike.%${q}%`);
  }
  // Жанры — все выбранные должны присутствовать (AND)
  if (genres?.length) {
    query = query.contains('genres', genres);
  }
  // Тип (tv/movie/ova...)
  if (kinds?.length) {
    query = query.in('kind', kinds);
  }
  // Статус
  if (status) {
    query = query.eq('status', status);
  }
  // Сезон года (winter/spring/summer/fall)
  if (season) {
    query = query.eq('season_name', season);
  }
  // Диапазон лет — нативный range в Supabase
  if (yearFrom) {
    query = query.gte('year', yearFrom);
  }
  if (yearTo) {
    query = query.lte('year', yearTo);
  }

  // Сортировка
  if (order === 'popularity') {
    // По кол-ву добавлений в список MAL (чем больше — тем популярнее)
    query = query.order('members', { ascending: false, nullsFirst: false });
  } else if (order === 'aired_on') {
    query = query.order('aired_on', { ascending: false, nullsFirst: false });
  } else if (order === 'episodes') {
    query = query.order('episodes', { ascending: false, nullsFirst: false });
  } else {
    // ranked → по оценке
    query = query.order('score', { ascending: false, nullsFirst: false });
  }
  // Вторичная сортировка для стабильности
  query = query.order('id', { ascending: false });

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as DBAnime[], total: count ?? 0 };
}

// ─── Трендовые / онгоинги для главной ────────────────────────────────────────

export async function getTrendingFromDB(limit = 5): Promise<DBAnime[]> {
  const { data } = await supabase
    .from('anime')
    .select('*')
    .eq('status', 'ongoing')
    .not('image_url', 'is', null)
    .order('score', { ascending: false })
    .limit(limit);
  return (data ?? []) as DBAnime[];
}

export async function getOngoingsFromDB(limit = 6): Promise<DBAnime[]> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const seasonName =
    month <= 3 ? 'winter' : month <= 6 ? 'spring' : month <= 9 ? 'summer' : 'fall';

  const { data } = await supabase
    .from('anime')
    .select('*')
    .eq('status', 'ongoing')
    .eq('season_name', seasonName)
    .eq('year', year)
    .not('image_url', 'is', null)
    .order('score', { ascending: false })
    .limit(limit);

  // Если за текущий сезон недостаточно — берём просто онгоинги
  if ((data ?? []).length < 3) {
    const { data: fallback } = await supabase
      .from('anime')
      .select('*')
      .eq('status', 'ongoing')
      .not('image_url', 'is', null)
      .order('score', { ascending: false })
      .limit(limit);
    return (fallback ?? []) as DBAnime[];
  }

  return (data ?? []) as DBAnime[];
}

// ─── Адаптер DBAnime → AnimeShort (для AnimeCard/AnimeGrid) ──────────────────

export function dbToAnimeShort(a: DBAnime): AnimeShort {
  // Приоритет: image_url из БД (Jikan CDN полный URL) → detail_data.image.original (Shikimori путь)
  const imageOriginal = a.image_url || a.detail_data?.image?.original || '';
  const list_count =
    (a.count_planned   ?? 0) +
    (a.count_watching  ?? 0) +
    (a.count_completed ?? 0) +
    (a.count_on_hold   ?? 0) +
    (a.count_dropped   ?? 0);
  return {
    id: a.id,
    name: a.name,
    russian: a.russian ?? '',
    image: {
      original: imageOriginal,
      preview:  imageOriginal,
      x96:      imageOriginal,
      x48:      imageOriginal,
    },
    url: `/animes/${a.id}`,
    kind:           (a.kind   || 'tv')       as AnimeShort['kind'],
    score:          String(a.score ?? 0),
    status:         (a.status || 'released') as AnimeShort['status'],
    episodes:       a.episodes ?? 0,
    episodes_aired: 0,
    aired_on:       a.aired_on,
    released_on:    null,
    list_count:     list_count > 0 ? list_count : undefined,
  };
}

// ─── Получение аниме по массиву ID (для страницы избранного) ─────────────────

export async function getAnimeByIds(ids: number[]): Promise<DBAnime[]> {
  if (!ids.length) return [];
  const { data } = await supabase.from('anime').select('*').in('id', ids);
  return (data ?? []) as DBAnime[];
}

// ─── Кеш деталей аниме (lazy, TTL по статусу) ────────────────────────────────

/** TTL в миллисекундах для кеша деталей по статусу */
const DETAIL_TTL: Record<string, number> = {
  released: Infinity,          // завершённые — вечно
  ongoing:  6  * 3600 * 1000, // онгоинги — 6 часов
  anons:    24 * 3600 * 1000, // анонсы — 24 часа
};

function isDetailStale(status: string, detailSyncedAt: string | null): boolean {
  if (!detailSyncedAt) return true;
  const ttl = DETAIL_TTL[status] ?? DETAIL_TTL.released;
  if (ttl === Infinity) return false;
  return Date.now() - new Date(detailSyncedAt).getTime() > ttl;
}

/**
 * Получить закешированные детали аниме из БД.
 * Возвращает null если данных нет или они устарели.
 */
export async function getAnimeDetailFromDB(id: number): Promise<AnimeDetail | null> {
  const { data } = await supabase
    .from('anime')
    .select('status, detail_data, detail_synced_at')
    .eq('id', id)
    .single();

  if (!data?.detail_data) return null;
  if (isDetailStale(data.status, data.detail_synced_at)) return null;
  return data.detail_data as AnimeDetail;
}

// ─── Кеш связанных аниме (franchise) ─────────────────────────────────────────

const RELATED_TTL = 7 * 24 * 3600 * 1000; // 7 дней

/**
 * Получить закешированные связанные аниме из БД.
 * Возвращает null если данных нет или они старше 7 дней.
 */
export async function getRelatedFromDB(id: number): Promise<AnimeShort[] | null> {
  const { data } = await supabase
    .from('anime')
    .select('related_data, related_synced_at')
    .eq('id', id)
    .maybeSingle();

  if (!data?.related_data?.length) return null;
  const syncedAt = data.related_synced_at ? new Date(data.related_synced_at).getTime() : 0;
  if (Date.now() - syncedAt > RELATED_TTL) return null;
  return data.related_data as AnimeShort[];
}

/**
 * Сохранить связанные аниме в БД.
 */
export async function saveRelatedToDB(id: number, related: AnimeShort[]): Promise<void> {
  const { error } = await supabase
    .from('anime')
    .update({ related_data: related, related_synced_at: new Date().toISOString() })
    .eq('id', id);

  if (error) console.error('[saveRelated] error:', error.message);
}

/**
 * Сохранить Anilibria ID в БД (разово, через MALibria маппинг).
 */
export async function saveAnilibriaIdToDB(id: number, anilibriaId: number): Promise<void> {
  const { error } = await supabase
    .from('anime')
    .update({ anilibria_id: anilibriaId })
    .eq('id', id);
  if (error) console.error('[saveAnilibriaId] error:', error.message);
}

/**
 * Получить закешированный Anilibria ID из БД.
 */
export async function getAnilibriaIdFromDB(id: number): Promise<number | null> {
  const { data } = await supabase
    .from('anime')
    .select('anilibria_id')
    .eq('id', id)
    .maybeSingle();
  return data?.anilibria_id ?? null;
}

/**
 * Найти уже известный Anilibria ID среди аниме одной франшизы в локальной БД.
 * Берём самый ранний по aired_on (обычно S1), чтобы стабильно матчить монолитные релизы.
 */
export async function getFranchiseAnilibriaIdFromDB(ids: number[]): Promise<number | null> {
  if (!ids.length) return null;

  const { data } = await supabase
    .from('anime')
    .select('anilibria_id, aired_on')
    .in('id', ids)
    .not('anilibria_id', 'is', null)
    .order('aired_on', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return data?.anilibria_id ?? null;
}

export interface AnimeCounts {
  count_planned:   number;
  count_watching:  number;
  count_completed: number;
  count_on_hold:   number;
  count_dropped:   number;
}

/**
 * Получить счётчики списков для страницы тайтла.
 */
export async function getAnimeCountsFromDB(id: number): Promise<AnimeCounts | null> {
  const { data } = await supabase
    .from('anime')
    .select('count_planned, count_watching, count_completed, count_on_hold, count_dropped')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return {
    count_planned:   data.count_planned   ?? 0,
    count_watching:  data.count_watching  ?? 0,
    count_completed: data.count_completed ?? 0,
    count_on_hold:   data.count_on_hold   ?? 0,
    count_dropped:   data.count_dropped   ?? 0,
  };
}

/**
 * Быстро получить медиа-поля из БД (постер/баннер) для страницы тайтла.
 */
export async function getAnimeMediaFromDB(id: number): Promise<{ image_url: string | null; banner_url: string | null } | null> {
  const { data } = await supabase
    .from('anime')
    .select('image_url, banner_url')
    .eq('id', id)
    .maybeSingle();

  return data ? { image_url: data.image_url ?? null, banner_url: data.banner_url ?? null } : null;
}

/**
 * Сохранить детали аниме в БД (вызывается после получения от Shikimori).
 */
export async function saveAnimeDetailToDB(id: number, detail: AnimeDetail): Promise<void> {
  const now = new Date().toISOString();

  // Сначала пробуем обновить существующую строку
  const { data: updated, error: updErr } = await supabase
    .from('anime')
    .update({
      description:      detail.description ?? null,
      detail_data:      detail,
      detail_synced_at: now,
      // Обновляем живые поля которые могут меняться у онгоингов
      episodes:         detail.episodes      ?? null,
      score:            detail.score ? parseFloat(detail.score) : null,
      status:           detail.status,
    })
    .eq('id', id)
    .select('id');

  if (updErr) {
    console.error('[saveAnimeDetail] update error:', updErr.message);
    return;
  }

  // Если строки не было (аниме не в нашем sync — редкий тайтл) — вставляем минимально
  if (!updated || updated.length === 0) {
    const { error: insErr } = await supabase
      .from('anime')
      .insert({
        id,
        name:             detail.name,
        russian:          detail.russian,
        kind:             detail.kind,
        status:           detail.status,
        score:            detail.score ? parseFloat(detail.score) : null,
        episodes:         detail.episodes ?? null,
        aired_on:         detail.aired_on  ?? null,
        image_url:        detail.image?.original ? `https://shikimori.one${detail.image.original}` : null,
        banner_url:       null,
        description:      detail.description    ?? null,
        genres:           detail.genres?.map(g => g.russian) ?? [],
        studios:          detail.studios?.map(s => s.name)   ?? [],
        year:             detail.aired_on ? Number(detail.aired_on.split('-')[0]) : null,
        season_name:      null,
        synced_at:        now,
        detail_data:      detail,
        detail_synced_at: now,
      });
    if (insErr) console.error('[saveAnimeDetail] insert error:', insErr.message);
  }
}
