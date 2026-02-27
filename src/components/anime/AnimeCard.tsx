import Image from 'next/image';
import Link from 'next/link';
import { getBestTitle, formatStatus, formatKind, getShikimoriImageUrl } from '@/lib/api/shikimori';
import type { AnimeShort } from '@/lib/api/shikimori';
import type { ViewMode } from '@/components/ui/FilterBar';
import { FavoriteButton } from './FavoriteButton';

interface AnimeCardProps {
  anime: AnimeShort;
  view?: ViewMode;
  isFavorited?: boolean;
  isLoggedIn?: boolean;
}

export function AnimeCard({ anime, view = 'grid', isFavorited = false, isLoggedIn = false }: AnimeCardProps) {
  const title = getBestTitle(anime);
  const poster = getShikimoriImageUrl(anime.image.original);
  const format = formatKind(anime.kind);
  const status = formatStatus(anime.status);
  const score = parseFloat(anime.score);
  const year = anime.aired_on?.split('-')[0] ?? null;

  if (view === 'list') {
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
              {anime.name && anime.name !== title && (
                <p className="text-xs text-zinc-500 mt-0.5">{anime.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {score > 0 && (
                <span className="text-amber-400 text-sm font-bold">
                  ★ {score.toFixed(1)}
                </span>
              )}
              <FavoriteButton
                shikimoriId={anime.id}
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
                  anime.status === 'ongoing'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : anime.status === 'anons'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {status}
              </span>
            )}
            {anime.episodes > 0 && (
              <span className="text-xs text-zinc-500">{anime.episodes} эп.</span>
            )}
            {year && (
              <span className="text-xs text-zinc-500">{year}</span>
            )}
          </div>

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
        {score > 0 && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-amber-400 text-xs font-bold px-2 py-0.5 rounded-md">
            ★ {score.toFixed(1)}
          </div>
        )}
        {format && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-zinc-300 text-xs px-2 py-0.5 rounded-md">
            {format}
          </div>
        )}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <FavoriteButton
            shikimoriId={anime.id}
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
                anime.status === 'ongoing'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : anime.status === 'anons'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {status}
            </span>
          )}
          {anime.episodes > 0 && (
            <span className="text-xs text-zinc-500">{anime.episodes} эп.</span>
          )}
          {year && (
            <span className="text-xs text-zinc-600">{year}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
