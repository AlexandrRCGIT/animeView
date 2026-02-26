import Image from 'next/image';
import Link from 'next/link';
import { getShikimoriImageUrl } from '@/lib/api/shikimori';
import type { AnimeShort } from '@/lib/api/shikimori';

interface AnimeCardProps {
  anime: AnimeShort;
}

const STATUS_LABELS: Record<string, string> = {
  ongoing: 'Онгоинг',
  released: 'Завершён',
  anons: 'Анонс',
};

const KIND_LABELS: Record<string, string> = {
  tv: 'TV',
  movie: 'Фильм',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Спешл',
  music: 'Клип',
};

export function AnimeCard({ anime }: AnimeCardProps) {
  const posterUrl = getShikimoriImageUrl(anime.image.preview);
  const title = anime.russian || anime.name;
  const kind = KIND_LABELS[anime.kind] ?? anime.kind.toUpperCase();
  const status = STATUS_LABELS[anime.status] ?? anime.status;

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all duration-200"
    >
      {/* Постер */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <Image
          src={posterUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 14vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized // Shikimori не требует авторизации для картинок
        />
        {/* Рейтинг */}
        {anime.score !== '0.0' && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-amber-400 text-xs font-bold px-2 py-0.5 rounded-md">
            ★ {anime.score}
          </div>
        )}
        {/* Тип */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-zinc-300 text-xs px-2 py-0.5 rounded-md">
          {kind}
        </div>
      </div>

      {/* Информация */}
      <div className="flex flex-col gap-1 p-3">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
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
          {anime.episodes > 0 && (
            <span className="text-xs text-zinc-500">
              {anime.episodes_aired > 0 && anime.status === 'ongoing'
                ? `${anime.episodes_aired}/${anime.episodes} эп.`
                : `${anime.episodes} эп.`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
