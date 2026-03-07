'use client';

import { useState, useEffect } from 'react';
import { AnimeCard } from './AnimeCard';
import type { AnimeShort } from '@/lib/db/anime';
import type { ViewMode } from '@/components/ui/FilterBar';

export interface WatchProgressEntry {
  episode: number;
  is_completed: boolean;
}

interface AnimeGridProps {
  animes: AnimeShort[];
  title?: string;
  view?: ViewMode;
  favoritedIds?: Set<number>;
  isLoggedIn?: boolean;
}

export function AnimeGrid({ animes, title, view = 'grid', favoritedIds, isLoggedIn = false }: AnimeGridProps) {
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgressEntry>>({});

  useEffect(() => {
    if (!isLoggedIn || animes.length === 0) return;
    const ids = animes.map(a => a.id).join(',');
    fetch(`/api/watch-progress/batch?ids=${ids}`)
      .then(r => r.json())
      .then((data: { progress?: Record<string, WatchProgressEntry> }) => {
        setProgressMap(data.progress ?? {});
      })
      .catch(() => {});
  }, [isLoggedIn, animes]);

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
          {animes.map((anime, i) => (
            <div key={anime.id} className="anime-card-appear" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
              <AnimeCard
                anime={anime}
                view="list"
                isFavorited={favoritedIds?.has(anime.id) ?? false}
                isLoggedIn={isLoggedIn}
                watchProgress={progressMap[String(anime.id)] ?? null}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16,
        }}>
          {animes.map((anime, i) => (
            <div key={anime.id} className="anime-card-appear" style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}>
              <AnimeCard
                anime={anime}
                view="grid"
                isFavorited={favoritedIds?.has(anime.id) ?? false}
                isLoggedIn={isLoggedIn}
                watchProgress={progressMap[String(anime.id)] ?? null}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
