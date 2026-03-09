import type { Metadata } from 'next';
import { Geist, Unbounded, Noto_Sans_JP } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { Providers } from '@/components/providers/Providers';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { BottomNav } from '@/components/ui/BottomNav';
import { RuBanner } from '@/components/ui/RuBanner';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
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
  twitter: {
    card: 'summary_large_image',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
  const accent = cookieStore.get('theme_accent')?.value ?? '#6C3CE1';
  const country = headersList.get('cf-ipcountry') ?? headersList.get('x-vercel-ip-country') ?? null;
  const isRussia = country === 'RU';

  return (
    <html lang="ru" className="dark">
      <body
        className={`${geist.variable} ${unbounded.variable} ${notoSansJP.variable} font-sans antialiased bg-[#08080E] text-zinc-100 min-h-screen`}
        style={{ '--accent': accent } as React.CSSProperties}
      >
        <Providers>
          {children}
          <BottomNav />
          <RuBanner isRussia={isRussia} />
        </Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
