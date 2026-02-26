import Image from 'next/image';
import Link from 'next/link';
import { getBestTitle, formatStatus, formatMediaFormat } from '@/lib/api/anilist';
import type { AniListMediaShort } from '@/lib/api/anilist';
import type { ViewMode } from '@/components/ui/FilterBar';
import { ExpandableText } from '@/components/ui/ExpandableText';
import { FavoriteButton } from './FavoriteButton';

interface AnimeCardProps {
  anime: AniListMediaShort;
  view?: ViewMode;
  isFavorited?: boolean;
  isLoggedIn?: boolean;
}

export function AnimeCard({ anime, view = 'grid', isFavorited = false, isLoggedIn = false }: AnimeCardProps) {
  const title = getBestTitle(anime.title);
  const poster = anime.coverImage.large ?? anime.coverImage.medium;
  const format = formatMediaFormat(anime.format);
  const status = formatStatus(anime.status);
  const score = anime.averageScore;

  if (view === 'list') {
    const description = anime.description
      ? anime.description.replace(/<[^>]*>/g, '')
      : null;

    return (
      <Link
        href={`/anime/${anime.id}`}
        className="group flex gap-6 p-4 pr-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all duration-200"
      >
        {/* Постер */}
        <div className="flex-none w-28 h-40 rounded-lg overflow-hidden bg-zinc-800 shadow-lg shrink-0">
          {poster ? (
            <Image
              src={poster}
              alt={title}
              width={112}
              height={160}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
              Нет постера
            </div>
          )}
        </div>

        {/* Основной контент */}
        <div className="flex flex-1 min-w-0 overflow-hidden flex-col gap-2">
          {/* Заголовок + рейтинг */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white leading-snug">
                {title}
              </h3>
              {anime.title.romaji && anime.title.romaji !== title && (
                <p className="text-xs text-zinc-500 mt-0.5">{anime.title.romaji}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {score && (
                <span className="text-amber-400 text-sm font-bold">
                  ★ {(score / 10).toFixed(1)}
                </span>
              )}
              <FavoriteButton
                anilistId={anime.id}
                isFavorited={isFavorited}
                isLoggedIn={isLoggedIn}
                variant="icon"
              />
            </div>
          </div>

          {/* Мета: формат, статус, эпизоды, год */}
          <div className="flex items-center gap-2 flex-wrap">
            {format && (
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md">
                {format}
              </span>
            )}
            {status && (
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  anime.status === 'RELEASING'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : anime.status === 'NOT_YET_RELEASED'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {status}
              </span>
            )}
            {anime.episodes && (
              <span className="text-xs text-zinc-500">{anime.episodes} эп.</span>
            )}
            {anime.seasonYear && anime.season && (
              <span className="text-xs text-zinc-500">
                {anime.season} {anime.seasonYear}
              </span>
            )}
          </div>

          {/* Жанры */}
          {anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {anime.genres.slice(0, 5).map((g) => (
                <span
                  key={g}
                  className="text-xs border border-zinc-700 text-zinc-500 px-2 py-0.5 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Описание */}
          {description && <ExpandableText text={description} />}
        </div>
      </Link>
    );
  }

  // ── Grid view (default) ───────────────────────────────────────────────────
  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all duration-200"
    >
      <div className="relative aspect-2/3 overflow-hidden bg-zinc-800">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 14vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
            Нет постера
          </div>
        )}
        {score && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-amber-400 text-xs font-bold px-2 py-0.5 rounded-md">
            ★ {(score / 10).toFixed(1)}
          </div>
        )}
        {format && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-zinc-300 text-xs px-2 py-0.5 rounded-md">
            {format}
          </div>
        )}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <FavoriteButton
            anilistId={anime.id}
            isFavorited={isFavorited}
            isLoggedIn={isLoggedIn}
            variant="icon"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 p-3">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {status && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                anime.status === 'RELEASING'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : anime.status === 'NOT_YET_RELEASED'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {status}
            </span>
          )}
          {anime.episodes && (
            <span className="text-xs text-zinc-500">{anime.episodes} эп.</span>
          )}
          {anime.seasonYear && (
            <span className="text-xs text-zinc-600">{anime.seasonYear}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
