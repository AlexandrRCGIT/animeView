'use client';

import { useState, useEffect } from 'react';
import { KodikPlayer } from './KodikPlayer';
import type { TranslationGroup } from '@/lib/api/kodik';

interface Props {
  animeTitle: string;
  kodikUrl: string | null;
  kodikTranslations: TranslationGroup[];
  /** Варианты названия для поиска Aniboom (romaji + english). Поиск идёт клиент-сайд. */
  aniboomTitles: string[];
}

export function PlayerTabs({ animeTitle, kodikUrl, kodikTranslations, aniboomTitles }: Props) {
  const hasKodik = !!(kodikUrl || kodikTranslations.length > 0);

  const [aniboomUrl, setAniboomUrl] = useState<string | null>(null);
  const [aniboomLoading, setAniboomLoading] = useState(true);
  const [tab, setTab] = useState<'kodik' | 'aniboom'>(hasKodik ? 'kodik' : 'aniboom');

  // Ищем Aniboom URL клиент-сайд (animego.me блокирует сервер-сайд запросы)
  useEffect(() => {
    if (!aniboomTitles.length) {
      setAniboomLoading(false);
      return;
    }

    let cancelled = false;

    // Запрос через наш API-роут (избегаем CORS preflight — animego.me отвечает 405 на OPTIONS)
    async function fetchAniboom() {
      try {
        const params = aniboomTitles.map(t => `title=${encodeURIComponent(t)}`).join('&');
        const res = await fetch(`/api/aniboom?${params}`);
        if (!res.ok) return;
        const data = await res.json() as { url: string | null };
        if (!cancelled && data.url) setAniboomUrl(data.url);
      } catch {
        // Aniboom недоступен — просто не показываем таб
      }
    }

    fetchAniboom().finally(() => {
      if (!cancelled) setAniboomLoading(false);
    });
    return () => { cancelled = true; };
  }, [aniboomTitles.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasAniboom = !!aniboomUrl;

  // Если Kodik появился но таб ещё на aniboom при загрузке
  useEffect(() => {
    if (!hasKodik && hasAniboom) setTab('aniboom');
  }, [hasKodik, hasAniboom]);

  // Нет ни одного источника и поиск завершён
  if (!hasKodik && !aniboomLoading && !hasAniboom) {
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

  // Пока ищем Aniboom и Kodik тоже нет — индикатор
  if (!hasKodik && aniboomLoading) {
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

  // Только один источник — без табов
  const showTabs = hasKodik && hasAniboom;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Табы (показываем только когда оба доступны) */}
      {showTabs && (
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, width: 'fit-content',
        }}>
          <TabBtn active={tab === 'kodik'} onClick={() => setTab('kodik')}>Kodik</TabBtn>
          <TabBtn active={tab === 'aniboom'} onClick={() => setTab('aniboom')}>Aniboom</TabBtn>
        </div>
      )}

      {/* Kodik (только один источник или активный таб) */}
      {hasKodik && (!showTabs || tab === 'kodik') && (
        <KodikPlayer iframeUrl={kodikUrl} translations={kodikTranslations} animeTitle={animeTitle} />
      )}

      {/* Aniboom */}
      {hasAniboom && (!showTabs || tab === 'aniboom') && (
        <AniboomEmbed url={aniboomUrl!} animeTitle={animeTitle} />
      )}

      {/* Kodik активен, Aniboom ещё грузится — показываем индикатор загрузки таба */}
      {hasKodik && aniboomLoading && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
          Ищем Aniboom…
        </p>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
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
        background: active ? '#6C3CE1' : 'transparent',
        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
      }}
    >
      {children}
    </button>
  );
}

function AniboomEmbed({ url, animeTitle }: { url: string; animeTitle: string }) {
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
        title={`Aniboom: ${animeTitle}`}
      />
    </div>
  );
}
