import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Shikimori постеры (system + assets для заглушек)
      {
        protocol: 'https',
        hostname: 'shikimori.one',
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
