'use client';

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import type { AnilibriaEpisode, AnilibriaReleaseData } from '@/app/api/anilibria/episodes/route';

type Quality = '1080' | '720' | '480';

const QUALITY_LABELS: Record<Quality, string> = {
  '1080': '1080p',
  '720': '720p',
  '480': '480p',
};

function getUrl(ep: AnilibriaEpisode, quality: Quality): string | null {
  if (quality === '1080' && ep.hls_1080) return ep.hls_1080;
  if (quality === '720' && ep.hls_720) return ep.hls_720;
  if (quality === '480' && ep.hls_480) return ep.hls_480;
  return ep.hls_1080 ?? ep.hls_720 ?? ep.hls_480 ?? null;
}

function getBestQuality(ep: AnilibriaEpisode): Quality {
  if (ep.hls_1080) return '1080';
  if (ep.hls_720) return '720';
  return '480';
}

function getAvailableQualities(ep: AnilibriaEpisode): Quality[] {
  return (['1080', '720', '480'] as Quality[]).filter(q => !!getUrl(ep, q));
}

function loadSetting(key: string, def: boolean): boolean {
  if (typeof window === 'undefined') return def;
  try { const s = localStorage.getItem('player_' + key); return s !== null ? s === '1' : def; }
  catch { return def; }
}

