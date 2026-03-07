'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { EpisodeGrid } from './EpisodeGrid';
import type { DBTranslation, EpisodesInfo } from '@/lib/db/anime';

interface KodikPlayerProps {
  shikimoriId: number;
  userId: string | null;
  translations: DBTranslation[];
  episodesInfo: EpisodesInfo | null;
  animeTitle: string;
}

interface SaveProgressInput {
  progressSeconds?: number | null;
  durationSeconds?: number | null;
  markCompleted?: boolean;
}

function normalizeSeasonStart(episodesInfo: EpisodesInfo | null): number {
  if (!episodesInfo) return 1;
  const seasons = Object.keys(episodesInfo)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!seasons.length) return 1;
  if (seasons.includes(1)) return 1;
  const nonSpecial = seasons.filter((s) => s > 0);
  return nonSpecial[0] ?? seasons[0] ?? 1;
}

function hasEpisode(episodesInfo: EpisodesInfo | null, season: number, episode: number): boolean {
  if (!episodesInfo) return false;
  return Boolean(episodesInfo[String(season)]?.[String(episode)]);
}

export function KodikPlayer({ shikimoriId, userId, translations, episodesInfo, animeTitle }: KodikPlayerProps) {
  const [activeTranslation, setActiveTranslation] = useState<DBTranslation | null>(
    translations[0] ?? null
  );
  const [isRestoring, setIsRestoring] = useState(Boolean(userId));

  const firstSeason = normalizeSeasonStart(episodesInfo);
  const [currentSeason, setCurrentSeason] = useState(firstSeason);
  const [currentEpisode, setCurrentEpisode] = useState(1);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const resumeSecondsRef = useRef<number | null>(null);
  const durationRef = useRef<number | null>(null);
  const lastTimeFlushAtRef = useRef<number>(0);

  useEffect(() => {
    if (!activeTranslation && translations[0]) {
      setActiveTranslation(translations[0]);
      return;
    }

    if (activeTranslation && !translations.some((t) => t.translation_id === activeTranslation.translation_id)) {
      setActiveTranslation(translations[0] ?? null);
    }
  }, [translations, activeTranslation]);

  // Вычислить URL для воспроизведения
  function getIframeUrl(
    translation: DBTranslation | null,
    season: number,
    episode: number
  ): string | null {
    if (!translation) return null;

    const withPreferredQuality = (raw: string): string => {
      const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
      try {
        const url = new URL(absolute);
        // Best-effort: Kodik обычно понимает quality в query.
        // Если качество недоступно, плеер сам выберет максимально возможное.
        if (!url.searchParams.get('quality')) {
          url.searchParams.set('quality', '720p');
        }
        return url.toString();
      } catch {
        return absolute;
      }
    };

    const epLink = translation.seasons?.[String(season)]?.episodes?.[String(episode)];
    if (epLink) return withPreferredQuality(epLink);
    // Fallback: базовый URL перевода
    return withPreferredQuality(translation.link);
  }

  const iframeUrl = getIframeUrl(activeTranslation, currentSeason, currentEpisode);

  const saveProgress = useCallback(async ({
    progressSeconds = null,
    durationSeconds = null,
    markCompleted = false,
  }: SaveProgressInput = {}) => {
    if (!userId) return;

    try {
      await fetch('/api/watch-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shikimoriId,
          season: currentSeason,
          episode: currentEpisode,
          translationId: activeTranslation?.translation_id ?? null,
          translationTitle: activeTranslation?.translation_title ?? null,
          progressSeconds,
          durationSeconds,
          markCompleted,
        }),
      });
    } catch {
      // История не должна ломать просмотр при сетевой ошибке.
    }
  }, [userId, shikimoriId, currentSeason, currentEpisode, activeTranslation]);

  useEffect(() => {
    let canceled = false;

    async function restoreProgress() {
      if (!userId) {
        setIsRestoring(false);
        return;
      }

      setIsRestoring(true);
      try {
        const response = await fetch(`/api/watch-progress?shikimoriId=${shikimoriId}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const json = await response.json() as {
          ok?: boolean;
          progress?: {
            season?: number | null;
            episode?: number | null;
            translation_id?: number | null;
            progress_seconds?: number | null;
            is_completed?: boolean;
          } | null;
        };

        if (!json.ok || !json.progress || canceled) return;

        const savedSeason = Number(json.progress.season ?? 1);
        const savedEpisode = Number(json.progress.episode ?? 1);
        if (hasEpisode(episodesInfo, savedSeason, savedEpisode)) {
          setCurrentSeason(savedSeason);
          setCurrentEpisode(savedEpisode);
        }

        const savedTranslationId = Number(json.progress.translation_id ?? 0);
        if (savedTranslationId) {
          const matchingTranslation = translations.find((t) => t.translation_id === savedTranslationId);
          if (matchingTranslation) {
            setActiveTranslation(matchingTranslation);
          }
        }

        const savedSeconds = Number(json.progress.progress_seconds ?? 0);
        const isCompleted = Boolean(json.progress.is_completed);
        if (!isCompleted && Number.isFinite(savedSeconds) && savedSeconds > 5) {
          resumeSecondsRef.current = savedSeconds;
        }
      } finally {
        if (!canceled) setIsRestoring(false);
      }
    }

    void restoreProgress();

    return () => {
      canceled = true;
    };
  }, [userId, shikimoriId, episodesInfo, translations]);

  // Если пользователь открыл тайтл или сменил серию — сразу запоминаем точку входа.
  useEffect(() => {
    if (!userId || isRestoring) return;
    durationRef.current = null;
    lastTimeFlushAtRef.current = Date.now();
    void saveProgress({ progressSeconds: null, durationSeconds: null, markCompleted: false });
  }, [userId, isRestoring, currentSeason, currentEpisode, activeTranslation?.translation_id, saveProgress]);

  useEffect(() => {
    if (!userId) return;

    function parseNumber(value: unknown): number | null {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const next = Number(value);
      return Number.isFinite(next) ? next : null;
    }

    function onPlayerMessage(event: MessageEvent) {
      const iframeWin = iframeRef.current?.contentWindow;
      if (iframeWin && event.source !== iframeWin) return;

      const payload = event.data as { key?: string; value?: unknown } | null;
      if (!payload?.key) return;

      if (payload.key === 'kodik_player_duration_update') {
        durationRef.current = parseNumber(payload.value);
        return;
      }

      if (payload.key === 'kodik_player_time_update') {
        const seconds = parseNumber(payload.value);
        if (seconds === null || seconds < 0) return;

        const now = Date.now();
        if (now - lastTimeFlushAtRef.current < 12000) return;
        lastTimeFlushAtRef.current = now;

        void saveProgress({
          progressSeconds: seconds,
          durationSeconds: durationRef.current,
          markCompleted: false,
        });
        return;
      }

      if (payload.key === 'kodik_player_video_ended') {
        const duration = durationRef.current;
        void saveProgress({
          progressSeconds: duration,
          durationSeconds: duration,
          markCompleted: true,
        });
      }
    }

    window.addEventListener('message', onPlayerMessage);
    return () => window.removeEventListener('message', onPlayerMessage);
  }, [userId, saveProgress]);

  function handleIframeLoad() {
    const resumeSeconds = resumeSecondsRef.current;
    if (!resumeSeconds || resumeSeconds < 5) return;

    const target = iframeRef.current?.contentWindow;
    if (!target) return;

    // Небольшая задержка, чтобы плеер инициализировался перед seek.
    setTimeout(() => {
      target.postMessage(
        { key: 'kodik_player_api', value: { method: 'seek', seconds: Math.floor(resumeSeconds) } },
        '*',
      );
      resumeSecondsRef.current = null;
    }, 450);
  }

  // При смене перевода — остаёмся на том же эпизоде
  function switchTranslation(t: DBTranslation) {
    resumeSecondsRef.current = null;
    setActiveTranslation(t);
  }

  // При выборе эпизода из EpisodeGrid — меняем iframe src
  function handleEpisodeSelect(season: number, episode: number) {
    resumeSecondsRef.current = null;
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
            onLoad={handleIframeLoad}
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
