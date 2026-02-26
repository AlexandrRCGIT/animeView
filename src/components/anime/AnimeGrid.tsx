import { AnimeCard } from './AnimeCard';
import type { AnimeShort } from '@/lib/api/shikimori';

interface AnimeGridProps {
  animes: AnimeShort[];
  title?: string;
}

export function AnimeGrid({ animes, title }: AnimeGridProps) {
  return (
    <section>
      {title && (
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
        {animes.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>
    </section>
  );
}
