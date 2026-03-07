'use client';

import { useState, useRef, useEffect } from 'react';

interface RutubePlayerProps {
  rutubeEpisodes: Record<string, Record<string, string>>;
  userId: string | null;
  shikimoriId: number;
  animeTitle: string;
}

function buildEmbedUrl(videoId: string): string {
  return `https://rutube.ru/play/embed/${videoId}`;
}

export function RutubePlayer({ rutubeEpisodes, userId: _userId, shikimoriId: _shikimoriId, animeTitle }: RutubePlayerProps) {
  // Сортируем сезоны и эпизоды
  const seasons = Object.keys(rutubeEpisodes)
    .map(Number)
    .sort((a, b) => a - b);

  const [activeSeason, setActiveSeason] = useState(seasons[0] ?? 1);

  const episodes = Object.keys(rutubeEpisodes[String(activeSeason)] ?? {})
    .map(Number)
    .sort((a, b) => a - b);

  const [activeEpisode, setActiveEpisode] = useState(episodes[0] ?? 1);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const currentVideoId = rutubeEpisodes[String(activeSeason)]?.[String(activeEpisode)] ?? null;

  // При смене сезона — сброс на первую серию
  useEffect(() => {
    const eps = Object.keys(rutubeEpisodes[String(activeSeason)] ?? {})
      .map(Number)
      .sort((a, b) => a - b);
    setActiveEpisode(eps[0] ?? 1);
  }, [activeSeason, rutubeEpisodes]);

  function handleEpisodeSelect(season: number, episode: number) {
    setActiveSeason(season);
    setActiveEpisode(episode);
  }

  // postMessage: слушаем окончание серии
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (iframeRef.current?.contentWindow !== event.source) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'player:playComplete') {
          // Авто-переход на следующую серию
          const currentEps = Object.keys(rutubeEpisodes[String(activeSeason)] ?? {})
            .map(Number)
            .sort((a, b) => a - b);
          const idx = currentEps.indexOf(activeEpisode);
          if (idx !== -1 && idx < currentEps.length - 1) {
            setActiveEpisode(currentEps[idx + 1]);
          }
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeSeason, activeEpisode, rutubeEpisodes]);

  const isSingleEpisode = seasons.length === 1 && episodes.length === 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Плеер */}
      {currentVideoId ? (
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '16/9',
          borderRadius: 16, overflow: 'hidden',
          background: 'rgba(0,0,0,0.6)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <iframe
            ref={iframeRef}
            key={currentVideoId}
            src={buildEmbedUrl(currentVideoId)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
            title={`Rutube: ${animeTitle}`}
          />
        </div>
      ) : (
        <div style={{
          borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)',
          padding: '40px 24px', textAlign: 'center',
          color: 'rgba(255,255,255,0.25)', fontSize: 14,
        }}>
          Серия не найдена
        </div>
      )}

      {/* Навигация по сезонам и сериям */}
      {!isSingleEpisode && (
        <div style={{ marginTop: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 12, letterSpacing: '-0.01em' }}>
            Список серий
          </h3>

          {/* Сезоны */}
          {seasons.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {seasons.map(s => (
                <button
                  key={s}
                  onClick={() => setActiveSeason(s)}
                  style={{
                    flexShrink: 0, padding: '6px 18px', borderRadius: 20,
                    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
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

          {/* Серии */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            maxHeight: 200, overflowY: 'auto',
          }}>
            {Object.keys(rutubeEpisodes[String(activeSeason)] ?? {})
              .map(Number)
              .sort((a, b) => a - b)
              .map(ep => {
                const isActive = activeSeason === activeSeason && ep === activeEpisode;
                return (
                  <button
                    key={ep}
                    onClick={() => handleEpisodeSelect(activeSeason, ep)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: '1px solid',
                      cursor: 'pointer', transition: 'all 0.15s',
                      borderColor: isActive ? '#6C3CE1' : 'rgba(255,255,255,0.1)',
                      background: isActive ? '#6C3CE1' : 'rgba(255,255,255,0.04)',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {ep}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
