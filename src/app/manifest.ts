import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AnimeView',
    short_name: 'AnimeView',
    description: 'Смотри аниме онлайн: каталог, серии, избранное и история просмотра.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#08080E',
    theme_color: '#6C3CE1',
    lang: 'ru',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  };
}
