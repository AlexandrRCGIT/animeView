import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { Geist, Unbounded, Noto_Sans_JP } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { Providers } from '@/components/providers/Providers';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { BottomNav } from '@/components/ui/BottomNav';
import { RuBanner } from '@/components/ui/RuBanner';
import { FeedbackButton } from '@/components/ui/FeedbackButton';
import { GlobalSchemaJsonLd } from '@/components/seo/GlobalSchemaJsonLd';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';
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
  applicationName: 'AnimeView',
  title: {
    template: '%s | AnimeView',
    default: 'AnimeView (Аниме Вью / Anime View) — смотри аниме онлайн',
  },
  description:
    'AnimeView (Аниме Вью, Anime View) — современный аниме-агрегатор: онлайн просмотр аниме с актуальными описаниями, рейтингами и субтитрами.',
  keywords: [
    'animeview',
    'anime view',
    'аниме вью',
    'аниме вью смотреть онлайн',
    'смотреть аниме онлайн',
    'каталог аниме',
  ],
  openGraph: {
    title: 'AnimeView (Аниме Вью / Anime View) — смотри аниме онлайн',
    description:
      'AnimeView (Аниме Вью, Anime View) — каталог аниме, эпизоды, избранное и история просмотра.',
    siteName: 'AnimeView',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon', sizes: '48x48' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/pwa-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/pwa-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
    ],
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
      <head>
        <Script id="gtm-init" strategy="beforeInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-W753J77N');`}</Script>
        <Script id="ya-rtb-init" strategy="beforeInteractive">{`window.yaContextCb=window.yaContextCb||[]`}</Script>
        <Script src="https://yandex.ru/ads/system/context.js" strategy="afterInteractive" />
        <Script id="ya-metrika-init" strategy="afterInteractive">{`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
          ym(108380633,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',accurateTrackBounce:true,trackLinks:true});
        `}</Script>
      </head>
      <body
        className={`${geist.variable} ${unbounded.variable} ${notoSansJP.variable} font-sans antialiased bg-[#08080E] text-zinc-100 min-h-screen`}
        style={{ '--accent': accent } as React.CSSProperties}
      >
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W753J77N" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} /></noscript>
        <GlobalSchemaJsonLd />
        <YandexMetrika />
        <Providers>
          {children}
          <footer className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 text-center text-[11px] leading-relaxed text-zinc-500 sm:px-8 sm:text-xs">
            Материал на сайте представлен исключительно для домашнего ознакомительного просмотра. Претензии
            правообладателей принимаются на e-mail:{' '}
            <a
              href="mailto:viewanime@yandex.ru"
              className="text-zinc-300 underline underline-offset-2 transition-colors hover:text-zinc-100"
            >
              viewanime@yandex.ru
            </a>
            .
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
              <Link href="/search" className="text-zinc-400 transition-colors hover:text-zinc-200">Каталог</Link>
              <Link href="/news" className="text-zinc-400 transition-colors hover:text-zinc-200">Новости</Link>
              <Link href="/favorites" className="text-zinc-400 transition-colors hover:text-zinc-200">Избранное</Link>
              <Link href="/info" className="text-zinc-400 transition-colors hover:text-zinc-200">О сайте</Link>
              <Link href="/contacts" className="text-zinc-400 transition-colors hover:text-zinc-200">Контакты</Link>
            </div>
          </footer>
          <BottomNav />
          <RuBanner isRussia={isRussia} />
          <FeedbackButton />
        </Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
