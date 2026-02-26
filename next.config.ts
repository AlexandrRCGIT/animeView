import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // AniList CDN
      {
        protocol: 'https',
        hostname: '*.anilist.co',
      },
      // Shikimori (оставляем на случай интеграции)
      {
        protocol: 'https',
        hostname: 'shikimori.one',
        pathname: '/system/**',
      },
    ],
  },
};

export default nextConfig;
