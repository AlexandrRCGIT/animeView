// ─── Kodik API Types ──────────────────────────────────────────────────────────
// Документация: https://kodik-api.com

export interface KodikTranslation {
  id: number;
  title: string;
  type: 'subtitles' | 'voice';
}

// with_episodes_data=true: каждый эпизод — объект с link, title, screenshots
export interface KodikEpisodeData {
  link: string;
  title: string | null;
  screenshots: string[];
}

// Сезон: ссылка на сезон + эпизоды
export interface KodikSeasonData {
  link: string;
  episodes: Record<string, KodikEpisodeData>;
}

// seasons: { "1": KodikSeasonData, "2": KodikSeasonData, ... }
export type KodikSeasons = Record<string, KodikSeasonData>;

export interface KodikMaterialData {
  // Названия
  title: string | null;
  anime_title: string | null;
  title_en: string | null;
  other_titles: string[] | null;
  other_titles_en: string[] | null;
  other_titles_jp: string[] | null;
  anime_license_name: string | null;
  anime_licensed_by: string[] | null;

  // Классификация
  anime_kind: string | null;         // tv, movie, ova, ona, special...
  all_status: string | null;         // ongoing, released, anons
  anime_status: string | null;
  year: number | null;

  // Описание
  tagline: string | null;
  description: string | null;
  anime_description: string | null;

  // Медиа
  poster_url: string | null;
  anime_poster_url: string | null;
  screenshots: string[] | null;

  // Жанры
  all_genres: string[] | null;
  genres: string[] | null;
  anime_genres: string[] | null;

  // Студии
  anime_studios: string[] | null;

  // Рейтинги
  kinopoisk_rating: number | null;
  kinopoisk_votes: number | null;
  imdb_rating: number | null;
  imdb_votes: number | null;
  shikimori_rating: number | null;
  shikimori_votes: number | null;

  // Даты
  premiered_ru: string | null;
  premiered_world: string | null;
  aired_at: string | null;
  released_at: string | null;
  next_episode_at: string | null;

  // Возраст
  rating_mpaa: string | null;
  minimal_age: number | null;

  // Эпизоды
  episodes_total: number | null;
  episodes_aired: number | null;

  // Персоны
  actors: string[] | null;
  directors: string[] | null;
  producers: string[] | null;
  duration: number | null;
  countries: string[] | null;
}

export interface KodikResult {
  id: string;                          // Kodik ID, напр. 'serial-37172'
  type: 'anime' | 'anime-serial';
  link: string;                        // iframe URL (весь тайтл)
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

export interface KodikSearchResponse {
  time: string;
  total: number;
  prev_page: string | null;
  next_page: string | null;
  results: KodikResult[];
}

// Alias for /list endpoint (same structure)
export type KodikListResponse = KodikSearchResponse;

// ─── Агрегированные данные о тайтле ──────────────────────────────────────────

export type TranslationGroup = {
  translation: KodikTranslation;
  result: KodikResult;
};
