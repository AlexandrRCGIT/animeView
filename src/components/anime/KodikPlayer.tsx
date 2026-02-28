'use client';

import { useState } from 'react';
import { buildKodikIframeUrl, getEpisodesForSeason } from '@/lib/api/kodik';
import type { TranslationGroup } from '@/lib/api/kodik';

interface KodikPlayerProps {
  iframeUrl: string | null;
  translations: TranslationGroup[];
  animeTitle: string;
}

export function KodikPlayer({ iframeUrl, translations, animeTitle }: KodikPlayerProps) {
  const [activeUrl, setActiveUrl] = useState<string | null>(iframeUrl);
  const [activeGroup, setActiveGroup] = useState<TranslationGroup | null>(
    translations[0] ?? null
  );
  const [activeTranslationId, setActiveTranslationId] = useState<number | null>(
    translations[0]?.translation.id ?? null
  );
  const [activeEpisode, setActiveEpisode] = useState<number | null>(null);

  // Kodik недоступен или нет токена
  if (!iframeUrl && translations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-600 text-sm">
        <p>Видео для «{animeTitle}» не найдено.</p>
        <p className="mt-1 text-zinc-700">
          Убедитесь, что задан KODIK_TOKEN в .env.local
        </p>
      </div>
    );
  }

  const season = activeGroup?.result.last_season ?? 1;
  const episodes = activeGroup ? getEpisodesForSeason(activeGroup.result, season) : [];

  function switchTranslation(group: TranslationGroup) {
    setActiveGroup(group);
    setActiveTranslationId(group.translation.id);
    setActiveEpisode(null);
    setActiveUrl(buildKodikIframeUrl(group.result.link));
  }

  function switchEpisode(ep: { episode: number; link: string }) {
    setActiveEpisode(ep.episode);
    setActiveUrl(buildKodikIframeUrl(ep.link));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Выбор озвучки */}
      {translations.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {translations.map((group) => {
            const isActive = group.translation.id === activeTranslationId;
            return (
              <button
                key={group.translation.id}
                onClick={() => switchTranslation(group)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {group.translation.type === 'voice' ? '🎙' : '📝'}{' '}
                {group.translation.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Выбор серии */}
      {episodes.length > 1 && (
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '4px 0' }}>
          {episodes.map(ep => (
            <button
              key={ep.episode}
              onClick={() => switchEpisode(ep)}
              style={{
                flexShrink: 0, minWidth: 36, padding: '4px 8px',
                borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                background: activeEpisode === ep.episode ? '#6C3CE1' : 'rgba(255,255,255,0.07)',
                color: activeEpisode === ep.episode ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {ep.episode}
            </button>
          ))}
        </div>
      )}

      {/* iframe плеер */}
      {activeUrl && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 shadow-2xl ring-1 ring-white/5">
          <iframe
            src={activeUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
            title={`Плеер: ${animeTitle}`}
          />
        </div>
      )}
    </div>
  );
}
