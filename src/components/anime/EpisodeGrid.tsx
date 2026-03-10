'use client';

import { useState, useRef } from 'react';
import type { EpisodesInfo, TranslationSeasons, DBTranslation } from '@/lib/db/anime';

const POPULAR_IDS = new Set([704, 734, 610, 609, 2550, 611]);

export interface EpisodeWatchProgress {
  season: number;
  episode: number;
  progress_seconds: number | null;
  duration_seconds: number | null;
  is_completed: boolean;
}

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
  /** Watch progress from DB for status indicators */
  watchProgress?: EpisodeWatchProgress | null;
  /** Translation selector */
  translations?: DBTranslation[];
  activeTranslation?: DBTranslation | null;
  onTranslationChange?: (t: DBTranslation) => void;
  controlsLocked?: boolean;
}

type EpisodeStatus = 'watched' | 'in_progress' | 'active' | 'none';

function getEpisodeStatus(
  epSeason: number,
  epNum: number,
  current: { season: number; episode: number },
  wp: EpisodeWatchProgress | null | undefined,
): EpisodeStatus {
  const isActive = epSeason === current.season && epNum === current.episode;
  if (isActive) return 'active';
  if (!wp) return 'none';

  if (epSeason < wp.season) return 'watched';
  if (epSeason > wp.season) return 'none';

  // Тот же сезон
  if (epNum < wp.episode) return 'watched';
  if (epNum === wp.episode) return wp.is_completed ? 'watched' : 'in_progress';
  return 'none';
}

