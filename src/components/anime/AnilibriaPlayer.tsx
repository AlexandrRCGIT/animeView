'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
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
  onSkipRef.current = onSkip;

  useEffect(() => {
    setRemaining(delay);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
}

export function AnilibriaPlayer({ anilibriaId, nextSeasonShikimoriId }: Props) {
  const router = useRouter();
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
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Загрузка эпизодов
  useEffect(() => {
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
  }, [anilibriaId]);

  // Инициализация ArtPlayer
  useEffect(() => {
    if (!data || !containerRef.current || data.episodes.length === 0) return;

    const ep = data.episodes[currentEpIndex];
    const url = getUrl(ep, quality);
    if (!url) return;

    let art: typeof artRef.current = null;

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
        fullscreen: true,
        fullscreenWeb: true,
        pip: true,
        playbackRate: true,
        aspectRatio: true,
        setting: false,
        hotkey: true,
        miniProgressBar: true,
        style: { width: '100%', height: '100%' },
      });

      // Сохраняем ссылку на .art-video-player — именно он переходит в фуллскрин
      artPlayerElRef.current = (art.template?.$player as HTMLElement) ?? null;

      // Следим за фуллскрином чтобы переключать способ рендера оверлеев
      art.on('fullscreen', (val: boolean) => setIsFullscreen(val));
      art.on('fullscreenWeb', (val: boolean) => setIsFullscreen(val));

      const isLast = currentEpIndex + 1 >= data.episodes.length;
      const hasEnding = ep.ending.start != null && ep.ending.stop != null;
      nextCardShownRef.current = false;

      art.on('video:timeupdate', () => {
        const t = art.currentTime;
        const dur = art.duration;

        const { start: os, stop: oe } = ep.opening;
        setShowSkipOpening(os != null && oe != null && t >= os && t < oe);
        const { start: es, stop: ee } = ep.ending;
        setShowSkipEnding(es != null && ee != null && t >= es && t < ee);

        // Карточка за 60 сек до конца — только если нет эндинга и не последняя серия
        if (!isLast && !hasEnding && !nextCardShownRef.current
            && dur > 90 && t > 0 && dur - t <= 60) {
          nextCardShownRef.current = true;
          setShowNextEpisode(true);
        }
      });

      // Конец серии — для последней серии (следующий сезон)
      const handleEnd = () => {
        if (!nextCardShownRef.current) {
          nextCardShownRef.current = true;
          setShowNextEpisode(true);
        }
      };
      art.on('video:ended', handleEnd);
      art.on('video:complete', handleEnd);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setShowQualityMenu(false);
  }, []);

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

  const switchQuality = useCallback((q: Quality) => {
    if (!artRef.current || !data) return;
    const ep = data.episodes[currentEpIndex];
    const url = getUrl(ep, q);
    if (!url) return;
    const savedTime = artRef.current.currentTime ?? 0;
    const wasPlaying = artRef.current.playing;
    artRef.current.switchUrl(url);
    artRef.current.once('video:canplay', () => {
      artRef.current.currentTime = savedTime;
      if (wasPlaying) artRef.current.play();
    });
    setQuality(q);
    setShowQualityMenu(false);
  }, [data, currentEpIndex]);

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

  // Оверлеи — одинаковы и для обычного режима (соседи), и для фуллскрина (портал)
  // position: absolute работает в обоих случаях т.к. оба контейнера имеют position: relative
  const overlays = (
    <>
      {/* Кнопки пропуска — правый нижний угол */}
      <div style={{
        position: 'absolute', bottom: 64, right: 16,
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        pointerEvents: 'auto',
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

      {/* Выбор качества — левый нижний угол */}
      {availableQualities.length > 1 && (
        <div style={{ position: 'absolute', bottom: 64, left: 16, zIndex: 9999, pointerEvents: 'auto' }}>
          <button
            onClick={() => setShowQualityMenu(v => !v)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            {QUALITY_LABELS[quality]}
          </button>
          {showQualityMenu && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
              background: 'rgba(15,15,26,0.95)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, overflow: 'hidden', backdropFilter: 'blur(8px)',
            }}>
              {availableQualities.map(q => (
                <button
                  key={q}
                  onClick={() => switchQuality(q)}
                  style={{
                    display: 'block', width: '100%', padding: '7px 16px',
                    background: q === quality ? 'var(--accent)' : 'transparent',
                    border: 'none', color: '#fff', fontSize: 13,
                    cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap',
                  }}
                >
                  {QUALITY_LABELS[q]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

      {/* Список эпизодов */}
      {data.episodes.length > 1 && (
        <div
          ref={episodeListRef}
          style={{
            display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 2px',
            scrollbarWidth: 'none',
          }}
        >
          {data.episodes.map((e, i) => (
            <button
              key={e.ordinal}
              data-ep-index={i}
              onClick={() => switchEpisode(i)}
              style={{
                flexShrink: 0,
                padding: '6px 14px', borderRadius: 8,
                background: i === currentEpIndex ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                border: 'none',
                color: i === currentEpIndex ? '#fff' : 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: i === currentEpIndex ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {e.name ? `${e.ordinal}. ${e.name}` : `${e.ordinal}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
