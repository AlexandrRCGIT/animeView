'use client';

import { useState, useRef, useEffect } from 'react';
import { EpisodeGrid } from './EpisodeGrid';
import type { DBTranslation, EpisodesInfo } from '@/lib/db/anime';

interface KodikPlayerProps {
  translations: DBTranslation[];
  episodesInfo: EpisodesInfo | null;
  animeTitle: string;
}

export function KodikPlayer({ translations, episodesInfo, animeTitle }: KodikPlayerProps) {
  const [activeTranslation, setActiveTranslation] = useState<DBTranslation | null>(
    translations[0] ?? null
  );

  const firstSeason = episodesInfo ? Number(Object.keys(episodesInfo).sort()[0] ?? 1) : 1;
  const [currentSeason, setCurrentSeason] = useState(firstSeason);
  const [currentEpisode, setCurrentEpisode] = useState(1);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Вычислить URL для воспроизведения
  function getIframeUrl(
    translation: DBTranslation | null,
    season: number,
    episode: number
  ): string | null {
    if (!translation) return null;
    const epLink = translation.seasons?.[String(season)]?.episodes?.[String(episode)];
    if (epLink) return epLink.startsWith('//') ? `https:${epLink}` : epLink;
    // Fallback: базовый URL перевода
    return translation.link.startsWith('//') ? `https:${translation.link}` : translation.link;
  }

  const iframeUrl = getIframeUrl(activeTranslation, currentSeason, currentEpisode);

  // При смене перевода — остаёмся на том же эпизоде
  function switchTranslation(t: DBTranslation) {
    setActiveTranslation(t);
  }

  // При выборе эпизода из EpisodeGrid — меняем iframe src
  function handleEpisodeSelect(season: number, episode: number) {
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    // Если iframe уже загружен — можно послать postMessage вместо перезагрузки
    // (но смена src надёжнее при смене сезона)
  }

  if (!translations.length) {
    return (
      <div style={{
        borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)',
        padding: '40px 24px', textAlign: 'center',
        color: 'rgba(255,255,255,0.25)', fontSize: 14,
      }}>
        Видео для «{animeTitle}» не найдено.
      </div>
    );
  }

  const hasEpisodes = episodesInfo && Object.keys(episodesInfo).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Выбор озвучки */}
      {translations.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {translations.map(t => {
            const isActive = t.translation_id === activeTranslation?.translation_id;
            return (
              <button
                key={t.translation_id}
                onClick={() => switchTranslation(t)}
                style={{
                  padding: '5px 14px', borderRadius: 8,
                  fontSize: 12, fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderColor: isActive ? '#6C3CE1' : 'rgba(255,255,255,0.1)',
                  background: isActive ? '#6C3CE1' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {t.translation_type === 'voice' ? '🎙 ' : '📝 '}
                {t.translation_title}
              </button>
            );
          })}
        </div>
      )}

      {/* Плеер */}
      {iframeUrl && (
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '16/9',
          borderRadius: 16, overflow: 'hidden',
          background: 'rgba(0,0,0,0.6)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <iframe
            ref={iframeRef}
            key={iframeUrl} // перезагружает плеер при смене серии
            src={iframeUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
            title={`Плеер: ${animeTitle}`}
          />
        </div>
      )}

      {/* Сетка эпизодов */}
      {hasEpisodes && (
        <div style={{ marginTop: 8 }}>
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            marginBottom: 12, letterSpacing: '-0.01em',
          }}>
            Список серий
          </h3>
          <EpisodeGrid
            episodesInfo={episodesInfo!}
            translationSeasons={activeTranslation?.seasons ?? null}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
            onEpisodeSelect={handleEpisodeSelect}
          />
        </div>
      )}
    </div>
  );
}
