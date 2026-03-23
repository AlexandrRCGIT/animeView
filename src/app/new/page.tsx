import type { Metadata } from 'next';
import { NavBar } from '@/components/home/NavBar';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { getRecentAnimeUpdates, dbToAnimeShort } from '@/lib/db/anime';
import { NewFeedClient } from './NewFeedClient';

export const metadata: Metadata = {
  title: 'Новинки аниме',
  description: 'Лента последних обновлений аниме — новые тайтлы и новые серии, отсортированные по дате обновления.',
  alternates: { canonical: '/new' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Новинки аниме — AnimeView',
    description: 'Лента последних обновлений аниме — новые тайтлы и новые серии.',
    url: '/new',
    type: 'website',
  },
};

export const revalidate = 300;

export default async function NewPage() {
  const rows = await getRecentAnimeUpdates(30, 0);

  const initialItems = rows.map((row) => ({
    ...dbToAnimeShort(row),
    kodik_updated_at: row.kodik_updated_at,
  }));

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Новинки', url: '/new' },
        ]}
      />
      <NavBar />

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(24px, 5vw, 34px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-unbounded), sans-serif',
            }}
          >
            Новинки
          </h1>
          <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Новые тайтлы и обновлённые серии, отсортированные по дате обновления.
          </p>
        </div>

        {initialItems.length === 0 ? (
          <div
            style={{
              borderRadius: 14,
              border: '1px dashed rgba(255,255,255,0.14)',
              padding: '22px 18px',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 14,
            }}
          >
            Пусто
          </div>
        ) : (
          <NewFeedClient initialItems={initialItems} />
        )}
      </main>
    </div>
  );
}
