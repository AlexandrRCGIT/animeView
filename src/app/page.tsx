import type { Metadata } from 'next';
import { getTrendingAnime, getPopularAnime } from '@/lib/api/anilist';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Header } from '@/components/ui/Header';

export const metadata: Metadata = {
  title: 'AnimeView — смотри аниме онлайн',
  description: 'Тренды сезона, популярные тайтлы и онлайн-плеер на AnimeView.',
};

export const revalidate = 600; // ISR: 10 минут

export default async function HomePage() {
  const [trending, popular] = await Promise.all([
    getTrendingAnime(1, 18).catch(() => []),
    getPopularAnime(1, 18).catch(() => []),
  ]);

  const hasData = trending.length > 0 || popular.length > 0;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 flex flex-col gap-12">
        {/* Hero */}
        <section className="text-center py-10">
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
            Anime<span className="text-violet-500">View</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Смотри аниме онлайн — актуальные онгоинги текущего сезона и классика с русской озвучкой
          </p>
        </section>

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
      </main>
    </>
  );
}
