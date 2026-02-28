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
  description: string | null;
  genres: string[];
  studios: string[];
  year: number | null;
  season_name: string | null;
  synced_at: string;
  detail_data: AnimeDetail | null;
  detail_synced_at: string | null;
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
  return {
    id: a.id,
    name: a.name,
    russian: a.russian ?? '',
    // image.original хранит полный URL (Jikan CDN) — AnimeCard умеет с ним работать
    image: {
      original: a.image_url ?? '',
      preview:  a.image_url ?? '',
      x96:      a.image_url ?? '',
      x48:      a.image_url ?? '',
    },
    url: `/animes/${a.id}`,
    kind:           (a.kind   || 'tv')       as AnimeShort['kind'],
    score:          String(a.score ?? 0),
    status:         (a.status || 'released') as AnimeShort['status'],
    episodes:       a.episodes ?? 0,
    episodes_aired: 0,
    aired_on:       a.aired_on,
    released_on:    null,
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
        image_url:        detail.image?.original ?? null,
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
