'use client';

import { useState, useEffect } from 'react';
import { KodikPlayer } from './KodikPlayer';
import { AnilibriaPlayer } from './AnilibriaPlayer';
import type { TranslationGroup } from '@/lib/api/kodik';

interface Props {
  animeTitle: string;
  kodikUrl: string | null;
  kodikTranslations: TranslationGroup[];
  aniboomTitles: string[];
  /** Anilibria ID — если задан, показываем вкладку Anilibria с нативным плеером */
  anilibriaId?: number | null;
  /** Оставляем для совместимости, на клиенте не используется */
  anilibriaTitles?: string[];
  /** Shikimori ID следующего сезона (сиквел) — для перехода на страницу аниме */
  nextSeasonShikimoriId?: number | null;
  /** Shikimori ID текущего аниме — нужен для определения сезона в монолитном Anilibria-релизе */
  currentShikimoriId?: number;
  /** Сезоны франшизы для группировки эпизодов в монолитном Anilibria-релизе */
  franchiseSeasons?: Array<{ label: string; episodes: number; shikimoriId: number }>;
}

type Tab = 'kodik' | 'aniboom' | 'anilibria';

export function PlayerTabs({
  animeTitle,
  kodikUrl,
  kodikTranslations,
  aniboomTitles,
  anilibriaId,
  nextSeasonShikimoriId,
  currentShikimoriId,
  franchiseSeasons,
}: Props) {
  const hasKodik = !!(kodikUrl || kodikTranslations.length > 0);
  const hasAnilibria = anilibriaId != null;

  const [aniboomUrl, setAniboomUrl] = useState<string | null>(null);
  const [aniboomLoading, setAniboomLoading] = useState(true);

  const [tab, setTab] = useState<Tab>(() => {
    if (hasKodik) return 'kodik';
    if (hasAnilibria) return 'anilibria';
    return 'aniboom';
  });

  // Ищем Aniboom URL клиент-сайд
  useEffect(() => {
    if (!aniboomTitles.length) {
      setAniboomLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchAniboom() {
      try {
        const params = aniboomTitles.map(t => `title=${encodeURIComponent(t)}`).join('&');
        const res = await fetch(`/api/aniboom?${params}`);
        if (!res.ok) return;
        const data = await res.json() as { url: string | null };
        if (!cancelled && data.url) setAniboomUrl(data.url);
      } catch { }
    }
    fetchAniboom().finally(() => { if (!cancelled) setAniboomLoading(false); });
    return () => { cancelled = true; };
  }, [aniboomTitles.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Переключаемся на первый доступный источник если kodik нет
  useEffect(() => {
    if (!hasKodik) {
      if (hasAnilibria) setTab('anilibria');
      else if (aniboomUrl) setTab('aniboom');
    }
  }, [hasKodik, hasAnilibria, aniboomUrl]);

  const hasAniboom = !!aniboomUrl;

  // Нет ни одного источника и поиск завершён
  if (!hasKodik && !hasAnilibria && !aniboomLoading && !hasAniboom) {
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

  // Kodik нет, Anilibria нет, Aniboom грузится
  if (!hasKodik && !hasAnilibria && aniboomLoading) {
    return (
      <div style={{
        borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)',
        padding: '40px 24px', textAlign: 'center',
        color: 'rgba(255,255,255,0.2)', fontSize: 14,
      }}>
        Загрузка плеера…
      </div>
    );
  }

  const sources = [
    hasKodik && 'kodik',
    hasAnilibria && 'anilibria',
    hasAniboom && 'aniboom',
  ].filter(Boolean) as Tab[];

  const showTabs = sources.length > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Табы */}
      {showTabs && (
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, width: 'fit-content',
        }}>
          {hasKodik && (
            <TabBtn active={tab === 'kodik'} onClick={() => setTab('kodik')}>Kodik</TabBtn>
          )}
          {hasAnilibria && (
            <TabBtn active={tab === 'anilibria'} onClick={() => setTab('anilibria')}>Anilibria</TabBtn>
          )}
          {hasAniboom && (
            <TabBtn active={tab === 'aniboom'} onClick={() => setTab('aniboom')}>Aniboom</TabBtn>
          )}
        </div>
      )}

      {/* Kodik */}
      {hasKodik && (!showTabs || tab === 'kodik') && (
        <KodikPlayer iframeUrl={kodikUrl} translations={kodikTranslations} animeTitle={animeTitle} />
      )}

      {/* Anilibria — нативный ArtPlayer с HLS */}
      {hasAnilibria && (!showTabs || tab === 'anilibria') && (
        <AnilibriaPlayer
          anilibriaId={anilibriaId!}
          nextSeasonShikimoriId={nextSeasonShikimoriId}
          currentShikimoriId={currentShikimoriId}
          franchiseSeasons={franchiseSeasons}
        />
      )}

      {/* Aniboom */}
      {hasAniboom && (!showTabs || tab === 'aniboom') && (
        <ExternalEmbed url={aniboomUrl!} title={`Aniboom: ${animeTitle}`} />
      )}

      {/* Индикатор поиска Aniboom */}
      {(hasKodik || hasAnilibria) && aniboomLoading && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
          Ищем дополнительные источники…
        </p>
      )}
    </div>
  );
}

function TabBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
      }}
    >
      {children}
    </button>
  );
}

function ExternalEmbed({ url, title }: { url: string; title: string }) {
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16/9',
      borderRadius: 16, overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    }}>
      <iframe
        src={url}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        title={title}
      />
    </div>
  );
}
