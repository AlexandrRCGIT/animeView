// ─── AniList GraphQL Types ────────────────────────────────────────────────────

export interface AniListTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
  userPreferred: string | null;
}

export interface AniListCoverImage {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
  color: string | null;
}

export interface AniListTag {
  name: string;
  rank: number;
  isMediaSpoiler: boolean;
}

export interface AniListGenre {
  name: string;
}

export interface AniListStudio {
  name: string;
  isAnimationStudio: boolean;
}

export interface AniListStudiosEdge {
  nodes: AniListStudio[];
}

export interface AniListNextAiringEpisode {
  airingAt: number;
  episode: number;
}

export type MediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'CANCELLED'
  | 'HIATUS';

export type MediaFormat =
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC';

export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

// ─── Краткое описание (список/карточка) ───────────────────────────────────────

export interface AniListMediaShort {
  id: number;
  idMal: number | null; // MAL ID — ключ для связки с Kodik
  title: AniListTitle;
  coverImage: AniListCoverImage;
  bannerImage: string | null;
  format: MediaFormat | null;
  status: MediaStatus | null;
  episodes: number | null;
  duration: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  averageScore: number | null;
  popularity: number;
  isAdult: boolean;
  genres: string[];
  description: string | null;
}

// ─── Полное описание (страница тайтла) ────────────────────────────────────────

export interface AniListMediaDetail extends AniListMediaShort {
  description: string | null;
  tags: AniListTag[];
  studios: AniListStudiosEdge;
  nextAiringEpisode: AniListNextAiringEpisode | null;
  trailer: { id: string; site: string } | null;
  synonyms: string[];
}

// ─── Обёртки ответов GraphQL ─────────────────────────────────────────────────

export interface PageInfo {
  currentPage: number;
  hasNextPage: boolean;
  perPage: number;
  total: number;
}

export interface AniListPageResponse<T> {
  data: {
    Page: {
      pageInfo: PageInfo;
      media: T[];
    };
  };
}

export interface AniListMediaResponse<T> {
  data: {
    Media: T;
  };
}

// ─── Параметры запросов ───────────────────────────────────────────────────────

export type MediaSort =
  | 'TRENDING_DESC'
  | 'POPULARITY_DESC'
  | 'SCORE_DESC'
  | 'START_DATE_DESC'
  | 'UPDATED_AT_DESC';
