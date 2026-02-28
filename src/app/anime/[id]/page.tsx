import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getAnimeById,
  getBestTitle,
  formatStatus,
  formatKind,
  getShikimoriImageUrl,
} from '@/lib/api/shikimori';
import {
  getKodikByMalId,
  getKodikByTitle,
  groupByTranslation,
  buildKodikIframeUrl,
} from '@/lib/api/kodik';
import { cookies } from 'next/headers';
import { Header } from '@/components/ui/Header';
import { FavoriteButton } from '@/components/anime/FavoriteButton';
import { BackButton } from '@/components/ui/BackButton';
import { PlayerTabs } from '@/components/anime/PlayerTabs';
import { auth } from '@/auth';
import { isFavorite } from '@/app/actions/favorites';
import { getAniboomUrl } from '@/lib/api/aniboom';
import type { FavStyle } from '@/app/actions/settings';
import { getAnimeDetailFromDB, saveAnimeDetailToDB } from '@/lib/db/anime';

interface Props {
  params: Promise<{ id: string }>;
}

// Страница динамическая — кеш управляется через Supabase (TTL по статусу)
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return {};

  try {
    const anime = await getAnimeById(numId);
    const title = getBestTitle(anime);
    return {
      title,
      description:
        anime.description?.slice(0, 160) ??
        `Смотреть ${title} онлайн с русской озвучкой на AnimeView`,
      openGraph: {
        title,
        images: anime.image.original
          ? [{ url: getShikimoriImageUrl(anime.image.original) }]
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

  // 1. Данные аниме: сначала из БД, при промахе — Shikimori + сохраняем в БД
  let anime;
  try {
    const cached = await getAnimeDetailFromDB(numId).catch(() => null);
    if (cached) {
      anime = cached;
    } else {
      anime = await getAnimeById(numId);
      await saveAnimeDetailToDB(numId, anime).catch(() => null);
    }
  } catch {
    notFound();
  }

  const title = getBestTitle(anime);
  // Shikimori ID = MAL ID, используем напрямую для Kodik
  // Fallback: поиск по названию если Kodik не нашёл по ID

  // 2. Kodik + Aniboom параллельно (не роняем страницу если недоступны)
  let translations: ReturnType<typeof groupByTranslation> = [];
  let aniboomUrl: string | null = null;

  const [kodikResult, aniboomResult] = await Promise.allSettled([
    getKodikByMalId(numId).then((res) => {
      // Если Kodik ничего не нашёл по ID — пробуем по названию
      if (!res.results || res.results.length === 0) {
        return getKodikByTitle(anime.name);
      }
      return res;
    }),
    // animego.me лучше ищет по romaji (оригинальное название), затем по english
    getAniboomUrl([
      anime.name,
      ...(anime.english ?? []),
    ].filter(Boolean) as string[]),
  ]);

  if (kodikResult.status === 'fulfilled') {
    translations = groupByTranslation(kodikResult.value.results);
  }
  if (aniboomResult.status === 'fulfilled') {
    aniboomUrl = aniboomResult.value;
  }

  const defaultTranslation = translations[0] ?? null;
  const iframeUrl = defaultTranslation
    ? buildKodikIframeUrl(defaultTranslation.result.link)
    : null;

  // 3. Статус избранного и предпочтение отображения
  const favorited = session ? await isFavorite(numId) : false;
  const favStyle = ((await cookies()).get('fav_style')?.value ?? 'icon') as FavStyle;

  const poster = getShikimoriImageUrl(anime.image.original);
  const studios = anime.studios.map((s) => s.name);
  const genres = anime.genres.map((g) => g.russian);
  const score = parseFloat(anime.score);
  const year = anime.aired_on?.split('-')[0] ?? null;

  return (
    <>
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Боковая панель ── */}
          <aside className="lg:w-56 flex-none flex flex-col gap-4">
            {/* Постер */}
            {poster && (
              <div className={`relative w-full aspect-2/3 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 ${favStyle === 'icon' ? 'group' : ''}`}>
                <Image
                  src={poster}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="224px"
                  priority
                />
                {favStyle === 'icon' && (
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <FavoriteButton
                      shikimoriId={numId}
                      isFavorited={favorited}
                      isLoggedIn={!!session}
                      variant="icon"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Кнопка избранного (стиль button) */}
            {favStyle === 'button' && (
              <FavoriteButton
                shikimoriId={numId}
                isFavorited={favorited}
                isLoggedIn={!!session}
                variant="button"
              />
            )}

            {/* Мета-блок */}
            <dl className="flex flex-col gap-2 text-sm">
              {anime.kind && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Тип</dt>
                  <dd className="text-zinc-200">{formatKind(anime.kind)}</dd>
                </div>
              )}
              {anime.status && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Статус</dt>
                  <dd className="text-zinc-200">{formatStatus(anime.status)}</dd>
                </div>
              )}
              {anime.episodes > 0 && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Эпизоды</dt>
                  <dd className="text-zinc-200">{anime.episodes}</dd>
                </div>
              )}
              {year && (
                <div>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">Год</dt>
                  <dd className="text-zinc-200">{year}</dd>
                </div>
              )}
              {anime.duration > 0 && (
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
              {anime.name && anime.name !== title && (
                <p className="text-zinc-400 mt-1">{anime.name}</p>
              )}
              {anime.japanese?.[0] && (
                <p className="text-zinc-600 text-sm mt-0.5">{anime.japanese[0]}</p>
              )}
            </div>

            {/* Оценка + жанры */}
            <div className="flex flex-wrap gap-2 items-center">
              {score > 0 && (
                <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-bold">
                  ★ {score.toFixed(1)}
                </span>
              )}
              {genres.slice(0, 6).map((genre) => (
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
                  {anime.description}
                </p>
              </div>
            )}

            {/* Плееры: Kodik / Aniboom */}
            <PlayerTabs
              animeTitle={title}
              kodikUrl={iframeUrl}
              kodikTranslations={translations}
              aniboomUrl={aniboomUrl}
            />

            {/* Следующий эпизод */}
            {anime.next_episode_at && (
              <div className="text-sm text-zinc-500">
                Следующий эпизод:{' '}
                {new Date(anime.next_episode_at).toLocaleDateString(
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
