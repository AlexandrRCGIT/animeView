import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Shikimori постеры
      {
        protocol: 'https',
        hostname: 'shikimori.one',
      },
      // MyAnimeList / Jikan CDN
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
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
