// Жанры Shikimori. type='genre' — для совместимости с MultiSelect компонентом.

export interface Genre {
  value: string;
  label: string;
  type: 'genre' | 'tag';
}

export const SHIKIMORI_GENRES: Genre[] = [
  { value: '1',  label: 'Экшен',          type: 'genre' },
  { value: '2',  label: 'Приключения',     type: 'genre' },
  { value: '4',  label: 'Комедия',         type: 'genre' },
  { value: '8',  label: 'Драма',           type: 'genre' },
  { value: '10', label: 'Фэнтези',         type: 'genre' },
  { value: '13', label: 'Исторический',    type: 'genre' },
  { value: '14', label: 'Ужасы',           type: 'genre' },
  { value: '18', label: 'Меха',            type: 'genre' },
  { value: '19', label: 'Музыка',          type: 'genre' },
  { value: '22', label: 'Романтика',       type: 'genre' },
  { value: '23', label: 'Школа',           type: 'genre' },
  { value: '24', label: 'Фантастика',      type: 'genre' },
  { value: '25', label: 'Сэйнэн',         type: 'genre' },
  { value: '26', label: 'Сёдзё',          type: 'genre' },
  { value: '28', label: 'Сёнэн',          type: 'genre' },
  { value: '31', label: 'Спорт',           type: 'genre' },
  { value: '36', label: 'Повседневность',  type: 'genre' },
  { value: '37', label: 'Мистика',         type: 'genre' },
  { value: '38', label: 'Военное',         type: 'genre' },
  { value: '40', label: 'Психологическое', type: 'genre' },
  { value: '41', label: 'Триллер',         type: 'genre' },
];

export const KIND_OPTIONS = [
  { value: 'tv',      label: 'TV Сериал' },
  { value: 'movie',   label: 'Фильм' },
  { value: 'ova',     label: 'OVA' },
  { value: 'ona',     label: 'ONA' },
  { value: 'special', label: 'Спецвыпуск' },
];

export const SORT_OPTIONS = [
  { value: 'popularity', label: 'По популярности' },
  { value: 'ranked',     label: 'По рейтингу' },
  { value: 'aired_on',   label: 'По новизне' },
  { value: 'episodes',   label: 'По эпизодам' },
];
