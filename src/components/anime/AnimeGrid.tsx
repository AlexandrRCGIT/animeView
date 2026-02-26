import { AnimeCard } from './AnimeCard';
import type { AniListMediaShort } from '@/lib/api/anilist';

interface AnimeGridProps {
  animes: AniListMediaShort[];
  title?: string;
}

export function AnimeGrid({ animes, title }: AnimeGridProps) {
  if (animes.length === 0) return null;

  return (
    <section>
      {title && (
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {animes.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>
    </section>
  );
}