export function EpisodeGrid({
  episodesInfo,
  currentSeason,
  currentEpisode,
  onEpisodeSelect,
  watchProgress,
  translations,
  activeTranslation,
  onTranslationChange,
  controlsLocked = false,
}: EpisodeGridProps) {
  const seasonNumbers = Object.keys(episodesInfo)
    .map(Number)
    .sort((a, b) => a - b);

  const [activeSeason, setActiveSeason] = useState(currentSeason);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const activeEpRef = useRef<HTMLButtonElement | null>(null);


  const episodes = episodesInfo[String(activeSeason)] ?? {};
  const episodeNumbers = Object.keys(episodes).map(Number).sort((a, b) => a - b);

  function findEpisodeAcrossSeasons(episode: number): { season: number; episode: number } | null {
    const orderedSeasons = [activeSeason, ...seasonNumbers.filter((s) => s !== activeSeason)];
    for (const season of orderedSeasons) {
      const seasonEpisodes = episodesInfo[String(season)] ?? {};
      if (seasonEpisodes[String(episode)]) {
        return { season, episode };
      }
    }
    return null;
  }

  function submitEpisodeSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(episodeSearch.trim());

    if (!Number.isFinite(value) || value <= 0) {
      setSearchError('Введите корректный номер серии');
      return;
    }

    const target = findEpisodeAcrossSeasons(Math.floor(value));
    if (!target) {
      setSearchError(`Серия ${Math.floor(value)} не найдена`);
      return;
    }

    setSearchError(null);
    setActiveSeason(target.season);
    onEpisodeSelect(target.season, target.episode);
  }

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
              disabled={controlsLocked}
              onClick={() => setActiveSeason(s)}
              style={{
                flexShrink: 0,
                padding: '6px 18px',
                borderRadius: 20,
                border: 'none',
                cursor: controlsLocked ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                background: activeSeason === s
                  ? 'linear-gradient(135deg, #E13C6E, #6C3CE1)'
                  : 'rgba(255,255,255,0.07)',
                color: activeSeason === s ? '#fff' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s',
                opacity: controlsLocked ? 0.65 : 1,
              }}
            >
              Сезон {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Выбор озвучки */}
        {translations && translations.length > 0 && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              value={activeTranslation?.translation_id ?? ''}
              disabled={controlsLocked}
              onChange={e => {
                if (controlsLocked) return;
                const t = translations.find(tr => tr.translation_id === Number(e.target.value));
                if (t && onTranslationChange) onTranslationChange(t);
              }}
              style={{
                height: 36,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                padding: '0 30px 0 12px',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                maxWidth: 220,
                opacity: controlsLocked ? 0.65 : 1,
              }}
            >
              {translations.map(t => (
                <option key={t.translation_id} value={t.translation_id} style={{ background: '#0e0e16', color: '#fff' }}>
                  {POPULAR_IDS.has(t.translation_id) ? '★ ' : ''}
                  {t.translation_type === 'subtitles' ? '[субтитры] ' : ''}
                  {t.translation_title}
                </option>
              ))}
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"
              style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        )}

        {/* Поиск по номеру серии */}
        <form onSubmit={submitEpisodeSearch} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            min={1}
            step={1}
            disabled={controlsLocked}
            value={episodeSearch}
            onChange={(e) => {
              setEpisodeSearch(e.target.value);
              if (searchError) setSearchError(null);
            }}
            placeholder="Номер серии"
            style={{
              height: 36,
              width: 130,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.9)',
              padding: '0 12px',
              fontSize: 13,
              outline: 'none',
              opacity: controlsLocked ? 0.65 : 1,
            }}
          />
          <button
            type="submit"
            disabled={controlsLocked}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 10,
              border: '1px solid rgba(108,60,225,0.45)',
              background: 'rgba(108,60,225,0.2)',
              color: '#c4b5fd',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: controlsLocked ? 0.65 : 1,
            }}
          >
            Перейти
          </button>
        </form>

        {searchError && (
          <span style={{ fontSize: 12, color: '#fca5a5' }}>
            {searchError}
          </span>
        )}
      </div>

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
          const status = getEpisodeStatus(
            activeSeason, ep,
            { season: currentSeason, episode: currentEpisode },
            watchProgress,
          );
          const isActive = status === 'active';
          const isWatched = status === 'watched';
          const isInProgress = status === 'in_progress';
          const screenshot = epData?.screenshot ?? null;

          const progressPct = isInProgress && watchProgress?.progress_seconds && watchProgress?.duration_seconds
            ? Math.min(100, Math.round((watchProgress.progress_seconds / watchProgress.duration_seconds) * 100))
            : null;

          return (
            <button
              key={ep}
              disabled={controlsLocked}
              ref={isActive ? activeEpRef : null}
              onClick={() => {
                if (controlsLocked) return;
                setActiveSeason(activeSeason);
                onEpisodeSelect(activeSeason, ep);
              }}
              style={{
                position: 'relative',
                borderRadius: 14,
                overflow: 'hidden',
                border: isActive
                  ? '2px solid #6C3CE1'
                  : isWatched
                    ? '1px solid rgba(34,197,94,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                cursor: controlsLocked ? 'not-allowed' : 'pointer',
                background: isWatched
                  ? 'rgba(34,197,94,0.04)'
                  : 'rgba(255,255,255,0.04)',
                opacity: controlsLocked ? 0.75 : 1,
                padding: 0,
                textAlign: 'left',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: isActive
                  ? '0 0 0 1px rgba(108,60,225,0.35), 0 10px 28px rgba(0,0,0,0.45)'
                  : 'none',
              }}
            >
              {/* Screenshot or placeholder */}
              <div style={{
                width: '100%',
                aspectRatio: '16/9',
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                overflow: 'hidden',
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
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                )}

                {/* Watched checkmark */}
                {isWatched && (
                  <div style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(34,197,94,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                )}

                {/* In-progress indicator */}
                {isInProgress && progressPct !== null && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                    background: 'rgba(255,255,255,0.15)',
                  }}>
                    <div style={{
                      height: '100%', width: `${progressPct}%`,
                      background: 'linear-gradient(90deg, #E13C6E, #6C3CE1)',
                    }} />
                  </div>
                )}

                {!screenshot && !isActive && (
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
                  color: isActive ? '#a78bfa' : isWatched ? 'rgba(134,239,172,0.8)' : 'rgba(255,255,255,0.8)',
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
