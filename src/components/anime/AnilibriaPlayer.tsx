'use client';

import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { AnilibriaEpisode, AnilibriaReleaseData } from '@/app/api/anilibria/episodes/route';
import { ShakaAnilibriaPlayer } from './ShakaAnilibriaPlayer';

type PlayerEngine = 'artplayer' | 'shaka';

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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

function loadSetting(key: string, def: boolean): boolean {
  if (typeof window === 'undefined') return def;
  try { const s = localStorage.getItem('player_' + key); return s !== null ? s === '1' : def; }
  catch { return def; }
}
function saveSetting(key: string, value: boolean): void {
  try { localStorage.setItem('player_' + key, value ? '1' : '0'); } catch { }
}

/** Кнопка пропуска с обратным отсчётом и прогресс-баром */
const SkipButton = memo(function SkipButton({
  label,
  onSkip,
  delay = 15,
}: {
  label: string;
  onSkip: () => void;
  delay?: number;
}) {
  const [remaining, setRemaining] = useState(delay);
  const onSkipRef = useRef(onSkip);
  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => onSkipRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [delay]);

  const progress = ((delay - remaining) / delay) * 100;

  return (
    <button
      onClick={onSkip}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: '8px 16px', borderRadius: 8,
        background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', gap: 8,
        whiteSpace: 'nowrap',
      }}
    >
      {/* Прогресс-бар фон */}
      <span
        style={{
          position: 'absolute', inset: 0, left: 0, top: 0,
          width: `${progress}%`, height: '100%',
          background: 'var(--accent)',
          opacity: 0.35,
          transition: 'width 0.95s linear',
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'relative' }}>{label}</span>
      <span style={{
        position: 'relative',
        minWidth: 18, textAlign: 'center',
        fontSize: 12, opacity: 0.7,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {remaining}
      </span>
    </button>
  );
});

interface Props {
  anilibriaId: number;
  nextSeasonShikimoriId?: number | null;
  /** Shikimori ID текущего аниме — для выбора нужного сезона в монолитном релизе */
  currentShikimoriId?: number;
  /** Сезоны франшизы — если задан, пробуем разбить монолит по сезонам */
  franchiseSeasons?: Array<{ label: string; episodes: number; shikimoriId: number }>;
}

