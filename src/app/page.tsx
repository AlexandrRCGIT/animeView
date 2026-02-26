import type { Metadata } from 'next';
import { getTrendingAnime, getPopularAnime } from '@/lib/api/anilist';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Pagination } from '@/components/ui/Pagination';
import { Header } from '@/components/ui/Header';

export const metadata: Metadata = {
  title: 'AnimeView — смотри аниме онлайн',
  description: 'Тренды сезона, популярные тайтлы и онлайн-плеер на AnimeView.',
};

export const revalidate = 600;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [trendingResult, popularResult] = await Promise.all([
    getTrendingAnime(page, 24).catch(() => null),
    getPopularAnime(page, 24).catch(() => null),
  ]);

  const trending = trendingResult?.media ?? [];
  const popular = popularResult?.media ?? [];
  const hasNextPage =
    (trendingResult?.pageInfo.hasNextPage ?? false) ||
    (popularResult?.pageInfo.hasNextPage ?? false);

  const hasData = trending.length > 0 || popular.length > 0;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 flex flex-col gap-12">
        {/* Hero — только на первой странице */}
        {page === 1 && (
          <section className="text-center py-10">
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
              Anime<span className="text-violet-500">View</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Смотри аниме онлайн — онгоинги текущего сезона и классика с русской озвучкой
            </p>
          </section>
        )}

        {!hasData && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">Не удалось загрузить данные с AniList.</p>
            <p className="text-sm mt-2 text-zinc-600">
              Проверьте подключение к интернету.
            </p>
          </div>
        )}

        {trending.length > 0 && (
          <AnimeGrid animes={trending} title="Тренды сезона" />
        )}

        {popular.length > 0 && (
          <AnimeGrid animes={popular} title="Популярное за всё время" />
        )}

        <Pagination
          currentPage={page}
          hasNextPage={hasNextPage}
          baseUrl="/"
        />
      </main>
    </>
  );
}
