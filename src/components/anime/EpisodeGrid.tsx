'use client';

import { useState, useRef, useEffect } from 'react';
import type { EpisodesInfo, TranslationSeasons } from '@/lib/db/anime';

export interface EpisodeGridProps {
  /** Display data: { season: { ep: { title, screenshot } } } */
  episodesInfo: EpisodesInfo;
  /** Playback links for active translation: { season: { link, episodes: { ep: link } } } */
  translationSeasons: TranslationSeasons | null;
  /** Current episode & season */
  currentSeason: number;
  currentEpisode: number;
  /** Called when user clicks an episode */
  onEpisodeSelect: (season: number, episode: number) => void;
}

export function EpisodeGrid({
  episodesInfo,
  translationSeasons,
  currentSeason,
  currentEpisode,
  onEpisodeSelect,
}: EpisodeGridProps) {
  const seasonNumbers = Object.keys(episodesInfo)
    .map(Number)
    .sort((a, b) => a - b);

  const [activeSeason, setActiveSeason] = useState(currentSeason);
  const activeEpRef = useRef<HTMLButtonElement | null>(null);

  // Scroll active episode into view
  useEffect(() => {
    activeEpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentEpisode, activeSeason]);

  const episodes = episodesInfo[String(activeSeason)] ?? {};
  const episodeNumbers = Object.keys(episodes).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ width: '100%' }}>
      {/* Season selector */}
      {seasonNumbers.length > 1 && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 16,
          overflowX: 'auto', paddingBottom: 4,
        }}>
          {seasonNumbers.map(s => (
            <button
              key={s}
              onClick={() => setActiveSeason(s)}
              style={{
                flexShrink: 0,
                padding: '6px 18px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                background: activeSeason === s
                  ? 'linear-gradient(135deg, #E13C6E, #6C3CE1)'
                  : 'rgba(255,255,255,0.07)',
                color: activeSeason === s ? '#fff' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s',
              }}
            >
              Сезон {s}
            </button>
          ))}
        </div>
      )}

      {/* Episodes grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 8,
        maxHeight: 480,
        overflowY: 'auto',
        paddingRight: 4,
      }}>
        {episodeNumbers.map(ep => {
          const epData = episodes[String(ep)];
          const isActive = activeSeason === currentSeason && ep === currentEpisode;
          const screenshot = epData?.screenshot ?? null;

          return (
            <button
              key={ep}
              ref={isActive ? activeEpRef : null}
              onClick={() => {
                setActiveSeason(activeSeason);
                onEpisodeSelect(activeSeason, ep);
              }}
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                border: isActive ? '2px solid #6C3CE1' : '2px solid transparent',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                padding: 0,
                textAlign: 'left',
                transition: 'border-color 0.2s, transform 0.15s',
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              {/* Screenshot or placeholder */}
              <div style={{
                width: '100%',
                aspectRatio: '16/9',
                background: screenshot
                  ? `url(${screenshot}) center/cover no-repeat`
                  : 'rgba(255,255,255,0.06)',
                position: 'relative',
              }}>
                {/* Active overlay */}
                {isActive && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(108,60,225,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {/* Play icon */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                )}

                {!screenshot && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Episode label */}
              <div style={{ padding: '6px 8px' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.8)',
                }}>
                  Серия {ep}
                </div>
                {epData?.title && (
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {epData.title}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
