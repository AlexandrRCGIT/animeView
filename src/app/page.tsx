import type { Metadata } from 'next';
import { getOrFetch } from '@/lib/cache';
import { fetchHomeData } from '@/lib/api/home-data';
import { Hero } from '@/components/home/Hero';
import { ContinueWatching } from '@/components/home/ContinueWatching';
import { StatsBar } from '@/components/home/StatsBar';
import { HomeFooter } from '@/components/home/HomeFooter';
import { NavBar } from '@/components/home/NavBar';
import { proxifyImageUrl } from '@/lib/image-proxy';
// import { AdSlot } from '@/components/ads/AdSlot';

export const metadata: Metadata = {
  title: 'AnimeView (Аниме Вью / Anime View) — смотри аниме онлайн',
  description:
    'AnimeView (Аниме Вью, Anime View): тренды сезона, популярные тайтлы и онлайн-плеер.',
  keywords: [
    'animeview',
    'anime view',
    'аниме вью',
    'аниме вью смотреть',
    'смотреть аниме онлайн',
    'каталог аниме',
  ],
  other: {
    telderi: '14fc5e44b8f0ab6dc2d0921271f92882',
  },
};

export const revalidate = 600; // ISR 10 минут

function GrainOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        opacity: 0.025, pointerEvents: 'none', zIndex: 9999,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

export default async function HomePage() {
  // Данные для главной: кэш 4 часа, обновляется cron-задачей /api/refresh-cache
  const { heroAnimes } = await getOrFetch(
    'home:v1',
    4 * 3600,
    fetchHomeData,
  );

  // Preload первого фонового изображения Hero для улучшения LCP
  const firstHero = heroAnimes[0];
  const lcpImageUrl = firstHero
    ? proxifyImageUrl(firstHero.banner ?? firstHero.image)
    : null;

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      {lcpImageUrl && (
        <link rel="preload" as="image" href={lcpImageUrl} fetchPriority="high" />
      )}
      <GrainOverlay />
      <NavBar />
      <Hero animes={heroAnimes} />

      <div style={{ height: 60 }} />
      <ContinueWatching />

      {/* Рекламное место — лидерборд под «Продолжить просмотр» */}
      {/* <div style={{ maxWidth: 1400, margin: '32px auto 0', padding: '0 clamp(14px, 4vw, 40px)' }}>
        <AdSlot size="728×90" minHeight={90} />
      </div> */}

      <StatsBar />
      <HomeFooter />
    </div>
  );
}
