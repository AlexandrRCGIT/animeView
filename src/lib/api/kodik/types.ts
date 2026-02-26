// ─── Kodik API Types ──────────────────────────────────────────────────────────
// Документация: https://kodikapi.com

export interface KodikTranslation {
  id: number;
  title: string;
  type: 'subtitles' | 'voice';
}

export interface KodikEpisode {
  link: string;       // iframe URL эпизода
  screenshots: string[];
}

export type KodikSeasonEpisodes = Record<string, KodikEpisode>;
export type KodikSeasons = Record<string, KodikSeasonEpisodes>;

export interface KodikResult {
  id: string;
  type: 'anime' | 'anime-serial';
  link: string;             // iframe URL (весь тайтл / первый эпизод)
  title: string;
  title_orig: string;
  other_title: string;
  translation: KodikTranslation;
  year: number;
  shikimori_id: string | null;
  kinopoisk_id: string | null;
  imdb_id: string | null;
  worldart_link: string | null;
  episodes_count: number;
  last_season: number | null;
  last_episode: number | null;
  seasons: KodikSeasons | null;
  screenshots: string[];
  quality: string;
  camrip: boolean;
  lgbt: boolean;
  blocked_countries: string[];
  blocked_seasons: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  material_data: KodikMaterialData | null;
}

export interface KodikMaterialData {
  title: string;
  title_en: string;
  anime_title: string | null;
  title_orig: string;
  other_title: string;
  anime_kind: string | null;
  all_status: string | null;
  anime_status: string | null;
  year: number;
  poster_url: string;
  screenshots: string[];
  anime_genres: string[];
  shikimori_rating: number;
  shikimori_votes: number;
  anime_description: string | null;
}

export interface KodikSearchResponse {
  time: string;
  total: number;
  prev_page: string | null;
  next_page: string | null;
  results: KodikResult[];
}

// ─── Агрегированные данные о тайтле ──────────────────────────────────────────

/**
 * Сгруппированные переводы одного тайтла.
 * Ключ — translation.id, значение — все результаты с этим переводом.
 */
export type TranslationGroup = {
  translation: KodikTranslation;
  result: KodikResult;
};