const SkipButton = memo(function SkipButton({
  label, onSkip, delay = 15,
}: { label: string; onSkip: () => void; delay?: number }) {
  const [remaining, setRemaining] = useState(delay);
  const onSkipRef = useRef(onSkip);
  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(p => {
        if (p <= 1) { clearInterval(iv); setTimeout(() => onSkipRef.current(), 0); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [delay]);

  const progress = ((delay - remaining) / delay) * 100;

  return (
    <button onClick={onSkip} style={{
      position: 'relative', overflow: 'hidden',
      padding: '8px 16px', borderRadius: 8,
      background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)',
      color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
    }}>
      <span style={{ position: 'absolute', inset: 0, width: `${progress}%`, background: 'var(--accent)', opacity: 0.35, transition: 'width 0.95s linear', pointerEvents: 'none' }} />
      <span style={{ position: 'relative' }}>{label}</span>
      <span style={{ position: 'relative', minWidth: 18, textAlign: 'center', fontSize: 12, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{remaining}</span>
    </button>
  );
});

interface Props {
  anilibriaId: number;
  nextSeasonShikimoriId?: number | null;
  currentShikimoriId?: number;
  franchiseSeasons?: Array<{ label: string; episodes: number; shikimoriId: number }>;
}

export function ShakaAnilibriaPlayer({
  anilibriaId, nextSeasonShikimoriId, currentShikimoriId, franchiseSeasons,
}: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const uiContainerRef = useRef<HTMLDivElement>(null);
  const episodeListRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uiRef = useRef<any>(null);
  // Promise, которое резолвится когда player+UI полностью инициализированы
  const playerReadyRef = useRef<Promise<void>>(new Promise(() => { }));
  // Счётчик для отмены устаревших player.load() вызовов
  const loadIdRef = useRef(0);

  const [data, setData] = useState<AnilibriaReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [quality, setQuality] = useState<Quality>('720');
  const nextCardShownRef = useRef(false);

  const [showSkipOpening, setShowSkipOpening] = useState(false);
  const [showSkipEnding, setShowSkipEnding] = useState(false);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  // Рефы для актуальных значений в постоянных event-хэндлерах
  const autoSkipOpeningRef = useRef(false);
  const autoSkipEndingRef = useRef(false);
  const autoPlayRef = useRef(true);
  const autoSkippedRef = useRef(false);
  const switchEpisodeRef = useRef<(idx: number) => void>(() => { });

  // Рефы для текущего эпизода (обновляются синхронно перед load)
  const epRef = useRef<AnilibriaEpisode | null>(null);
  const releaseDataRef = useRef<AnilibriaReleaseData | null>(null);
  const currentEpIndexRef = useRef(0);

  // Читаем настройки из localStorage (общие с ArtPlayer)
  useEffect(() => {
    autoSkipOpeningRef.current = loadSetting('autoSkipOpening', false);
    autoSkipEndingRef.current = loadSetting('autoSkipEnding', false);
    autoPlayRef.current = loadSetting('autoPlay', true);
  }, []);

  // ── Сезонная структура ────────────────────────────────────────────────────
  const seasonStructure = useMemo(() => {
    if (!franchiseSeasons || franchiseSeasons.length <= 1 || !data) return null;
    const totalFranchise = franchiseSeasons.reduce((s, f) => s + f.episodes, 0);
    const totalAnilibria = data.episodes.length;
    if (totalFranchise === 0 || Math.abs(totalAnilibria - totalFranchise) / totalFranchise > 0.15) return null;
    let offset = 0;
    return franchiseSeasons.map(s => { const item = { ...s, startIdx: offset }; offset += s.episodes; return item; });
  }, [franchiseSeasons, data]);

  const [activeSeason, setActiveSeason] = useState(0);
  const seasonInitialized = useRef(false);

  useEffect(() => {
    if (!seasonStructure || currentShikimoriId == null || seasonInitialized.current) return;
    const idx = seasonStructure.findIndex(s => s.shikimoriId === currentShikimoriId);
    if (idx >= 0) { seasonInitialized.current = true; setActiveSeason(idx); setCurrentEpIndex(seasonStructure[idx].startIdx); }
  }, [seasonStructure]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seasonStructure) return;
    for (let i = 0; i < seasonStructure.length; i++) {
      const s = seasonStructure[i];
      if (currentEpIndex >= s.startIdx && currentEpIndex < s.startIdx + s.episodes) { setActiveSeason(i); return; }
    }
  }, [currentEpIndex, seasonStructure]);

  const visibleRange = useMemo(() => {
    if (!seasonStructure || !data) return null;
    const s = seasonStructure[activeSeason];
    if (!s) return null;
    return { start: s.startIdx, end: Math.min(s.startIdx + s.episodes, data.episodes.length) };
  }, [seasonStructure, activeSeason, data]);

  const visibleEpisodes = useMemo(() => {
    if (!data) return [];
    if (!visibleRange) return data.episodes;
    return data.episodes.slice(visibleRange.start, visibleRange.end);
  }, [data, visibleRange]);

  // Загрузка эпизодов
  useEffect(() => {
    setLoading(true); setError(false);
    fetch(`/api/anilibria/episodes?id=${anilibriaId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: AnilibriaReleaseData) => { setData(d); if (d.episodes.length > 0) setQuality(getBestQuality(d.episodes[0])); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [anilibriaId]);

  // ── Постоянные event-хэндлеры (используют рефы — всегда актуальные данные) ──
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    const ep = epRef.current;
    const releaseData = releaseDataRef.current;
    const epIdx = currentEpIndexRef.current;
    if (!video || !ep || !releaseData) return;

    const t = video.currentTime;
    const dur = video.duration;

    const { start: os, stop: oe } = ep.opening;
    const inOpening = os != null && oe != null && t >= os && t < oe;
    if (inOpening && autoSkipOpeningRef.current && oe != null) {
      video.currentTime = oe; setShowSkipOpening(false);
    } else { setShowSkipOpening(!!inOpening); }

    const { start: es, stop: ee } = ep.ending;
    const inEnding = es != null && ee != null && t >= es && t < ee;
    if (inEnding && autoSkipEndingRef.current && !autoSkippedRef.current) {
      autoSkippedRef.current = true; setShowSkipEnding(false);
      const nextIdx = epIdx + 1;
      if (nextIdx < releaseData.episodes.length) { switchEpisodeRef.current(nextIdx); }
      else if (ee != null) { video.currentTime = ee; }
    } else { setShowSkipEnding(!!inEnding); }

    const isLast = epIdx + 1 >= releaseData.episodes.length;
    const hasEnding = ep.ending.start != null && ep.ending.stop != null;
    if (!isLast && !hasEnding && !nextCardShownRef.current && dur > 90 && t > 0 && dur - t <= 60) {
      nextCardShownRef.current = true; setShowNextEpisode(true);
    }
  }, []);

  const handleEnded = useCallback(() => {
    const releaseData = releaseDataRef.current;
    const epIdx = currentEpIndexRef.current;
    if (!releaseData) return;
    const nextIdx = epIdx + 1;
    if (autoPlayRef.current && nextIdx < releaseData.episodes.length) {
      switchEpisodeRef.current(nextIdx); return;
    }
    if (!nextCardShownRef.current) { nextCardShownRef.current = true; setShowNextEpisode(true); }
  }, []);

  // ── Инициализация Shaka Player ОДИН РАЗ при маунте ────────────────────────
  useEffect(() => {
    let destroyed = false;
    let videoEl: HTMLVideoElement | null = null;
    let resolveFn: () => void;
    playerReadyRef.current = new Promise(res => { resolveFn = res; });

    async function initPlayer() {
      if (!videoRef.current || !uiContainerRef.current) return;

      const { Player, polyfill, ui } = await import('shaka-player/dist/shaka-player.ui.js');
      if (destroyed || !videoRef.current || !uiContainerRef.current) return;

      polyfill.installAll();
      if (!Player.isBrowserSupported()) { console.warn('[Shaka] Browser not supported'); return; }

      videoEl = videoRef.current;
      const player = new Player();
      await player.attach(videoEl);
      if (destroyed) { await player.destroy(); return; }

      const overlay = new ui.Overlay(player, uiContainerRef.current, videoEl);
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6C3CE1';
      overlay.configure({
        bigButtons: ['play_pause'],
        seekBarColors: { base: 'rgba(255,255,255,0.2)', buffered: 'rgba(255,255,255,0.4)', played: accentColor, adBreaks: '#E1913C', chapters: 'rgba(255,255,255,0.5)' },
        controlPanelElements: ['play_pause', 'time_and_duration', 'spacer', 'mute', 'volume', 'fullscreen', 'overflow_menu'],
        overflowMenuButtons: ['playback_rate', 'picture_in_picture'],
        enableKeyboardPlaybackControls: true,
        enableTooltips: true,
      });

      playerRef.current = player;
      uiRef.current = overlay;

      // Добавляем постоянные обработчики
      videoEl.addEventListener('timeupdate', handleTimeUpdate);
      videoEl.addEventListener('ended', handleEnded);

      resolveFn!();
    }

    initPlayer().catch(err => { console.error('[Shaka] Init error', err); });

    return () => {
      destroyed = true;
      videoEl?.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl?.removeEventListener('ended', handleEnded);
      const ui = uiRef.current; uiRef.current = null;
      const player = playerRef.current; playerRef.current = null;
      ui?.destroy().catch(() => { });
      player?.destroy().catch(() => { });
    };
  }, [handleEnded, handleTimeUpdate]);

  // ── Загружаем контент при смене серии/качества ────────────────────────────
  useEffect(() => {
    if (!data || data.episodes.length === 0) return;

    const ep = data.episodes[currentEpIndex];
    const url = getUrl(ep, quality);
    if (!url) return;

    // Обновляем рефы для event-хэндлеров СИНХРОННО
    epRef.current = ep;
    releaseDataRef.current = data;
    currentEpIndexRef.current = currentEpIndex;
    autoSkippedRef.current = false;
    nextCardShownRef.current = false;

    const loadId = ++loadIdRef.current;

    playerReadyRef.current.then(async () => {
      if (loadId !== loadIdRef.current) return; // Устаревший вызов
      const player = playerRef.current;
      if (!player) return;
      try {
        await player.load(url);
      } catch (e) {
        // Если загрузка прервана новым load() — это нормально
        if (loadId === loadIdRef.current) console.warn('[Shaka] Load failed', e);
      }
    });
  }, [data, currentEpIndex, quality]);

  // Прокрутка активного эпизода
  useEffect(() => {
    const list = episodeListRef.current;
    if (!list) return;
    const btn = list.querySelector(`[data-ep-index="${currentEpIndex}"]`) as HTMLButtonElement | null;
    btn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [currentEpIndex]);

  const switchEpisode = useCallback((index: number) => {
    setCurrentEpIndex(index);
    setShowSkipOpening(false); setShowSkipEnding(false); setShowNextEpisode(false);
  }, []);

  useEffect(() => { switchEpisodeRef.current = switchEpisode; }, [switchEpisode]);

  const skipOpening = useCallback(() => {
    const video = videoRef.current;
    const ep = epRef.current;
    if (!video || !ep) return;
    if (ep.opening.stop != null) video.currentTime = ep.opening.stop;
  }, []);

  const skipEnding = useCallback(() => {
    const releaseData = releaseDataRef.current;
    const epIdx = currentEpIndexRef.current;
    if (!releaseData) return;
    const nextIndex = epIdx + 1;
    if (nextIndex < releaseData.episodes.length) switchEpisode(nextIndex);
  }, [switchEpisode]);

  if (loading) {
    return (
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#0a0a12', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Загрузка плеера…</span>
      </div>
    );
  }

  if (error || !data || data.episodes.length === 0) {
    return (
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#0a0a12', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Серии недоступны</span>
      </div>
    );
  }

  const ep = data.episodes[currentEpIndex];
  const availableQualities = getAvailableQualities(ep);
  const isLastEpisode = currentEpIndex + 1 >= data.episodes.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Shaka Player */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <div ref={uiContainerRef} style={{ position: 'absolute', inset: 0 }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', display: 'block' }} playsInline />
        </div>

        {/* Skip buttons */}
        <div style={{ position: 'absolute', bottom: 64, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'auto', maxWidth: 'calc(100% - 32px)' }}>
          {showSkipOpening && <SkipButton label="Пропустить опенинг" onSkip={skipOpening} />}
          {showSkipEnding && (
            <SkipButton
              label={currentEpIndex + 1 < data.episodes.length ? 'Следующая серия' : 'Пропустить эндинг'}
              onSkip={skipEnding}
            />
          )}
        </div>

        {/* Карточка "Следующая серия" */}
        {showNextEpisode && (!isLastEpisode || nextSeasonShikimoriId != null) && (
          <div style={{ position: 'absolute', bottom: 70, right: 16, zIndex: 9999, background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 220, pointerEvents: 'auto' }}>
            {isLastEpisode ? (
              <><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Продолжение</p>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Следующий сезон</p></>
            ) : (
              <><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Следующая серия</p>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
                  {(() => { const next = data.episodes[currentEpIndex + 1]; return next.name ? `${next.ordinal}. ${next.name}` : `Серия ${next.ordinal}`; })()}
                </p></>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <SkipButton label="Смотреть" delay={isLastEpisode ? 15 : 60}
                onSkip={isLastEpisode ? () => router.push(`/anime/${nextSeasonShikimoriId}`) : () => switchEpisode(currentEpIndex + 1)} />
              <button onClick={() => setShowNextEpisode(false)}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Качество */}
      {availableQualities.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>Качество:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {availableQualities.map(q => (
              <button key={q} onClick={() => setQuality(q)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: q === quality ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
                border: q === quality ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: q === quality ? '#fff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{QUALITY_LABELS[q]}</button>
            ))}
          </div>
        </div>
      )}

      {/* Выбор сезона */}
      {seasonStructure && seasonStructure.length > 1 && (
        <div style={{ position: 'relative', width: 'fit-content' }}>
          <button onClick={() => setSeasonDropdownOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {seasonStructure[activeSeason].label}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transition: 'transform 0.15s', transform: seasonDropdownOpen ? 'rotate(180deg)' : 'none' }}>
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {seasonDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100, background: 'rgba(12,12,22,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', backdropFilter: 'blur(12px)', minWidth: '100%', maxHeight: 260, overflowY: 'auto' }}>
              {seasonStructure.map((s, i) => (
                <button key={s.shikimoriId}
                  onClick={() => { setActiveSeason(i); setSeasonDropdownOpen(false); switchEpisode(s.startIdx); }}
                  style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', background: i === activeSeason ? 'var(--accent)' : 'transparent', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.1s' }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Список эпизодов */}
      {visibleEpisodes.length > 1 && (
        <div ref={episodeListRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 2px', scrollbarWidth: 'none' }}>
          {visibleEpisodes.map((e, i) => {
            const globalIdx = visibleRange ? visibleRange.start + i : i;
            return (
              <button key={e.ordinal} data-ep-index={globalIdx} onClick={() => switchEpisode(globalIdx)}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 8,
                  background: globalIdx === currentEpIndex ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  border: 'none', color: globalIdx === currentEpIndex ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontSize: 13, fontWeight: globalIdx === currentEpIndex ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {e.name ? `${e.ordinal}. ${e.name}` : `${e.ordinal}`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
