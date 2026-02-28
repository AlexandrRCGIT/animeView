import { AnimeCard } from './AnimeCard';
import type { AnimeShort } from '@/lib/api/shikimori';
import type { ViewMode } from '@/components/ui/FilterBar';

interface AnimeGridProps {
  animes: AnimeShort[];
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
        <h2 style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: 20, fontWeight: 700, color: '#fff',
          marginBottom: 24, letterSpacing: '-0.02em',
        }}>{title}</h2>
      )}

      {view === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {animes.map(anime => (
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16,
        }}>
          {animes.map(anime => (
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
