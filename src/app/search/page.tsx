import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getBrowseAnime, sortToAniList } from '@/lib/api/anilist';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Pagination } from '@/components/ui/Pagination';
import { FilterBar } from '@/components/ui/FilterBar';
import { Header } from '@/components/ui/Header';
import type { ViewMode } from '@/components/ui/FilterBar';

interface Props {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    genre?: string;
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
  const { q, page: pageParam, sort, genre, view } = await searchParams;

  if (!q?.trim()) redirect('/');

  const page = Math.max(1, Number(pageParam) || 1);
  const viewMode = (view === 'list' ? 'list' : 'grid') as ViewMode;

  const result = await getBrowseAnime({
    page,
    perPage: 24,
    search: q.trim(),
    genre,
    sort: sortToAniList(sort ?? null),
  }).catch(() => null);

  const media = result?.media ?? [];
  const totalPages = Math.ceil((result?.pageInfo.total ?? 0) / 24);

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Поиск: <span className="text-violet-400">«{q}»</span>
          </h1>
          {result && result.pageInfo.total > 0 && (
            <p className="text-zinc-500 text-sm mt-1">
              Найдено: {result.pageInfo.total}
            </p>
          )}
        </div>

        <Suspense>
          <FilterBar />
        </Suspense>

        {media.length > 0 ? (
          <>
            <AnimeGrid animes={media} view={viewMode} />
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
