// Жанры аниме — текстовые значения совпадают с material_data.anime_genres из Kodik

export interface Genre {
  value: string;
  label: string;
  type: 'genre';
}

export const ANIME_GENRES: Genre[] = [
  { value: 'Экшен',            label: 'Экшен',            type: 'genre' },
  { value: 'Приключения',      label: 'Приключения',      type: 'genre' },
  { value: 'Комедия',          label: 'Комедия',          type: 'genre' },
  { value: 'Драма',            label: 'Драма',            type: 'genre' },
  { value: 'Фэнтези',          label: 'Фэнтези',          type: 'genre' },
  { value: 'Романтика',        label: 'Романтика',        type: 'genre' },
  { value: 'Повседневность',   label: 'Повседневность',   type: 'genre' },
  { value: 'Школа',            label: 'Школа',            type: 'genre' },
  { value: 'Фантастика',       label: 'Фантастика',       type: 'genre' },
  { value: 'Исторический',     label: 'Исторический',     type: 'genre' },
  { value: 'Ужасы',            label: 'Ужасы',            type: 'genre' },
  { value: 'Меха',             label: 'Меха',             type: 'genre' },
  { value: 'Музыка',           label: 'Музыка',           type: 'genre' },
  { value: 'Мистика',          label: 'Мистика',          type: 'genre' },
  { value: 'Психологическое',  label: 'Психологическое',  type: 'genre' },
  { value: 'Триллер',          label: 'Триллер',          type: 'genre' },
  { value: 'Спорт',            label: 'Спорт',            type: 'genre' },
  { value: 'Военное',          label: 'Военное',          type: 'genre' },
  { value: 'Сёнен',            label: 'Сёнен',            type: 'genre' },
  { value: 'Сёдзё',            label: 'Сёдзё',            type: 'genre' },
  { value: 'Сэйнэн',           label: 'Сэйнэн',           type: 'genre' },
  { value: 'Дзёсэй',           label: 'Дзёсэй',           type: 'genre' },
  { value: 'Боевые искусства', label: 'Боевые искусства', type: 'genre' },
  { value: 'Самурай',          label: 'Самурай',          type: 'genre' },
  { value: 'Магия',            label: 'Магия',            type: 'genre' },
  { value: 'Демоны',           label: 'Демоны',           type: 'genre' },
  { value: 'Вампиры',          label: 'Вампиры',          type: 'genre' },
  { value: 'Гарем',            label: 'Гарем',            type: 'genre' },
  { value: 'Игры',             label: 'Игры',             type: 'genre' },
];

export const KIND_OPTIONS = [
  { value: 'tv',      label: 'TV Сериал' },
  { value: 'movie',   label: 'Фильм'    },
  { value: 'ova',     label: 'OVA'      },
  { value: 'ona',     label: 'ONA'      },
  { value: 'special', label: 'Спецвыпуск' },
];
