// Хардкод жанров AniList — список стабилен, запрос на старте не нужен.
// Значение (value) = то, что уходит в AniList API (genre_in).
// Метка (label) = то, что видит пользователь.

export interface Genre {
  value: string;
  label: string;
}

export const ANIME_GENRES: Genre[] = [
  { value: 'Action',        label: 'Экшн' },
  { value: 'Adventure',     label: 'Приключения' },
  { value: 'Comedy',        label: 'Комедия' },
  { value: 'Drama',         label: 'Драма' },
  { value: 'Fantasy',       label: 'Фэнтези' },
  { value: 'Romance',       label: 'Романтика' },
  { value: 'Sci-Fi',        label: 'Фантастика' },
  { value: 'Slice of Life', label: 'Повседневность' },
  { value: 'Supernatural',  label: 'Сверхъест.' },
  { value: 'Mystery',       label: 'Мистика' },
  { value: 'Psychological', label: 'Психология' },
  { value: 'Horror',        label: 'Ужасы' },
  { value: 'Thriller',      label: 'Триллер' },
  { value: 'Sports',        label: 'Спорт' },
  { value: 'Mecha',         label: 'Меха' },
  { value: 'Music',         label: 'Музыка' },
  { value: 'Mahou Shoujo',  label: 'Махо-сёдзё' },
  { value: 'Ecchi',         label: 'Этти' },
];

// Маппинг сортировок: URL-param → AniList MediaSort
export const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Рейтинг ↓', anilist: 'SCORE_DESC' },
  { value: 'score_asc',  label: 'Рейтинг ↑', anilist: 'SCORE' },
  { value: 'date_desc',  label: 'Новее',      anilist: 'START_DATE_DESC' },
  { value: 'date_asc',   label: 'Старее',     anilist: 'START_DATE' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export function sortToAniList(sort: string | null): string {
  return SORT_OPTIONS.find((o) => o.value === sort)?.anilist ?? 'TRENDING_DESC';
}
