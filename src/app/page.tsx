import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  getTrendingAnime,
  getPopularAnime,
  getBrowseAnime,
  sortToAniList,
} from '@/lib/api/anilist';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Pagination } from '@/components/ui/Pagination';
import { FilterBar } from '@/components/ui/FilterBar';
import { Header } from '@/components/ui/Header';
import type { ViewMode } from '@/components/ui/FilterBar';

export const metadata: Metadata = {
  title: 'AnimeView — смотри аниме онлайн',
  description: 'Тренды сезона, популярные тайтлы и онлайн-плеер на AnimeView.',
};

export const revalidate = 600;

interface Props {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    genre?: string | string[];
    year?: string;
    season?: string;
    tag?: string;
    status?: string;
    view?: string;
  }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { page: pageParam, sort, genre, year, season, tag, status, view } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const viewMode = (view === 'list' ? 'list' : 'grid') as ViewMode;
  const yearNum = year ? Number(year) || null : null;
  const genres = genre ? (Array.isArray(genre) ? genre : [genre]) : [];
  const hasFilters = !!(sort || genres.length || yearNum || season || tag || status);

  let media: Awaited<ReturnType<typeof getTrendingAnime>>['media'] = [];
  let totalPages = 1;
  let trendingMedia: typeof media = [];
  let popularMedia: typeof media = [];
  let trendingTotalPages = 1;
  let popularTotalPages = 1;

  if (hasFilters) {
    // Фильтры активны — один общий каталог
    const result = await getBrowseAnime({
      page,
      perPage: 24,
      genre: genres.length ? genres : null,
      sort: sortToAniList(sort ?? null),
      year: yearNum,
      season: season || null,
      tag: tag || null,
      status: status || null,
    }).catch(() => null);

    media = result?.media ?? [];
    totalPages = Math.ceil((result?.pageInfo.total ?? 0) / 24);
  } else {
    // Без фильтров — две секции: тренды + популярное
    const [trendingResult, popularResult] = await Promise.all([
      getTrendingAnime(page, 24).catch(() => null),
      getPopularAnime(page, 24).catch(() => null),
    ]);
    trendingMedia = trendingResult?.media ?? [];
    popularMedia = popularResult?.media ?? [];
    trendingTotalPages = Math.ceil((trendingResult?.pageInfo.total ?? 0) / 24);
    popularTotalPages = Math.ceil((popularResult?.pageInfo.total ?? 0) / 24);
    totalPages = Math.max(trendingTotalPages, popularTotalPages);
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
          <AnimeGrid animes={media} view={viewMode} />
        ) : (
          <>
            <AnimeGrid animes={trendingMedia} title="Тренды сезона" view={viewMode} />
            <AnimeGrid animes={popularMedia} title="Популярное за всё время" view={viewMode} />
          </>
        )}

        <Pagination currentPage={page} totalPages={totalPages} baseUrl="/" />
      </main>
    </>
  );
}
