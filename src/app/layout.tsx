import type { Metadata } from 'next';
import { Geist, Unbounded, Noto_Sans_JP } from 'next/font/google';
import { cookies } from 'next/headers';
import { Providers } from '@/components/providers/Providers';
import './globals.css';
import 'shaka-player/dist/controls.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

const unbounded = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-jp',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | AnimeView',
    default: 'AnimeView — смотри аниме онлайн',
  },
  description:
    'Современный аниме-агрегатор. Онлайн просмотр аниме с актуальными описаниями, рейтингами и субтитрами.',
  openGraph: {
    siteName: 'AnimeView',
    locale: 'ru_RU',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const accent = (await cookies()).get('theme_accent')?.value ?? '#6C3CE1';

  return (
    <html lang="ru" className="dark">
      <body
        className={`${geist.variable} ${unbounded.variable} ${notoSansJP.variable} font-sans antialiased bg-[#08080E] text-zinc-100 min-h-screen`}
        style={{ '--accent': accent } as React.CSSProperties}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
