import type { Metadata } from 'next';
import { getLatestUpdates, getCurrentSeasonAnime } from '@/lib/api/shikimori';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Header } from '@/components/ui/Header';

export const metadata: Metadata = {
  title: 'AnimeView — смотри аниме онлайн',
  description: 'Последние обновления аниме, онгоинги сезона и топ тайтлы.',
};

// ISR: страница перегенерируется каждые 5 минут
export const revalidate = 300;

export default async function HomePage() {
  // Запросы выполняются параллельно, ошибки не роняют страницу
  const [latestUpdates, currentSeason] = await Promise.all([
    getLatestUpdates(1, 14).catch(() => []),
    getCurrentSeasonAnime(14).catch(() => []),
  ]);

  const hasData = currentSeason.length > 0 || latestUpdates.length > 0;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 flex flex-col gap-10">
        <section className="text-center py-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Anime<span className="text-violet-500">View</span>
          </h1>
          <p className="text-zinc-400 text-lg">
            Смотри аниме онлайн — актуальные онгоинги и классика
          </p>
        </section>

        {!hasData && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">Не удалось загрузить данные с Shikimori.</p>
            <p className="text-sm mt-2">Проверьте подключение к интернету или попробуйте позже.</p>
          </div>
        )}

        {currentSeason.length > 0 && (
          <AnimeGrid animes={currentSeason} title="Аниме текущего сезона" />
        )}
        {latestUpdates.length > 0 && (
          <AnimeGrid animes={latestUpdates} title="Последние обновления" />
        )}
      </main>
    </>
  );
}
