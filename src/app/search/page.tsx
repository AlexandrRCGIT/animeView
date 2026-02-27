import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getBrowseAnime } from '@/lib/api/shikimori';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Pagination } from '@/components/ui/Pagination';
import { FilterBar } from '@/components/ui/FilterBar';
import { Header } from '@/components/ui/Header';
import type { ViewMode } from '@/components/ui/FilterBar';
import { auth } from '@/auth';
import { getFavorites } from '@/app/actions/favorites';

const LIMIT = 24;

interface Props {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    genre?: string | string[];
    year?: string;
    season?: string;
    status?: string;
    view?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q) return { title: 'Поиск — AnimeView' };
  return {
    title: `«${q}» — поиск на AnimeView`,
    description: `Результаты поиска аниме по запросу «${q}» на AnimeView.`,
  };
}

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: Props) {
  const { q, page: pageParam, sort, genre, year, season, status, view } = await searchParams;

  if (!q?.trim()) redirect('/');

  const page = Math.max(1, Number(pageParam) || 1);
  const viewMode = (view === 'list' ? 'list' : 'grid') as ViewMode;
  const yearNum = year ? Number(year) || null : null;
  const genres = genre ? (Array.isArray(genre) ? genre : [genre]) : [];

  const session = await auth();
  const favoriteIds = session ? await getFavorites().catch(() => []) : [];
  const favoritedIds = new Set(favoriteIds);
  const isLoggedIn = !!session;

  const media = await getBrowseAnime({
    page,
    limit: LIMIT,
    search: q.trim(),
    genre: genres.length ? genres : null,
    order: sort || null,
    year: yearNum,
    season: season || null,
    status: (status as 'anons' | 'ongoing' | 'released') || null,
  }).catch(() => []);

  const totalPages = media.length === LIMIT ? page + 1 : page;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Поиск: <span className="text-violet-400">«{q}»</span>
          </h1>
        </div>

        <Suspense>
          <FilterBar />
        </Suspense>

        {media.length > 0 ? (
          <>
            <AnimeGrid animes={media} view={viewMode} favoritedIds={favoritedIds} isLoggedIn={isLoggedIn} />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              baseUrl="/search"
              extraParams={{ q }}
            />
          </>
        ) : (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <p className="text-5xl">🔍</p>
            <p className="text-zinc-400 text-lg">По запросу «{q}» ничего не найдено</p>
            <p className="text-zinc-600 text-sm">
              Попробуйте другое название или измените фильтры
            </p>
          </div>
        )}
      </main>
    </>
  );
}
