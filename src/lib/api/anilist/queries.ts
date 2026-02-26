// ─── GraphQL-фрагменты ────────────────────────────────────────────────────────

// Поля для карточки в списке
const MEDIA_SHORT_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  coverImage {
    extraLarge
    large
    color
  }
  bannerImage
  format
  status
  episodes
  season
  seasonYear
  averageScore
  popularity
  isAdult
  genres
`;

// Дополнительные поля для страницы тайтла
const MEDIA_DETAIL_FIELDS = `
  ${MEDIA_SHORT_FIELDS}
  description(asHtml: false)
  duration
  synonyms
  tags {
    name
    rank
    isMediaSpoiler
  }
  studios {
    nodes {
      name
      isAnimationStudio
    }
  }
  nextAiringEpisode {
    airingAt
    episode
  }
  trailer {
    id
    site
  }
`;

// ─── Запросы ─────────────────────────────────────────────────────────────────

/**
 * Список трендовых аниме текущего сезона.
 */
export const TRENDING_ANIME_QUERY = `
  query TrendingAnime($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        currentPage
        hasNextPage
        perPage
        total
      }
      media(
        type: ANIME
        sort: [TRENDING_DESC]
        season: $season
        seasonYear: $seasonYear
        isAdult: false
      ) {
        ${MEDIA_SHORT_FIELDS}
      }
    }
  }
`;

/**
 * Популярное аниме за всё время.
 */
export const POPULAR_ANIME_QUERY = `
  query PopularAnime($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        currentPage
        hasNextPage
        perPage
        total
      }
      media(
        type: ANIME
        sort: [POPULARITY_DESC]
        isAdult: false
      ) {
        ${MEDIA_SHORT_FIELDS}
      }
    }
  }
`;

/**
 * Поиск по названию.
 */
export const SEARCH_ANIME_QUERY = `
  query SearchAnime($search: String!, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        currentPage
        hasNextPage
        perPage
        total
      }
      media(
        type: ANIME
        search: $search
        isAdult: false
        sort: [SEARCH_MATCH]
      ) {
        ${MEDIA_SHORT_FIELDS}
      }
    }
  }
`;

/**
 * Детальная информация по AniList ID.
 */
export const ANIME_DETAIL_QUERY = `
  query AnimeDetail($id: Int!) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_DETAIL_FIELDS}
    }
  }
`;
