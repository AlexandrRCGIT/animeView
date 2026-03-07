'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { EpisodeGrid } from './EpisodeGrid';
import type { DBTranslation, EpisodesInfo } from '@/lib/db/anime';
import type { WatchProgressData } from './PlayerTabs';

interface KodikPlayerProps {
  shikimoriId: number;
  userId: string | null;
  translations: DBTranslation[];
  episodesInfo: EpisodesInfo | null;
  animeTitle: string;
  initialProgress?: WatchProgressData | null;
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

function buildTranslationUrl(translation: DBTranslation | null): string | null {
  if (!translation) return null;
  const raw = translation.link;
  const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
  try {
    const url = new URL(absolute);
    if (!url.searchParams.get('quality')) url.searchParams.set('quality', '720p');
    return url.toString();
  } catch {
    return absolute;
  }
}

export function KodikPlayer({ shikimoriId, userId, translations, episodesInfo, animeTitle, initialProgress }: KodikPlayerProps) {

  // ── Озвучка: localStorage → последняя из БД → первая в списке ────────────────
  const [activeTranslation, setActiveTranslation] = useState<DBTranslation | null>(() => {
    try {
      const savedId = localStorage.getItem(`tl_pref_${shikimoriId}`);
      console.log('[KodikPlayer] init | localStorage tl_pref:', savedId, '| initialProgress.translation_id:', initialProgress?.translation_id, '| translations[0]:', translations[0]?.translation_id, translations[0]?.translation_title);
      if (savedId) {
        const found = translations.find(t => t.translation_id === Number(savedId));
        if (found) { console.log('[KodikPlayer] init → from localStorage:', found.translation_id, found.translation_title); return found; }
      }
    } catch {}
    if (initialProgress?.translation_id) {
      const found = translations.find(t => t.translation_id === initialProgress.translation_id);
      if (found) { console.log('[KodikPlayer] init → from initialProgress:', found.translation_id, found.translation_title); return found; }
    }
    console.log('[KodikPlayer] init → fallback translations[0]:', translations[0]?.translation_id, translations[0]?.translation_title);
    return translations[0] ?? null;
  });

  // ── Текущий эпизод ────────────────────────────────────────────────────────────
  const firstSeason = normalizeSeasonStart(episodesInfo);

  const [currentSeason, setCurrentSeason] = useState(() => {
    if (initialProgress?.season) {
      const s = Number(initialProgress.season);
      if (hasEpisode(episodesInfo, s, Number(initialProgress.episode ?? 1))) return s;
    }
    return firstSeason;
  });

  const [currentEpisode, setCurrentEpisode] = useState(() => {
    if (initialProgress?.season && initialProgress?.episode) {
      const s = Number(initialProgress.season);
      const e = Number(initialProgress.episode);
      if (hasEpisode(episodesInfo, s, e)) return e;
    }
    return 1;
  });

  // ── Живой прогресс для EpisodeGrid ───────────────────────────────────────────
  const [liveProgress, setLiveProgress] = useState<WatchProgressData | null>(
    initialProgress ?? null,
  );

  // Ref для activeTranslation — всегда актуален без пересоздания saveProgress
  const activeTranslationRef = useRef(activeTranslation);
  useEffect(() => { activeTranslationRef.current = activeTranslation; }, [activeTranslation]);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isInitialMountRef = useRef(true);
  const resumeSecondsRef = useRef<number | null>(
    !initialProgress?.is_completed && (initialProgress?.progress_seconds ?? 0) > 5
      ? initialProgress!.progress_seconds
      : null,
  );
  const durationRef = useRef<number | null>(null);
  const lastTimeFlushAtRef = useRef<number>(0);

  // URL перезагружается только при смене озвучки, НЕ при смене серии
  const translationUrl = buildTranslationUrl(activeTranslation);

  // ── postMessage хелпер ────────────────────────────────────────────────────────
  function sendToPlayer(value: object) {
    iframeRef.current?.contentWindow?.postMessage({ key: 'kodik_player_api', value }, '*');
  }

  // ── Сохранение прогресса ─────────────────────────────────────────────────────
  const saveProgress = useCallback(async ({
    progressSeconds = null,
    durationSeconds = null,
    markCompleted = false,
  }: SaveProgressInput = {}) => {
    if (!userId) return;

    const tl = activeTranslationRef.current;
    const payload = {
      shikimoriId,
      season: currentSeason,
      episode: currentEpisode,
      translationId: tl?.translation_id ?? null,
      translationTitle: tl?.translation_title ?? null,
      progressSeconds,
      durationSeconds,
      markCompleted,
    };
    console.log('[KodikPlayer] saveProgress →', payload);

    try {
      await fetch('/api/watch-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}
  }, [userId, shikimoriId, currentSeason, currentEpisode]);

  // При смене серии — записываем точку входа.
  // Пропускаем первый рендер: не нужно писать в историю просто за заход на страницу.
  // Смена озвучки сохраняется отдельно в switchTranslation.
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (!userId) return;
    durationRef.current = null;
    lastTimeFlushAtRef.current = Date.now();
    void saveProgress({ progressSeconds: null, durationSeconds: null, markCompleted: false });
  }, [userId, currentSeason, currentEpisode, saveProgress]);

  // ── Обработчик сообщений от плеера ───────────────────────────────────────────
  useEffect(() => {
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

      if (payload.key === 'kodik_player_current_episode') {
        const val = payload.value as { translation?: { id?: number } } | null;
        const tlId = val?.translation?.id;
        if (tlId) {
          const found = translations.find(t => t.translation_id === tlId);
          if (found) {
            activeTranslationRef.current = found;
            try { localStorage.setItem(`tl_pref_${shikimoriId}`, String(found.translation_id)); } catch {}
            void saveProgress({ progressSeconds: null, durationSeconds: null, markCompleted: false });
          }
        }
        return;
      }

      if (payload.key === 'kodik_player_duration_update') {
        durationRef.current = parseNumber(payload.value);
        return;
      }

      if (!userId) return;

      if (payload.key === 'kodik_player_time_update') {
        const seconds = parseNumber(payload.value);
        if (seconds === null || seconds < 0) return;
        const now = Date.now();
        if (now - lastTimeFlushAtRef.current < 12000) return;
        lastTimeFlushAtRef.current = now;
        void saveProgress({ progressSeconds: seconds, durationSeconds: durationRef.current });
        return;
      }

      if (payload.key === 'kodik_player_video_ended') {
        const duration = durationRef.current;
        void saveProgress({ progressSeconds: duration, durationSeconds: duration, markCompleted: true });
        setLiveProgress(prev => prev ? { ...prev, is_completed: true } : null);
      }
    }

    window.addEventListener('message', onPlayerMessage);
    return () => window.removeEventListener('message', onPlayerMessage);
  }, [userId, saveProgress, translations, shikimoriId]);

