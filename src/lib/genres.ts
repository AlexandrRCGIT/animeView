// Жанры аниме — текстовые значения совпадают с material_data.anime_genres из Kodik

export interface Genre {
  value: string;
  label: string;
  type: 'genre';
}

export const ANIME_GENRES: Genre[] = [
  { value: 'экшен',            label: 'Экшен',            type: 'genre' },
  { value: 'приключения',      label: 'Приключения',      type: 'genre' },
  { value: 'комедия',          label: 'Комедия',          type: 'genre' },
  { value: 'драма',            label: 'Драма',            type: 'genre' },
  { value: 'фэнтези',          label: 'Фэнтези',          type: 'genre' },
  { value: 'романтика',        label: 'Романтика',        type: 'genre' },
  { value: 'повседневность',   label: 'Повседневность',   type: 'genre' },
  { value: 'школа',            label: 'Школа',            type: 'genre' },
  { value: 'фантастика',       label: 'Фантастика',       type: 'genre' },
  { value: 'исторический',     label: 'Исторический',     type: 'genre' },
  { value: 'ужасы',            label: 'Ужасы',            type: 'genre' },
  { value: 'меха',             label: 'Меха',             type: 'genre' },
  { value: 'музыка',           label: 'Музыка',           type: 'genre' },
  { value: 'мистика',          label: 'Мистика',          type: 'genre' },
  { value: 'психологическое',  label: 'Психологическое',  type: 'genre' },
  { value: 'триллер',          label: 'Триллер',          type: 'genre' },
  { value: 'спорт',            label: 'Спорт',            type: 'genre' },
  { value: 'военное',          label: 'Военное',          type: 'genre' },
  { value: 'сёнэн',            label: 'Сёнэн',            type: 'genre' },
  { value: 'сёдзё',            label: 'Сёдзё',            type: 'genre' },
  { value: 'сэйнэн',          label: 'Сэйнэн',           type: 'genre' },
  { value: 'дзёсэй',          label: 'Дзёсэй',           type: 'genre' },
  { value: 'боевые искусства', label: 'Боевые искусства', type: 'genre' },
  { value: 'самурай',          label: 'Самурай',          type: 'genre' },
  { value: 'магия',            label: 'Магия',            type: 'genre' },
  { value: 'демоны',           label: 'Демоны',           type: 'genre' },
  { value: 'вампиры',          label: 'Вампиры',          type: 'genre' },
  { value: 'гарем',            label: 'Гарем',            type: 'genre' },
  { value: 'игры',             label: 'Игры',             type: 'genre' },
];

export const KIND_OPTIONS = [
  { value: 'tv',      label: 'TV Сериал' },
  { value: 'movie',   label: 'Фильм'    },
  { value: 'ova',     label: 'OVA'      },
  { value: 'ona',     label: 'ONA'      },
  { value: 'special', label: 'Спецвыпуск' },
];