export function AnilibriaPlayer({
  anilibriaId,
  nextSeasonShikimoriId,
  currentShikimoriId,
  franchiseSeasons,
}: Props) {
  const router = useRouter();

  // ── Выбор движка плеера ───────────────────────────────────────────────────
  // Всегда начинаем с 'artplayer' чтобы SSR и первый клиентский рендер совпадали.
  // Читаем localStorage только в useEffect после гидрации.
  const [playerEngine, setPlayerEngine] = useState<PlayerEngine>('artplayer');
  useEffect(() => {
    const saved = localStorage.getItem('player_engine') as PlayerEngine | null;
    if (saved === 'shaka') setPlayerEngine('shaka');
  }, []);
  const switchEngine = (e: PlayerEngine) => {
    setPlayerEngine(e);
    localStorage.setItem('player_engine', e);
  };
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const artRef = useRef<any>(null);
  const episodeListRef = useRef<HTMLDivElement>(null);
  // Ссылка на .art-video-player — тот элемент, который переходит в фуллскрин
  const artPlayerElRef = useRef<HTMLElement | null>(null);

  const [data, setData] = useState<AnilibriaReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [quality, setQuality] = useState<Quality>('720');
  const nextCardShownRef = useRef(false);

  // true когда плеер в полноэкранном режиме (native или web)
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showSkipOpening, setShowSkipOpening] = useState(false);
  const [showSkipEnding, setShowSkipEnding] = useState(false);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  // Настройки (хранятся в localStorage)
  const [autoSkipOpening, setAutoSkipOpening] = useState(() => loadSetting('autoSkipOpening', false));
  const [autoSkipEnding, setAutoSkipEnding] = useState(() => loadSetting('autoSkipEnding', false));
  const [autoPlay, setAutoPlay] = useState(() => loadSetting('autoPlay', true));
  const [autoFullscreen, setAutoFullscreen] = useState(() => loadSetting('autoFullscreen', false));

  // Рефы для использования внутри колбэков ArtPlayer (всегда актуальное значение)
  const autoSkipOpeningRef = useRef(false);
  const autoSkipEndingRef = useRef(false);
  const autoPlayRef = useRef(true);
  const autoFullscreenRef = useRef(false);
  const speedRef = useRef<Speed>(1);
  const autoSkippedRef = useRef(false);
  const switchEpisodeRef = useRef<(idx: number) => void>(() => { });

  useEffect(() => { autoSkipOpeningRef.current = autoSkipOpening; saveSetting('autoSkipOpening', autoSkipOpening); }, [autoSkipOpening]);
  useEffect(() => { autoSkipEndingRef.current = autoSkipEnding; saveSetting('autoSkipEnding', autoSkipEnding); }, [autoSkipEnding]);
  useEffect(() => { autoPlayRef.current = autoPlay; saveSetting('autoPlay', autoPlay); }, [autoPlay]);
  useEffect(() => { autoFullscreenRef.current = autoFullscreen; saveSetting('autoFullscreen', autoFullscreen); }, [autoFullscreen]);

  // ── Структура сезонов для монолитных Anilibria-релизов ────────────────────
  // Если суммарное число эпизодов по всем сезонам ≈ число эпизодов у Anilibria (±15%)
  // — считаем это монолитом и разбиваем список эпизодов на блоки
  const seasonStructure = useMemo(() => {
    if (!franchiseSeasons || franchiseSeasons.length <= 1 || !data) return null;
    const totalFranchise = franchiseSeasons.reduce((s, f) => s + f.episodes, 0);
    const totalAnilibria = data.episodes.length;
    if (totalFranchise === 0) return null;
    if (Math.abs(totalAnilibria - totalFranchise) / totalFranchise > 0.15) return null;
    let offset = 0;
    return franchiseSeasons.map(s => {
      const item = { ...s, startIdx: offset };
      offset += s.episodes;
      return item;
    });
  }, [franchiseSeasons, data]);

  // Активный сезон (индекс в seasonStructure)
  const [activeSeason, setActiveSeason] = useState(0);
  const seasonInitialized = useRef(false);

  // Инициализируем сезон по currentShikimoriId (один раз после загрузки данных)
  useEffect(() => {
    if (!seasonStructure || currentShikimoriId == null || seasonInitialized.current) return;
    const idx = seasonStructure.findIndex(s => s.shikimoriId === currentShikimoriId);
    if (idx >= 0) {
      seasonInitialized.current = true;
      setActiveSeason(idx);
      setCurrentEpIndex(seasonStructure[idx].startIdx);
    }
  }, [seasonStructure]); // eslint-disable-line react-hooks/exhaustive-deps

  // Синхронизируем активный сезон при перелистывании эпизодов (автоплей / скип эндинга)
  useEffect(() => {
    if (!seasonStructure) return;
    for (let i = 0; i < seasonStructure.length; i++) {
      const s = seasonStructure[i];
      if (currentEpIndex >= s.startIdx && currentEpIndex < s.startIdx + s.episodes) {
        setActiveSeason(i);
        return;
      }
    }
  }, [currentEpIndex, seasonStructure]);

  // Диапазон видимых эпизодов (текущий сезон)
  const visibleRange = useMemo(() => {
    if (!seasonStructure || !data) return null;
    const s = seasonStructure[activeSeason];
    if (!s) return null;
    return { start: s.startIdx, end: Math.min(s.startIdx + s.episodes, data.episodes.length) };
  }, [seasonStructure, activeSeason, data]);

  // Список эпизодов для отображения
  const visibleEpisodes = useMemo(() => {
    if (!data) return [];
    if (!visibleRange) return data.episodes;
    return data.episodes.slice(visibleRange.start, visibleRange.end);
  }, [data, visibleRange]);

  // Загрузка эпизодов (только для ArtPlayer — Shaka сам фетчит)
  useEffect(() => {
    if (playerEngine === 'shaka') return;
    setLoading(true);
    setError(false);
    fetch(`/api/anilibria/episodes?id=${anilibriaId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: AnilibriaReleaseData) => {
        setData(d);
        if (d.episodes.length > 0) {
          setQuality(getBestQuality(d.episodes[0]));
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [anilibriaId, playerEngine]);

  // Инициализация ArtPlayer
  useEffect(() => {
    if (!data || !containerRef.current || data.episodes.length === 0) return;

    const releaseData = data; // захват для TypeScript-сужения внутри async init()
    const ep = releaseData.episodes[currentEpIndex];
    const url = getUrl(ep, quality);
    if (!url) return;

    let art: typeof artRef.current = null;
    autoSkippedRef.current = false; // сброс флага авто-пропуска для нового эпизода

    async function init() {
      const [ArtPlayerModule, HlsModule] = await Promise.all([
        import('artplayer'),
        import('hls.js'),
      ]);
      const ArtPlayer = ArtPlayerModule.default;
      const Hls = HlsModule.default;

      if (!containerRef.current) return;

      if (artRef.current) {
        artRef.current.destroy();
        artRef.current = null;
      }

      // Helper для toggle-пунктов встроенного меню настроек
      function mkToggle(
        html: string,
        toggleRef: { current: boolean },
        setter: (v: boolean) => void,
        storageKey: string,
      ) {
        return {
          html,
          switch: toggleRef.current,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSwitch(item: any) {
            const v = !item.switch;
            toggleRef.current = v;
            setter(v);
            saveSetting(storageKey, v);
            return v;
          },
        };
      }

      const availableQualities = getAvailableQualities(ep);

      // Пункты встроенного меню «Настройки» (шестерёнка в панели управления)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const artSettings: any[] = [
        {
          html: 'Скорость',
          tooltip: speedRef.current === 1 ? '1×' : `${speedRef.current}×`,
          selector: SPEEDS.map(s => ({
            html: s === 1 ? 'Обычная (1×)' : `${s}×`,
            value: s,
            default: s === speedRef.current,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSelect(item: any) {
            speedRef.current = item.value as Speed;
            if (artRef.current) artRef.current.playbackRate = item.value;
            return item.html as string;
          },
        },
        ...(availableQualities.length > 1 ? [{
          html: 'Качество',
          tooltip: QUALITY_LABELS[quality],
          selector: availableQualities.map(q => ({
            html: QUALITY_LABELS[q],
            value: q,
            default: q === quality,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSelect(item: any) {
            setQuality(item.value as Quality);
            return item.html as string;
          },
        }] : []),
        mkToggle('Пропускать опенинг', autoSkipOpeningRef, setAutoSkipOpening, 'autoSkipOpening'),
        mkToggle('Пропускать эндинг', autoSkipEndingRef, setAutoSkipEnding, 'autoSkipEnding'),
        mkToggle('Авто-воспроизведение', autoPlayRef, setAutoPlay, 'autoPlay'),
        mkToggle('Авто-полноэкранный режим', autoFullscreenRef, setAutoFullscreen, 'autoFullscreen'),
      ];

      art = new ArtPlayer({
        container: containerRef.current,
        url: url!,
        type: 'hls',
        customType: {
          hls: function (video: HTMLVideoElement, src: string) {
            if (Hls.isSupported()) {
              const hls = new Hls({ enableWorker: true });
              hls.loadSource(src);
              hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = src;
            }
          },
        },
        volume: 1,
        autoplay: false,
        theme: 'var(--accent)',
        lang: 'ru',
        i18n: {
          'ru': {
            'Play': 'Воспроизвести',
            'Pause': 'Пауза',
            'Volume': 'Громкость',
            'Mute': 'Без звука',
            'Mini Progress Bar': 'Мини-прогресс',
            'PIP Mode': 'Картинка в картинке',
            'Exit PIP Mode': 'Выйти из режима «Картинка в картинке»',
            'Web Fullscreen': 'Полный экран в окне',
            'Exit Web Fullscreen': 'Выйти из полного экрана в окне',
            'Fullscreen': 'Полный экран',
            'Exit Fullscreen': 'Выйти из полного экрана',
            'Aspect Ratio': 'Соотношение сторон',
            'Default': 'По умолчанию',
            'Settings': 'Настройки',
            'Loop': 'Повтор',
            'Speed': 'Скорость',
            'Normal': 'Обычная',
          },
        } as Record<string, Record<string, string>>,
        fullscreen: true,
        fullscreenWeb: true,
        pip: true,
        aspectRatio: true,
        setting: true,
        settings: artSettings,
        hotkey: true,
        miniProgressBar: true,
      });

      // Восстанавливаем скорость при смене серии
      if (speedRef.current !== 1) art.playbackRate = speedRef.current;

      // Авто-полноэкранный режим при первом воспроизведении
      let fullscreenTriggered = false;
      art.on('video:play', () => {
        if (autoFullscreenRef.current && !fullscreenTriggered) {
          fullscreenTriggered = true;
          art.fullscreen = true;
        }
      });

      // Сохраняем ссылку на .art-video-player — именно он переходит в фуллскрин
      artPlayerElRef.current = (art.template?.$player as HTMLElement) ?? null;

      // Следим за фуллскрином чтобы переключать способ рендера оверлеев
      art.on('fullscreen', (val: boolean) => setIsFullscreen(val));
      art.on('fullscreenWeb', (val: boolean) => setIsFullscreen(val));

      const isLast = currentEpIndex + 1 >= releaseData.episodes.length;
      const hasEnding = ep.ending.start != null && ep.ending.stop != null;
      nextCardShownRef.current = false;

      art.on('video:timeupdate', () => {
        const t = art.currentTime;
        const dur = art.duration;

        // Опенинг
        const { start: os, stop: oe } = ep.opening;
        const inOpening = os != null && oe != null && t >= os && t < oe;
        if (inOpening && autoSkipOpeningRef.current && oe != null) {
          art.currentTime = oe;
          setShowSkipOpening(false);
        } else {
          setShowSkipOpening(!!inOpening);
        }

        // Эндинг
        const { start: es, stop: ee } = ep.ending;
        const inEnding = es != null && ee != null && t >= es && t < ee;
        if (inEnding && autoSkipEndingRef.current && !autoSkippedRef.current) {
          autoSkippedRef.current = true;
          setShowSkipEnding(false);
          const nextIdx = currentEpIndex + 1;
          if (nextIdx < releaseData.episodes.length) {
            switchEpisodeRef.current(nextIdx);
          } else if (ee != null) {
            art.currentTime = ee;
          }
        } else {
          setShowSkipEnding(!!inEnding);
        }

        // Карточка за 60 сек до конца — только если нет эндинга и не последняя серия
        if (!isLast && !hasEnding && !nextCardShownRef.current
          && dur > 90 && t > 0 && dur - t <= 60) {
          nextCardShownRef.current = true;
          setShowNextEpisode(true);
        }
      });

      // Конец серии
      art.on('video:ended', () => {
        const nextIdx = currentEpIndex + 1;
        if (autoPlayRef.current && nextIdx < releaseData.episodes.length) {
          switchEpisodeRef.current(nextIdx);
          return;
        }
        if (!nextCardShownRef.current) {
          nextCardShownRef.current = true;
          setShowNextEpisode(true);
        }
      });

      artRef.current = art;
    }

    init();

    return () => {
      setIsFullscreen(false);
      artPlayerElRef.current = null;
      if (artRef.current) {
        artRef.current.destroy();
        artRef.current = null;
      }
    };
  }, [data, currentEpIndex, quality]);

  // Прокрутка активного эпизода в видимую область
  useEffect(() => {
    const list = episodeListRef.current;
    if (!list) return;
    const btn = list.querySelector(`[data-ep-index="${currentEpIndex}"]`) as HTMLButtonElement | null;
    btn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [currentEpIndex]);

  const switchEpisode = useCallback((index: number) => {
    setCurrentEpIndex(index);
    setShowSkipOpening(false);
    setShowSkipEnding(false);
    setShowNextEpisode(false);
  }, []);

  // Синхронизируем ref с актуальным switchEpisode
  useEffect(() => { switchEpisodeRef.current = switchEpisode; }, [switchEpisode]);

  const skipOpening = useCallback(() => {
    if (!artRef.current || !data) return;
    const ep = data.episodes[currentEpIndex];
    if (ep.opening.stop != null) {
      artRef.current.currentTime = ep.opening.stop;
    }
  }, [data, currentEpIndex]);

  const skipEnding = useCallback(() => {
    if (!data) return;
    const nextIndex = currentEpIndex + 1;
    if (nextIndex < data.episodes.length) {
      switchEpisode(nextIndex);
    }
  }, [data, currentEpIndex, switchEpisode]);

  // ── Переключатель движков (показывается во всех состояниях) ──────────────
  const engineToggle = (
    <div style={{
      display: 'flex', gap: 3, padding: 3,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, width: 'fit-content',
    }}>
      {(['artplayer', 'shaka'] as PlayerEngine[]).map(e => (
        <button
          key={e}
          onClick={() => switchEngine(e)}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
            background: playerEngine === e ? 'var(--accent)' : 'transparent',
            color: playerEngine === e ? '#fff' : 'rgba(255,255,255,0.35)',
          }}
        >
          {e === 'artplayer' ? 'ArtPlayer' : 'Shaka'}
        </button>
      ))}
    </div>
  );

  // Shaka Player — рендерим отдельный компонент
  if (playerEngine === 'shaka') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {engineToggle}
        <ShakaAnilibriaPlayer
          anilibriaId={anilibriaId}
          nextSeasonShikimoriId={nextSeasonShikimoriId}
          currentShikimoriId={currentShikimoriId}
          franchiseSeasons={franchiseSeasons}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {engineToggle}
        <div style={{ width: '100%', aspectRatio: '16/9', background: '#0a0a12', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Загрузка плеера…</span>
        </div>
      </div>
    );
  }

  if (error || !data || data.episodes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {engineToggle}
        <div style={{ width: '100%', aspectRatio: '16/9', background: '#0a0a12', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Серии недоступны</span>
        </div>
      </div>
    );
  }

  const isLastEpisode = currentEpIndex + 1 >= data.episodes.length;

  // Оверлеи — одинаковы и для обычного режима (соседи), и для фуллскрина (портал)
  // position: absolute работает в обоих случаях т.к. оба контейнера имеют position: relative
  const overlays = (
    <>
      {/* Кнопки пропуска — правый нижний угол, отступ от края чтобы не перекрывать кнопки плеера */}
      <div style={{
        position: 'absolute', bottom: 64, right: 16,
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        pointerEvents: 'auto',
        maxWidth: 'calc(100% - 32px)',
      }}>
        {showSkipOpening && (
          <SkipButton label="Пропустить опенинг" onSkip={skipOpening} />
        )}
        {showSkipEnding && (
          <SkipButton
            label={currentEpIndex + 1 < data.episodes.length ? 'Следующая серия' : 'Пропустить эндинг'}
            onSkip={skipEnding}
          />
        )}
      </div>

      {/* Карточка "Следующая серия" / "Следующий сезон" */}
      {showNextEpisode && (!isLastEpisode || nextSeasonShikimoriId != null) && (
        <div style={{
          position: 'absolute', bottom: 70, right: 16,
          zIndex: 9999,
          background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 10,
          minWidth: 220, pointerEvents: 'auto',
        }}>
          {isLastEpisode ? (
            <>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Продолжение
              </p>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
                Следующий сезон
              </p>
            </>
          ) : (
            <>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Следующая серия
              </p>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
                {(() => {
                  const next = data.episodes[currentEpIndex + 1];
                  return next.name ? `${next.ordinal}. ${next.name}` : `Серия ${next.ordinal}`;
                })()}
              </p>
            </>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <SkipButton
              label="Смотреть"
              delay={isLastEpisode ? 15 : 60}
              onSkip={
                isLastEpisode
                  ? () => router.push(`/anime/${nextSeasonShikimoriId}`)
                  : () => switchEpisode(currentEpIndex + 1)
              }
            />
            <button
              onClick={() => setShowNextEpisode(false)}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.4)', borderRadius: 8,
                padding: '6px 10px', fontSize: 13, cursor: 'pointer', lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {engineToggle}
      {/* Плеер */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Оверлеи:
            - обычный режим: соседи внутри position:relative обёртки
            - фуллскрин: портал в .art-video-player (тот самый элемент, который идёт в fullscreen) */}
        {isFullscreen && artPlayerElRef.current
          ? createPortal(overlays, artPlayerElRef.current)
          : overlays
        }
      </div>

      {/* Выбор сезона (для монолитных релизов) */}
      {seasonStructure && seasonStructure.length > 1 && (
        <div style={{ position: 'relative', width: 'fit-content' }}>
          <button
            onClick={() => setSeasonDropdownOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {seasonStructure[activeSeason].label}
            <svg
              width="10" height="6" viewBox="0 0 10 6" fill="none"
              style={{ transition: 'transform 0.15s', transform: seasonDropdownOpen ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {seasonDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
              background: 'rgba(12,12,22,0.97)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, overflow: 'hidden', backdropFilter: 'blur(12px)',
              minWidth: '100%', maxHeight: 260, overflowY: 'auto',
            }}>
              {seasonStructure.map((s, i) => (
                <button
                  key={s.shikimoriId}
                  onClick={() => {
                    setActiveSeason(i);
                    setSeasonDropdownOpen(false);
                    switchEpisode(s.startIdx);
                  }}
                  style={{
                    display: 'block', width: '100%',
                    padding: '8px 16px', textAlign: 'left',
                    background: i === activeSeason ? 'var(--accent)' : 'transparent',
                    border: 'none', color: '#fff', fontSize: 13,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'background 0.1s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Список эпизодов */}
      {visibleEpisodes.length > 1 && (
        <div
          ref={episodeListRef}
          style={{
            display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 2px',
            scrollbarWidth: 'none',
          }}
        >
          {visibleEpisodes.map((e, i) => {
            const globalIdx = visibleRange ? visibleRange.start + i : i;
            return (
              <button
                key={e.ordinal}
                data-ep-index={globalIdx}
                onClick={() => switchEpisode(globalIdx)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px', borderRadius: 8,
                  background: globalIdx === currentEpIndex ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: globalIdx === currentEpIndex ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontSize: 13, fontWeight: globalIdx === currentEpIndex ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {e.name ? `${e.ordinal}. ${e.name}` : `${e.ordinal}`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
