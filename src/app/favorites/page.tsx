import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getFavorites } from '@/app/actions/favorites';
import { getAnimeByIds } from '@/lib/api/anilist';
import { Header } from '@/components/ui/Header';
import { AnimeGrid } from '@/components/anime/AnimeGrid';

export const metadata = { title: 'Избранное — AnimeView' };

export default async function FavoritesPage() {
  const session = await auth();
  if (!session) redirect('/auth/signin?callbackUrl=/favorites');

  const ids = await getFavorites();
  const animes = ids.length > 0 ? await getAnimeByIds(ids) : [];

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Избранное</h1>

        {animes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-700 mb-4"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <p className="text-zinc-500 text-lg">Список избранного пуст</p>
            <p className="text-zinc-600 text-sm mt-1">
              Добавляйте аниме нажав на кнопку на странице тайтла
            </p>
          </div>
        ) : (
          <AnimeGrid animes={animes} />
        )}
      </main>
    </>
  );
}
