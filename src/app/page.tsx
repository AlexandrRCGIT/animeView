import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  getTrendingAnime,
  getPopularAnime,
  getBrowseAnime,
} from '@/lib/api/shikimori';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Pagination } from '@/components/ui/Pagination';
import { FilterBar } from '@/components/ui/FilterBar';
import { Header } from '@/components/ui/Header';
import type { ViewMode } from '@/components/ui/FilterBar';
import { auth } from '@/auth';
import { getFavorites } from '@/app/actions/favorites';

export const metadata: Metadata = {
  title: 'AnimeView — смотри аниме онлайн',
  description: 'Тренды сезона, популярные тайтлы и онлайн-плеер на AnimeView.',
};

export const dynamic = 'force-dynamic';

const LIMIT = 24;

interface Props {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    genre?: string | string[];
    year?: string;
    season?: string;
    status?: string;
    view?: string;
  }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { page: pageParam, sort, genre, year, season, status, view } = await searchParams;

  const session = await auth();
  const favoriteIds = session ? await getFavorites().catch(() => []) : [];
  const favoritedIds = new Set(favoriteIds);
  const isLoggedIn = !!session;
  const page = Math.max(1, Number(pageParam) || 1);
  const viewMode = (view === 'list' ? 'list' : 'grid') as ViewMode;
  const yearNum = year ? Number(year) || null : null;
  const genres = genre ? (Array.isArray(genre) ? genre : [genre]) : [];
  const hasFilters = !!(sort || genres.length || yearNum || season || status);

  let media: Awaited<ReturnType<typeof getTrendingAnime>> = [];
  let totalPages = 1;
  let trendingMedia: typeof media = [];
  let popularMedia: typeof media = [];

  if (hasFilters) {
    // Фильтры активны — один общий каталог
    media = await getBrowseAnime({
      page,
      limit: LIMIT,
      genre: genres.length ? genres : null,
      order: sort || null,
      year: yearNum,
      season: season || null,
      status: (status as 'anons' | 'ongoing' | 'released') || null,
    }).catch(() => []);

    totalPages = media.length === LIMIT ? page + 1 : page;
  } else {
    // Без фильтров — две секции: тренды + популярное
    [trendingMedia, popularMedia] = await Promise.all([
      getTrendingAnime(page, LIMIT).catch(() => []),
      getPopularAnime(page, LIMIT).catch(() => []),
    ]);

    const hasNextTrending = trendingMedia.length === LIMIT;
    const hasNextPopular = popularMedia.length === LIMIT;
    totalPages = hasNextTrending || hasNextPopular ? page + 1 : page;
  }

  const hasData = hasFilters
    ? media.length > 0
    : trendingMedia.length > 0 || popularMedia.length > 0;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Hero — только на первой странице без фильтров */}
        {page === 1 && !hasFilters && (
          <section className="text-center py-10">
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
              Anime<span className="text-violet-500">View</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Смотри аниме онлайн — онгоинги текущего сезона и классика с русской озвучкой
            </p>
          </section>
        )}

        {/* Панель фильтров */}
        <Suspense>
          <FilterBar />
        </Suspense>

        {!hasData && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">Ничего не найдено.</p>
            <p className="text-sm mt-1 text-zinc-600">Попробуйте другой фильтр.</p>
          </div>
        )}

        {/* Контент */}
        {hasFilters ? (
          <AnimeGrid animes={media} view={viewMode} favoritedIds={favoritedIds} isLoggedIn={isLoggedIn} />
        ) : (
          <>
            <AnimeGrid animes={trendingMedia} title="Тренды сезона" view={viewMode} favoritedIds={favoritedIds} isLoggedIn={isLoggedIn} />
            <AnimeGrid animes={popularMedia} title="Популярное за всё время" view={viewMode} favoritedIds={favoritedIds} isLoggedIn={isLoggedIn} />
          </>
        )}

        <Pagination currentPage={page} totalPages={totalPages} baseUrl="/" />
      </main>
    </>
  );
}
