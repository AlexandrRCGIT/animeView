import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getAnimeById, getShikimoriImageUrl } from '@/lib/api/shikimori';
import { Header } from '@/components/ui/Header';

interface Props {
  params: Promise<{ id: string }>;
}

// Кэш: метаданные тайтла обновляются редко
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return {};

  try {
    const anime = await getAnimeById(numId);
    const title = anime.russian || anime.name;
    return {
      title,
      description: anime.description ?? `Смотреть ${title} онлайн на AnimeView`,
      openGraph: {
        title,
        description: anime.description ?? undefined,
        images: [{ url: getShikimoriImageUrl(anime.image.original) }],
      },
    };
  } catch {
    return {};
  }
}

export default async function AnimePage({ params }: Props) {
  const { id } = await params;
  const numId = Number(id);

  if (isNaN(numId)) notFound();

  let anime;
  try {
    anime = await getAnimeById(numId);
  } catch {
    notFound();
  }

  const title = anime.russian || anime.name;
  const posterUrl = getShikimoriImageUrl(anime.image.original);

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Постер */}
          <div className="flex-none">
            <div className="relative w-full md:w-56 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
              <Image
                src={posterUrl}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 224px"
                priority
                unoptimized
              />
            </div>
          </div>

          {/* Информация */}
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{title}</h1>
              {anime.name !== title && (
                <p className="text-zinc-400 mt-1">{anime.name}</p>
              )}
            </div>

            {/* Мета-информация */}
            <div className="flex flex-wrap gap-2">
              {anime.score !== '0.0' && (
                <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-semibold">
                  ★ {anime.score}
                </span>
              )}
              <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm">
                {anime.kind.toUpperCase()}
              </span>
              {anime.episodes > 0 && (
                <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm">
                  {anime.episodes} эп.
                </span>
              )}
              {anime.aired_on && (
                <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm">
                  {new Date(anime.aired_on).getFullYear()}
                </span>
              )}
            </div>

            {/* Жанры */}
            {anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {anime.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded text-xs"
                  >
                    {genre.russian || genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Описание */}
            {anime.description && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Описание
                </h2>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  {anime.description}
                </p>
              </div>
            )}

            {/* Плеер — будет добавлен в Этапе 2 (Kodik API) */}
            <div className="mt-4 p-4 rounded-xl border border-dashed border-zinc-700 text-center text-zinc-600 text-sm">
              Плеер Kodik будет добавлен в Этапе 2
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
