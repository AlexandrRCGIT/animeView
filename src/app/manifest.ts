import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
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
        src: '/icons/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/mobile-install.png',
        sizes: '750x1334',
        type: 'image/png',
      },
      {
        src: '/screenshots/desktop-install.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
      },
    ],
  };
}