  // ── Загрузка iframe ───────────────────────────────────────────────────────────
  // Iframe загружается с базовым URL озвучки, затем через postMessage переключаем
  // на нужный эпизод и восстанавливаем позицию.
  function handleIframeLoad() {
    console.log('[KodikPlayer] handleIframeLoad → activeTranslation:', activeTranslation?.translation_id, activeTranslation?.translation_title, '| season:', currentSeason, '| episode:', currentEpisode);
    const target = iframeRef.current?.contentWindow;
    if (!target) return;

    // Переключаем на нужный эпизод (плеер по умолчанию загружает первый)
    setTimeout(() => {
      target.postMessage(
        { key: 'kodik_player_api', value: { method: 'change_episode', season: currentSeason, episode: currentEpisode } },
        '*',
      );

      // Восстанавливаем позицию после смены эпизода
      const resumeSeconds = resumeSecondsRef.current;
      if (resumeSeconds && resumeSeconds > 5) {
        setTimeout(() => {
          target.postMessage(
            { key: 'kodik_player_api', value: { method: 'seek', seconds: Math.floor(resumeSeconds) } },
            '*',
          );
          resumeSecondsRef.current = null;
        }, 400);
      }
    }, 300);
  }

  // ── Смена озвучки — перезагружает iframe (key меняется) ──────────────────────
  function switchTranslation(t: DBTranslation) {
    console.log('[KodikPlayer] switchTranslation →', { id: t.translation_id, title: t.translation_title });
    resumeSecondsRef.current = null;
    // Обновляем ref до setState, чтобы saveProgress взял новое значение
    activeTranslationRef.current = t;
    setActiveTranslation(t);
    try { localStorage.setItem(`tl_pref_${shikimoriId}`, String(t.translation_id)); } catch {}
    // Сохраняем выбранную озвучку в БД сразу
    if (userId) {
      void saveProgress({ progressSeconds: null, durationSeconds: null, markCompleted: false });
    }
  }

  // ── Смена серии — postMessage без перезагрузки iframe ────────────────────────
  function handleEpisodeSelect(season: number, episode: number) {
    resumeSecondsRef.current = null;
    setCurrentSeason(season);
    setCurrentEpisode(episode);

    // Переключаем эпизод через API плеера
    sendToPlayer({ method: 'change_episode', season, episode });

    // Обновляем живой прогресс немедленно
    setLiveProgress(prev =>
      prev
        ? { ...prev, season, episode, is_completed: false, progress_seconds: null }
        : {
            season, episode, is_completed: false, progress_seconds: null,
            duration_seconds: null,
            translation_id: activeTranslation?.translation_id ?? null,
            translation_title: activeTranslation?.translation_title ?? null,
          },
    );
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

      {/* Плеер — key меняется только при смене озвучки, НЕ при смене серии */}
      {translationUrl && (
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '16/9',
          borderRadius: 16, overflow: 'hidden',
          background: 'rgba(0,0,0,0.6)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <iframe
            ref={iframeRef}
            key={activeTranslation?.translation_id ?? 'player'}
            src={translationUrl}
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
            watchProgress={liveProgress}
          />
        </div>
      )}
    </div>
  );
}
