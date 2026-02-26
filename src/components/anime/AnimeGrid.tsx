import { AnimeCard } from './AnimeCard';
import type { AniListMediaShort } from '@/lib/api/anilist';
import type { ViewMode } from '@/components/ui/FilterBar';

interface AnimeGridProps {
  animes: AniListMediaShort[];
  title?: string;
  view?: ViewMode;
  favoritedIds?: Set<number>;
  isLoggedIn?: boolean;
}

export function AnimeGrid({ animes, title, view = 'grid', favoritedIds, isLoggedIn = false }: AnimeGridProps) {
  if (animes.length === 0) return null;

  return (
    <section>
      {title && (
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      )}
      {view === 'list' ? (
        <div className="flex flex-col gap-2">
          {animes.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              view="list"
              isFavorited={favoritedIds?.has(anime.id) ?? false}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {animes.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              view="grid"
              isFavorited={favoritedIds?.has(anime.id) ?? false}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      )}
    </section>
  );
}
