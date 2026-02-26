// ─── Kodik API Types (Этап 2) ─────────────────────────────────────────────────
// Документация: https://kodikapi.com

export interface KodikSearchParams {
  token: string;
  shikimori_id?: number;
  title?: string;
  limit?: number;
  with_episodes?: boolean;
  with_material_data?: boolean;
}

export interface KodikTranslation {
  id: number;
  title: string;
  type: 'subtitles' | 'voice';
}

export interface KodikEpisode {
  link: string;
  screenshots: string[];
}

export interface KodikSeason {
  [episode: string]: KodikEpisode;
}

export interface KodikResult {
  id: string;
  type: string;
  link: string;
  title: string;
  title_orig: string;
  other_title: string;
  translation: KodikTranslation;
  year: number;
  shikimori_id: string | null;
  episodes_count: number;
  seasons: Record<string, KodikSeason> | null;
  screenshots: string[];
}

export interface KodikSearchResponse {
  time: string;
  total: number;
  prev_page: string | null;
  next_page: string | null;
  results: KodikResult[];
}
