'use client';

import { useState } from 'react';
import { KodikPlayer } from './KodikPlayer';
import type { TranslationGroup } from '@/lib/api/kodik';

interface Props {
  animeTitle: string;
  kodikUrl: string | null;
  kodikTranslations: TranslationGroup[];
  aniboomUrl: string | null;
}

export function PlayerTabs({ animeTitle, kodikUrl, kodikTranslations, aniboomUrl }: Props) {
  const hasKodik = !!(kodikUrl || kodikTranslations.length > 0);
  const hasAniboom = !!aniboomUrl;

  const [tab, setTab] = useState<'kodik' | 'aniboom'>(hasKodik ? 'kodik' : 'aniboom');

  // Нет ни одного источника
  if (!hasKodik && !hasAniboom) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-600 text-sm">
        <p>Видео для «{animeTitle}» не найдено.</p>
      </div>
    );
  }

  // Только один источник — без табов
  if (!hasKodik) {
    return <AniboomEmbed url={aniboomUrl!} animeTitle={animeTitle} />;
  }
  if (!hasAniboom) {
    return (
      <KodikPlayer iframeUrl={kodikUrl} translations={kodikTranslations} animeTitle={animeTitle} />
    );
  }

  // Оба источника — показываем табы
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        <TabBtn active={tab === 'kodik'} onClick={() => setTab('kodik')}>
          Kodik
        </TabBtn>
        <TabBtn active={tab === 'aniboom'} onClick={() => setTab('aniboom')}>
          Aniboom
        </TabBtn>
      </div>

      {tab === 'kodik' && (
        <KodikPlayer iframeUrl={kodikUrl} translations={kodikTranslations} animeTitle={animeTitle} />
      )}
      {tab === 'aniboom' && (
        <AniboomEmbed url={aniboomUrl} animeTitle={animeTitle} />
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
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-violet-600 text-white'
          : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function AniboomEmbed({ url, animeTitle }: { url: string; animeTitle: string }) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 shadow-2xl ring-1 ring-white/5">
      <iframe
        src={url}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        title={`Aniboom: ${animeTitle}`}
      />
    </div>
  );
}
