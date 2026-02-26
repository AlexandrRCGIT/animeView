import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${geist.variable} font-sans antialiased bg-zinc-950 text-zinc-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
