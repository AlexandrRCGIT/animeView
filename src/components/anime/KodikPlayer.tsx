'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

// Популярные озвучки — показываются первыми
const RU_PRIORITY = [704, 734, 610, 609, 2550, 611];

function sortTranslations(list: DBTranslation[]): DBTranslation[] {
  return [...list].sort((a, b) => {
    const ai = RU_PRIORITY.indexOf(a.translation_id);
    const bi = RU_PRIORITY.indexOf(b.translation_id);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    if (a.translation_type === 'voice' && b.translation_type !== 'voice') return -1;
    if (b.translation_type === 'voice' && a.translation_type !== 'voice') return 1;
    return a.translation_title.localeCompare(b.translation_title, 'ru');
  });
}

function normalizeSeasonStart(episodesInfo: EpisodesInfo | null): number {
  if (!episodesInfo) return 1;
  const seasons = Object.keys(episodesInfo)
    .map(Number)
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!seasons.length) return 1;
  if (seasons.includes(1)) return 1;
  const nonSpecial = seasons.filter(s => s > 0);
  return nonSpecial[0] ?? seasons[0] ?? 1;
}

function getNavEpisodes(
  episodesInfo: EpisodesInfo | null,
  currentSeason: number,
  currentEpisode: number,
): {
  prev: { season: number; episode: number } | null;
  next: { season: number; episode: number } | null;
} {
  if (!episodesInfo) return { prev: null, next: null };

  const seasons = Object.keys(episodesInfo).map(Number).sort((a, b) => a - b);
  const eps = (s: number) => Object.keys(episodesInfo[String(s)] ?? {}).map(Number).sort((a, b) => a - b);

  const seasonIdx = seasons.indexOf(currentSeason);
  const currentEps = eps(currentSeason);
  const epIdx = currentEps.indexOf(currentEpisode);

  let prev: { season: number; episode: number } | null = null;
  if (epIdx > 0) {
    prev = { season: currentSeason, episode: currentEps[epIdx - 1] };
  } else if (seasonIdx > 0) {
    const prevSeason = seasons[seasonIdx - 1];
    const prevEps = eps(prevSeason);
    if (prevEps.length) prev = { season: prevSeason, episode: prevEps[prevEps.length - 1] };
  }

  let next: { season: number; episode: number } | null = null;
  if (epIdx < currentEps.length - 1) {
    next = { season: currentSeason, episode: currentEps[epIdx + 1] };
  } else if (seasonIdx < seasons.length - 1) {
    const nextSeason = seasons[seasonIdx + 1];
    const nextEps = eps(nextSeason);
    if (nextEps.length) next = { season: nextSeason, episode: nextEps[0] };
  }

  return { prev, next };
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

function pickInitialTranslation(
  translations: DBTranslation[],
  shikimoriId: number,
  initialProgress: WatchProgressData | null | undefined,
): DBTranslation | null {
  // 1. localStorage
  try {
    const savedId = localStorage.getItem(`tl_pref_${shikimoriId}`);
    if (savedId) {
      const found = translations.find(t => t.translation_id === Number(savedId));
      if (found) return found;
    }
  } catch {}
  // 2. история просмотра
  if (initialProgress?.translation_id) {
    const found = translations.find(t => t.translation_id === initialProgress.translation_id);
    if (found) return found;
  }
  // 3. первая в отсортированном списке
  return sortTranslations(translations)[0] ?? null;
}

export function KodikPlayer({
  shikimoriId, userId, translations, episodesInfo, animeTitle, initialProgress,
}: KodikPlayerProps) {
  const sorted = sortTranslations(translations);

  const [activeTranslation, setActiveTranslation] = useState<DBTranslation | null>(() =>
    pickInitialTranslation(translations, shikimoriId, initialProgress)
  );

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

  const [liveProgress, setLiveProgress] = useState<WatchProgressData | null>(
    initialProgress ?? null,
  );

  const activeTranslationRef = useRef(activeTranslation);
  useEffect(() => { activeTranslationRef.current = activeTranslation; }, [activeTranslation]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isInitialMountRef = useRef(true);
  const resumeSecondsRef = useRef<number | null>(
    !initialProgress?.is_completed && (initialProgress?.progress_seconds ?? 0) > 5
      ? initialProgress!.progress_seconds
      : null,
  );
  const durationRef = useRef<number | null>(null);
  const lastTimeFlushAtRef = useRef<number>(0);

  const translationUrl = buildTranslationUrl(activeTranslation);

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
    try {
      await fetch('/api/watch-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shikimoriId,
          season: currentSeason,
          episode: currentEpisode,
          translationId: tl?.translation_id ?? null,
          translationTitle: tl?.translation_title ?? null,
          progressSeconds,
          durationSeconds,
          markCompleted,
        }),
      });
    } catch {}
  }, [userId, shikimoriId, currentSeason, currentEpisode]);

  // Сохраняем при смене серии
  useEffect(() => {
    if (isInitialMountRef.current) { isInitialMountRef.current = false; return; }
    if (!userId) return;
    durationRef.current = null;
    lastTimeFlushAtRef.current = Date.now();
    void saveProgress();
  }, [userId, currentSeason, currentEpisode, saveProgress]);

  // ── postMessage от плеера ─────────────────────────────────────────────────────
  useEffect(() => {
    function parseNumber(v: unknown): number | null {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }

    function onMessage(event: MessageEvent) {
      const iframeWin = iframeRef.current?.contentWindow;
      if (iframeWin && event.source !== iframeWin) return;

      const payload = event.data as { key?: string; value?: unknown } | null;
      if (!payload?.key) return;

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
        const dur = durationRef.current;
        void saveProgress({ progressSeconds: dur, durationSeconds: dur, markCompleted: true });
        setLiveProgress(prev => prev ? { ...prev, is_completed: true } : null);
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [userId, saveProgress]);

  // ── Загрузка iframe ───────────────────────────────────────────────────────────
  function handleIframeLoad() {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    setTimeout(() => {
      target.postMessage(
        { key: 'kodik_player_api', value: { method: 'change_episode', season: currentSeason, episode: currentEpisode } },
        '*',
      );
      const resume = resumeSecondsRef.current;
      if (resume && resume > 5) {
        setTimeout(() => {
          target.postMessage(
            { key: 'kodik_player_api', value: { method: 'seek', seconds: Math.floor(resume) } },
            '*',
          );
          resumeSecondsRef.current = null;
        }, 400);
      }
    }, 300);
  }

  // ── Смена озвучки ─────────────────────────────────────────────────────────────
  function switchTranslation(t: DBTranslation) {
    // При смене озвучки сохраняем последнюю известную позицию — возобновим после перезагрузки iframe
    const lastPos = liveProgress?.progress_seconds;
    resumeSecondsRef.current = lastPos && lastPos > 5 ? lastPos : null;
    activeTranslationRef.current = t;
    setActiveTranslation(t);
    try { localStorage.setItem(`tl_pref_${shikimoriId}`, String(t.translation_id)); } catch {}
    if (userId) void saveProgress();
  }

  // ── Смена серии ───────────────────────────────────────────────────────────────
  function handleEpisodeSelect(season: number, episode: number) {
    resumeSecondsRef.current = null;
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    sendToPlayer({ method: 'change_episode', season, episode });
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

      {/* Выбор озвучки — только для фильмов (без сетки эпизодов) */}
      {!hasEpisodes && sorted.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
            Озвучка
          </span>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <select
              value={activeTranslation?.translation_id ?? ''}
              onChange={e => {
                const t = sorted.find(tr => tr.translation_id === Number(e.target.value));
                if (t) switchTranslation(t);
              }}
              style={{
                width: '100%', height: 38,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 13, fontWeight: 500,
                padding: '0 36px 0 14px',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              {sorted.map(t => (
                <option key={t.translation_id} value={t.translation_id} style={{ background: '#0e0e16', color: '#fff' }}>
                  {[704,734,610,609,2550,611].includes(t.translation_id) ? '★ ' : ''}
                  {t.translation_type === 'subtitles' ? '[субтитры] ' : ''}
                  {t.translation_title}
                </option>
              ))}
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      )}

      {/* Плеер */}
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

      {/* Навигация по сериям */}
      {hasEpisodes && (() => {
        const { prev, next } = getNavEpisodes(episodesInfo, currentSeason, currentEpisode);
        if (!prev && !next) return null;
        const btnStyle = (disabled: boolean): React.CSSProperties => ({
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 16px', height: 36, borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)',
          fontSize: 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
          pointerEvents: disabled ? 'none' : 'auto',
          transition: 'background 0.15s, color 0.15s',
          flexShrink: 0,
        });
        const label = (ep: { season: number; episode: number } | null, fallback: string) => {
          if (!ep) return fallback;
          const seasons = Object.keys(episodesInfo ?? {}).map(Number);
          const multi = seasons.length > 1;
          return multi && ep.season !== currentSeason
            ? `С${ep.season} · Серия ${ep.episode}`
            : `Серия ${ep.episode}`;
        };
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <button
              style={btnStyle(!prev)}
              onClick={() => prev && handleEpisodeSelect(prev.season, prev.episode)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              {label(prev, 'Начало')}
            </button>
            <button
              style={btnStyle(!next)}
              onClick={() => next && handleEpisodeSelect(next.season, next.episode)}
            >
              {label(next, 'Конец')}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        );
      })()}

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
            translations={sorted}
            activeTranslation={activeTranslation}
            onTranslationChange={switchTranslation}
          />
        </div>
      )}
    </div>
  );
}
