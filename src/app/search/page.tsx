import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { searchAnime } from '@/lib/api/anilist';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Pagination } from '@/components/ui/Pagination';
import { Header } from '@/components/ui/Header';

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q) return { title: 'Поиск — AnimeView' };
  return {
    title: `«${q}» — поиск на AnimeView`,
    description: `Результаты поиска аниме по запросу «${q}» на AnimeView.`,
  };
}

// Страница поиска не кэшируется
export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: Props) {
  const { q, page: pageParam } = await searchParams;

  // Пустой запрос — редирект на главную
  if (!q?.trim()) redirect('/');

  const page = Math.max(1, Number(pageParam) || 1);

  const result = await searchAnime(q.trim(), page, 24).catch(() => null);
  const media = result?.media ?? [];
  const totalPages = Math.ceil((result?.pageInfo.total ?? 0) / 24);

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Заголовок поиска */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            Поиск:{' '}
            <span className="text-violet-400">«{q}»</span>
          </h1>
          {result && (
            <p className="text-zinc-500 text-sm mt-1">
              {result.pageInfo.total > 0
                ? `Найдено тайтлов: ${result.pageInfo.total}`
                : 'Ничего не найдено'}
            </p>
          )}
        </div>

        {/* Результаты */}
        {media.length > 0 ? (
          <>
            <AnimeGrid animes={media} />
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
            <p className="text-zinc-400 text-lg">
              По запросу «{q}» ничего не найдено
            </p>
            <p className="text-zinc-600 text-sm">
              Попробуйте другое название или транслитерацию
            </p>
          </div>
        )}
      </main>
    </>
  );
}
