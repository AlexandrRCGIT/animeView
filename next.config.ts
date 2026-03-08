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
      {
        protocol: 'https',
        hostname: 'myanimelist.net',
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

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Limit referrer data sent to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable potentially dangerous browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Force HTTPS for 1 year (enable once you confirm HTTPS-only deployment)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
