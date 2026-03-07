import type { MetadataRoute } from 'next';

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://anime-view.org').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/favorites', '/history', '/settings', '/auth/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
