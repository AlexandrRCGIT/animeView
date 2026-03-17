'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EpisodeGrid } from './EpisodeGrid';
import type { DBTranslation, EpisodesInfo } from '@/lib/db/anime';
import type { WatchProgressData } from './PlayerTabs';
import {
  normalizeWatchTogetherState,
  type WatchTogetherState,
} from '@/lib/watch-together/types';

interface KodikPlayerProps {
  shikimoriId: number;
  userId: string | null;
  translations: DBTranslation[];
  episodesInfo: EpisodesInfo | null;
  animeTitle: string;
  initialProgress?: WatchProgressData | null;
  sharedEpisode?: number | null;
  sharedSeason?: number | null;
  watchTogetherEnabled?: boolean;
  watchTogetherCanControl?: boolean;
  watchTogetherRemoteState?: WatchTogetherState | null;
  onWatchTogetherStateChange?: (state: WatchTogetherState) => void;
  watchTogetherSlot?: React.ReactNode;
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

function resolveSharedTarget(
  episodesInfo: EpisodesInfo | null,
  sharedEpisode: number | null | undefined,
  sharedSeason: number | null | undefined,
): { season: number; episode: number } | null {
  const episode = Math.floor(Number(sharedEpisode ?? 0));
  if (!episodesInfo || !Number.isFinite(episode) || episode <= 0) return null;

  const season = Math.floor(Number(sharedSeason ?? 0));
  if (Number.isFinite(season) && season > 0 && hasEpisode(episodesInfo, season, episode)) {
    return { season, episode };
  }

  const seasons = Object.keys(episodesInfo)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  for (const s of seasons) {
    if (hasEpisode(episodesInfo, s, episode)) return { season: s, episode };
  }

  return null;
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
  shikimoriId,
  userId,
  translations,
  episodesInfo,
  animeTitle,
  initialProgress,
  sharedEpisode = null,
  sharedSeason = null,
  watchTogetherEnabled = false,
  watchTogetherCanControl = true,
  watchTogetherRemoteState = null,
  onWatchTogetherStateChange,
  watchTogetherSlot = null,
}: KodikPlayerProps) {
  const sorted = sortTranslations(translations);
  const sharedTarget = resolveSharedTarget(episodesInfo, sharedEpisode, sharedSeason);
  const [shareState, setShareState] = useState<'idle' | 'done' | 'error'>('idle');

  const [activeTranslation, setActiveTranslation] = useState<DBTranslation | null>(() =>
    pickInitialTranslation(translations, shikimoriId, initialProgress)
  );

  const firstSeason = normalizeSeasonStart(episodesInfo);

  const [currentSeason, setCurrentSeason] = useState(() => {
    if (sharedTarget) return sharedTarget.season;
    if (initialProgress?.season) {
      const s = Number(initialProgress.season);
      if (hasEpisode(episodesInfo, s, Number(initialProgress.episode ?? 1))) return s;
    }
    return firstSeason;
  });

  const [currentEpisode, setCurrentEpisode] = useState(() => {
    if (sharedTarget) return sharedTarget.episode;
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
  const initialResumeProgress = initialProgress?.progress_seconds ?? null;
  const initialResumeSeconds =
    !sharedTarget && !initialProgress?.is_completed && (initialResumeProgress ?? 0) > 5
      ? initialResumeProgress
      : null;
  const resumeSecondsRef = useRef<number | null>(
    initialResumeSeconds,
  );
  const durationRef = useRef<number | null>(null);
  const lastTimeFlushAtRef = useRef<number>(0);
  const lastKnownTimeRef = useRef<number>(initialResumeSeconds ?? 0);
  const pausedRef = useRef<boolean>(true);
  const lastWatchTogetherEmitAtRef = useRef<number>(0);
  const lastRemoteStateSignatureRef = useRef<string>('');
  const hadWatchTogetherControlRef = useRef<boolean>(false);

  const translationUrl = buildTranslationUrl(activeTranslation);
  const controlsLocked = watchTogetherEnabled && !watchTogetherCanControl;

  const sendToPlayer = useCallback((value: object) => {
    iframeRef.current?.contentWindow?.postMessage({ key: 'kodik_player_api', value }, '*');
  }, []);

  const emitWatchTogetherState = useCallback((partial?: Partial<WatchTogetherState>, force = false) => {
    if (!watchTogetherEnabled || !onWatchTogetherStateChange) return;
    if (!watchTogetherCanControl && !force) return;

    const next = normalizeWatchTogetherState({
      season: currentSeason,
      episode: currentEpisode,
      translationId: activeTranslation?.translation_id ?? null,
      translationTitle: activeTranslation?.translation_title ?? null,
      currentTime: lastKnownTimeRef.current ?? 0,
      paused: pausedRef.current,
      updatedAt: Date.now(),
      ...partial,
    });

    onWatchTogetherStateChange(next);
  }, [
    watchTogetherEnabled,
    watchTogetherCanControl,
    onWatchTogetherStateChange,
    currentSeason,
    currentEpisode,
    activeTranslation,
  ]);

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

      if (payload.key === 'kodik_player_time_update') {
        const seconds = parseNumber(payload.value);
        if (seconds === null || seconds < 0) return;
        lastKnownTimeRef.current = seconds;

        if (watchTogetherEnabled && watchTogetherCanControl) {
          const now = Date.now();
          if (now - lastWatchTogetherEmitAtRef.current >= 2500) {
            lastWatchTogetherEmitAtRef.current = now;
            emitWatchTogetherState({ currentTime: seconds });
          }
        }

        if (!userId) return;
        const nowForSave = Date.now();
        if (nowForSave - lastTimeFlushAtRef.current < 12000) return;
        lastTimeFlushAtRef.current = nowForSave;
        void saveProgress({ progressSeconds: seconds, durationSeconds: durationRef.current });
        return;
      }

      if (payload.key === 'kodik_player_play' || payload.key === 'kodik_player_playing') {
        pausedRef.current = false;
        if (watchTogetherEnabled && watchTogetherCanControl) {
          emitWatchTogetherState({ paused: false });
        }
        return;
      }

      if (payload.key === 'kodik_player_pause' || payload.key === 'kodik_player_paused') {
        pausedRef.current = true;
        if (watchTogetherEnabled && watchTogetherCanControl) {
          emitWatchTogetherState({ paused: true });
        }
        return;
      }

      if (payload.key === 'kodik_player_seek' || payload.key === 'kodik_player_seeked') {
        const seconds = parseNumber(payload.value);
        if (seconds !== null && seconds >= 0) {
          lastKnownTimeRef.current = seconds;
          if (watchTogetherEnabled && watchTogetherCanControl) {
            emitWatchTogetherState({ currentTime: seconds });
          }
        }
      }

      if (!userId) return;

      if (payload.key === 'kodik_player_video_ended') {
        const dur = durationRef.current;
        if (dur !== null && Number.isFinite(dur)) {
          lastKnownTimeRef.current = dur;
        }
        pausedRef.current = true;
        if (watchTogetherEnabled && watchTogetherCanControl) {
          emitWatchTogetherState({ currentTime: dur ?? lastKnownTimeRef.current, paused: true });
        }
        void saveProgress({ progressSeconds: dur, durationSeconds: dur, markCompleted: true });
        setLiveProgress(prev => prev ? { ...prev, is_completed: true } : null);
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [
    userId,
    saveProgress,
    watchTogetherEnabled,
    watchTogetherCanControl,
    emitWatchTogetherState,
  ]);

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
  const switchTranslation = useCallback((
    t: DBTranslation,
    options?: { sync?: boolean },
  ) => {
    const shouldSync = options?.sync !== false;
    if (controlsLocked && shouldSync) return;

    // При смене озвучки сохраняем последнюю известную позицию — возобновим после перезагрузки iframe
    const lastPos = liveProgress?.progress_seconds;
    resumeSecondsRef.current = lastPos && lastPos > 5 ? lastPos : null;
    activeTranslationRef.current = t;
    setActiveTranslation(t);
    try { localStorage.setItem(`tl_pref_${shikimoriId}`, String(t.translation_id)); } catch {}
    if (userId) void saveProgress();
    if (shouldSync) {
      emitWatchTogetherState({
        translationId: t.translation_id,
        translationTitle: t.translation_title,
      });
    }
  }, [
    controlsLocked,
    liveProgress,
    shikimoriId,
    userId,
    saveProgress,
    emitWatchTogetherState,
  ]);

  // ── Смена серии ───────────────────────────────────────────────────────────────
  const handleEpisodeSelect = useCallback((
    season: number,
    episode: number,
    options?: { sync?: boolean },
  ) => {
    const shouldSync = options?.sync !== false;
    if (controlsLocked && shouldSync) return;

    resumeSecondsRef.current = null;
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    sendToPlayer({ method: 'change_episode', season, episode });
    lastKnownTimeRef.current = 0;
    pausedRef.current = false;
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
    if (shouldSync) {
      emitWatchTogetherState({
        season,
        episode,
        currentTime: 0,
        paused: false,
      });
    }
  }, [
    controlsLocked,
    activeTranslation,
    emitWatchTogetherState,
    sendToPlayer,
  ]);

  const hasEpisodes = episodesInfo && Object.keys(episodesInfo).length > 0;

  useEffect(() => {
    if (!hasEpisodes) return;
    const url = new URL(window.location.href);
    url.searchParams.set('episode', String(currentEpisode));

    const seasonCount = Object.keys(episodesInfo ?? {}).length;
    if (seasonCount > 1) {
      url.searchParams.set('season', String(currentSeason));
    } else {
      url.searchParams.delete('season');
    }

    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [hasEpisodes, episodesInfo, currentSeason, currentEpisode]);

  async function shareCurrentEpisode() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('episode', String(currentEpisode));
      const seasonCount = Object.keys(episodesInfo ?? {}).length;
      if (seasonCount > 1) {
        url.searchParams.set('season', String(currentSeason));
      } else {
        url.searchParams.delete('season');
      }
      const shareUrl = url.toString();

      await navigator.clipboard.writeText(shareUrl);
      setShareState('done');
      window.setTimeout(() => setShareState('idle'), 1500);
    } catch {
      setShareState('error');
      window.setTimeout(() => setShareState('idle'), 1500);
    }
  }

  useEffect(() => {
    const canControlRoom = watchTogetherEnabled && watchTogetherCanControl;
    if (canControlRoom && !hadWatchTogetherControlRef.current) {
      emitWatchTogetherState(undefined, true);
    }
    hadWatchTogetherControlRef.current = canControlRoom;
  }, [watchTogetherEnabled, watchTogetherCanControl, emitWatchTogetherState]);

  useEffect(() => {
    if (!watchTogetherEnabled || !watchTogetherRemoteState) return;

    const state = normalizeWatchTogetherState(watchTogetherRemoteState);
    const signature = [
      state.updatedAt,
      state.season,
      state.episode,
      state.translationId ?? 'n',
      Math.round(state.currentTime),
      state.paused ? 1 : 0,
    ].join(':');
    if (signature === lastRemoteStateSignatureRef.current) return;
    lastRemoteStateSignatureRef.current = signature;

    const targetTranslation =
      state.translationId !== null
        ? sorted.find((item) => item.translation_id === state.translationId) ?? null
        : null;

    const timer = window.setTimeout(() => {
      if (targetTranslation && activeTranslation?.translation_id !== targetTranslation.translation_id) {
        switchTranslation(targetTranslation, { sync: false });
      }

      if (hasEpisode(episodesInfo, state.season, state.episode)) {
        if (state.season !== currentSeason || state.episode !== currentEpisode) {
          handleEpisodeSelect(state.season, state.episode, { sync: false });
        }
      }

      lastKnownTimeRef.current = state.currentTime;
      pausedRef.current = state.paused;
      sendToPlayer({ method: 'seek', seconds: Math.floor(state.currentTime) });
      sendToPlayer({ method: state.paused ? 'pause' : 'play' });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [
    watchTogetherEnabled,
    watchTogetherRemoteState,
    sorted,
    activeTranslation,
    currentSeason,
    currentEpisode,
    episodesInfo,
    handleEpisodeSelect,
    switchTranslation,
    sendToPlayer,
  ]);

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
              disabled={controlsLocked}
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
                opacity: controlsLocked ? 0.65 : 1,
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
          {controlsLocked && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(8,8,14,0.18)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                pointerEvents: 'auto',
              }}
            >
              <span
                style={{
                  marginBottom: 12,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(8,8,14,0.82)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.78)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Управление у хоста комнаты
              </span>
            </div>
          )}
        </div>
      )}

      {/* Навигация по сериям + Поделиться */}
      {hasEpisodes && (() => {
        const { prev, next } = getNavEpisodes(episodesInfo, currentSeason, currentEpisode);
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              style={btnStyle(!prev || controlsLocked)}
              disabled={controlsLocked || !prev}
              onClick={() => prev && handleEpisodeSelect(prev.season, prev.episode)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              {label(prev, 'Начало')}
            </button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => { void shareCurrentEpisode(); }}
                disabled={controlsLocked}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '0 14px', height: 34, borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.78)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  opacity: controlsLocked ? 0.6 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
                </svg>
                {shareState === 'done'
                  ? 'Ссылка скопирована'
                  : shareState === 'error'
                    ? 'Не удалось скопировать'
                    : `Поделиться: серия ${currentEpisode}`}
              </button>

              {/* TODO: Watch Together временно отключён */}
            </div>
            <button
              style={btnStyle(!next || controlsLocked)}
              disabled={controlsLocked || !next}
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

      {watchTogetherSlot && (
        <div style={{ marginTop: hasEpisodes ? 4 : 10 }}>
          {watchTogetherSlot}
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
            translations={sorted}
            activeTranslation={activeTranslation}
            onTranslationChange={switchTranslation}
            controlsLocked={controlsLocked}
          />
        </div>
      )}
    </div>
  );
}
