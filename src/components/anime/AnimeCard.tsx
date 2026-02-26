import Image from 'next/image';
import Link from 'next/link';
import { getBestTitle, formatStatus, formatMediaFormat } from '@/lib/api/anilist';
import type { AniListMediaShort } from '@/lib/api/anilist';
import type { ViewMode } from '@/components/ui/FilterBar';

interface AnimeCardProps {
  anime: AniListMediaShort;
  view?: ViewMode;
}

export function AnimeCard({ anime, view = 'grid' }: AnimeCardProps) {
  const title = getBestTitle(anime.title);
  const poster = anime.coverImage.large ?? anime.coverImage.medium;
  const format = formatMediaFormat(anime.format);
  const status = formatStatus(anime.status);
  const score = anime.averageScore;

  if (view === 'list') {
    return (
      <Link
        href={`/anime/${anime.id}`}
        className="group flex gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all duration-200"
      >
        {/* Постер */}
        <div className="relative flex-none w-16 aspect-2/3 rounded-lg overflow-hidden bg-zinc-800">
          {poster ? (
            <Image
              src={poster}
              alt={title}
              fill
              sizes="64px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">—</div>
          )}
        </div>

        {/* Информация */}
        <div className="flex flex-1 min-w-0 flex-col justify-center gap-1">
          <h3 className="text-sm font-medium text-white leading-snug truncate">
            {title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {format && (
              <span className="text-xs text-zinc-500">{format}</span>
            )}
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
            {anime.genres.slice(0, 3).map((g) => (
              <span key={g} className="text-xs text-zinc-600">{g}</span>
            ))}
          </div>
        </div>

        {/* Рейтинг справа */}
        {score && (
          <div className="flex-none flex items-center text-amber-400 text-sm font-bold">
            ★ {(score / 10).toFixed(1)}
          </div>
        )}
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
