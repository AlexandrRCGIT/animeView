import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getAnimeDetail,
  getBestTitle,
  formatStatus,
  formatMediaFormat,
} from '@/lib/api/anilist';
import {
  getKodikByMalId,
  getKodikByTitle,
  groupByTranslation,
  buildKodikIframeUrl,
} from '@/lib/api/kodik';
import { Header } from '@/components/ui/Header';
import { KodikPlayer } from '@/components/anime/KodikPlayer';
import { FavoriteButton } from '@/components/anime/FavoriteButton';
import { auth } from '@/auth';
import { isFavorite } from '@/app/actions/favorites';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return {};

  try {
    const anime = await getAnimeDetail(numId);
    const title = getBestTitle(anime.title);
    return {
      title,
      description:
        anime.description?.replace(/<[^>]*>/g, '').slice(0, 160) ??
        `Смотреть ${title} онлайн с русской озвучкой на AnimeView`,
      openGraph: {
        title,
        images: anime.coverImage.extraLarge
          ? [{ url: anime.coverImage.extraLarge }]
          : [],
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

  // 0. Сессия пользователя
  const session = await auth();

  // 1. Данные из AniList
  let anime;
  try {
    anime = await getAnimeDetail(numId);
  } catch {
    notFound();
  }

  const title = getBestTitle(anime.title);

  // 2. Данные из Kodik (не роняем страницу если Kodik недоступен/нет токена)
  let translations: ReturnType<typeof groupByTranslation> = [];
  try {
    const kodikData = anime.idMal
      ? await getKodikByMalId(anime.idMal)
      : await getKodikByTitle(title);

    translations = groupByTranslation(kodikData.results);
  } catch {
    // Kodik недоступен — страница всё равно отображается
  }

  const defaultTranslation = translations[0] ?? null;
  const iframeUrl = defaultTranslation
    ? buildKodikIframeUrl(defaultTranslation.result.link)
    : null;

  // 3. Статус избранного
  const favorited = session ? await isFavorite(numId) : false;

  const poster = anime.coverImage.extraLarge ?? anime.coverImage.large;
  const studios = anime.studios.nodes
    .filter((s) => s.isAnimationStudio)
    .map((s) => s.name);

  return (
    <>
      <Header />

      {/* Баннер */}
      {anime.bannerImage && (
        <div className="relative h-48 md:h-64 overflow-hidden">
          <Image
            src={anime.bannerImage}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950" />
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Боковая панель ── */}
          <aside className="lg:w-56 flex-none flex flex-col gap-4">
            {/* Постер */}
            {poster && (
              <div className="relative w-full aspect-2/3 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <Image
                  src={poster}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="224px"
                  priority
                />
              </div>
            )}

            {/* Мета-блок */}
            <dl className="flex flex-col gap-2 text-sm">
              {anime.format && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Тип</dt>
                  <dd className="text-zinc-200">{formatMediaFormat(anime.format)}</dd>
                </div>
              )}
              {anime.status && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Статус</dt>
                  <dd className="text-zinc-200">{formatStatus(anime.status)}</dd>
                </div>
              )}
              {anime.episodes && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Эпизоды</dt>
                  <dd className="text-zinc-200">{anime.episodes}</dd>
                </div>
              )}
              {anime.seasonYear && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Год</dt>
                  <dd className="text-zinc-200">
                    {anime.season} {anime.seasonYear}
                  </dd>
                </div>
              )}
              {anime.duration && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Длительность</dt>
                  <dd className="text-zinc-200">{anime.duration} мин.</dd>
                </div>
              )}
              {studios.length > 0 && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Студия</dt>
                  <dd className="text-zinc-200">{studios.join(', ')}</dd>
                </div>
              )}
            </dl>
          </aside>

          {/* ── Основной контент ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* Заголовок */}
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">{title}</h1>
              {anime.title.romaji && anime.title.romaji !== title && (
                <p className="text-zinc-400 mt-1">{anime.title.romaji}</p>
              )}
              {anime.title.native && (
                <p className="text-zinc-600 text-sm mt-0.5">{anime.title.native}</p>
              )}
            </div>

            {/* Оценка + жанры + избранное */}
            <div className="flex flex-wrap gap-2 items-center">
              {anime.averageScore && (
                <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-bold">
                  ★ {(anime.averageScore / 10).toFixed(1)}
                </span>
              )}
              <FavoriteButton
                anilistId={numId}
                isFavorited={favorited}
                isLoggedIn={!!session}
              />
              {anime.genres.slice(0, 6).map((genre) => (
                <span
                  key={genre}
                  className="border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-md text-xs hover:border-zinc-500 transition-colors"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Описание */}
            {anime.description && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Описание
                </h2>
                <p className="text-zinc-300 leading-relaxed text-sm line-clamp-5">
                  {anime.description.replace(/<[^>]*>/g, '')}
                </p>
              </div>
            )}

            {/* Плеер Kodik */}
            <KodikPlayer
              iframeUrl={iframeUrl}
              translations={translations}
              animeTitle={title}
            />

            {/* Следующий эпизод */}
            {anime.nextAiringEpisode && (
              <div className="text-sm text-zinc-500">
                Следующий эпизод:{' '}
                <span className="text-zinc-300">
                  #{anime.nextAiringEpisode.episode}
                </span>{' '}
                —{' '}
                {new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleDateString(
                  'ru-RU',
                  { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
