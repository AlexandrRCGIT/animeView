// ─── Базовые сущности Shikimori API ──────────────────────────────────────────

export interface ShikimoriImage {
  original: string;
  preview: string;
  x96: string;
  x48: string;
}

export interface ShikimoriGenre {
  id: number;
  name: string;
  russian: string;
  kind: string;
}

export interface ShikimoriStudio {
  id: number;
  name: string;
  filtered_name: string;
  real: boolean;
  image: string | null;
}

export interface ShikimoriScore {
  name: string;
  value: string;
}

// ─── Краткое описание аниме (список) ─────────────────────────────────────────

export interface AnimeShort {
  id: number;
  name: string;
  russian: string;
  image: ShikimoriImage;
  url: string;
  kind:
    | 'tv'
    | 'movie'
    | 'ova'
    | 'ona'
    | 'special'
    | 'music'
    | 'tv_13'
    | 'tv_24'
    | 'tv_48';
  score: string;
  status: 'anons' | 'ongoing' | 'released';
  episodes: number;
  episodes_aired: number;
  aired_on: string | null;
  released_on: string | null;
}

// ─── Полное описание аниме (страница тайтла) ─────────────────────────────────

export interface AnimeDetail extends AnimeShort {
  rating: string;
  english: string[];
  japanese: string[];
  synonyms: string[];
  license_name_ru: string | null;
  duration: number;
  description: string | null;
  description_html: string | null;
  description_source: string | null;
  franchise: string | null;
  favoured: boolean;
  anons: boolean;
  ongoing: boolean;
  thread_id: number;
  topic_id: number;
  myanimelist_id: number | null;
  rates_scores_stats: ShikimoriScore[];
  rates_statuses_stats: ShikimoriScore[];
  updated_at: string;
  next_episode_at: string | null;
  fansubbers: string[];
  fandubbers: string[];
  licensors: string[];
  genres: ShikimoriGenre[];
  studios: ShikimoriStudio[];
  videos: ShikimoriVideo[];
  screenshots: ShikimoriScreenshot[];
  user_rate: null;
}

export interface ShikimoriVideo {
  id: number;
  url: string;
  image_url: string;
  player_url: string;
  name: string;
  kind: string;
  hosting: string;
}

export interface ShikimoriScreenshot {
  original: string;
  preview: string;
}

// ─── Связанные аниме ─────────────────────────────────────────────────────────

export interface AnimeRelated {
  relation: string;
  relation_russian: string;
  anime: AnimeShort | null;
  manga: null;
}

// ─── Параметры запросов ───────────────────────────────────────────────────────

export interface AnimeListParams {
  page?: number;
  limit?: number;
  order?:
    | 'id'
    | 'id_desc'
    | 'ranked'
    | 'kind'
    | 'popularity'
    | 'name'
    | 'aired_on'
    | 'episodes'
    | 'status'
    | 'random'
    | 'ranked_random'
    | 'ranked_shiki'
    | 'created_at'
    | 'created_at_desc';
  kind?: string;
  status?: 'anons' | 'ongoing' | 'released';
  season?: string;
  score?: number;
  genre?: string;
  studio?: string;
  franchise?: string;
  censored?: boolean;
  mylist?: string;
  ids?: string;
  exclude_ids?: string;
  search?: string;
}
