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
      // Discord аватары
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      // Google аватары
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
