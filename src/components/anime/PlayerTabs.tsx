'use client';

import { useState } from 'react';
import { KodikPlayer } from './KodikPlayer';
import { RutubePlayer } from './RutubePlayer';
// import { WatchTogetherPanel } from './WatchTogetherPanel'; // TODO: WatchTogether временно отключён
import type { DBTranslation, EpisodesInfo } from '@/lib/db/anime';
// import type { WatchTogetherState } from '@/lib/watch-together/types'; // TODO: WatchTogether временно отключён

export interface WatchProgressData {
  season: number;
  episode: number;
  translation_id: number | null;
  translation_title: string | null;
  progress_seconds: number | null;
  duration_seconds: number | null;
  is_completed: boolean;
}

interface Props {
  shikimoriId: number;
  userId: string | null;
  userName?: string | null;
  animeTitle: string;
  translations: DBTranslation[];
  episodesInfo: EpisodesInfo | null;
  initialProgress?: WatchProgressData | null;
  rutubeEpisodes?: Record<string, Record<string, string>> | null;
  sharedEpisode?: number | null;
  sharedSeason?: number | null;
}

type Tab = 'kodik' | 'rutube';

export function PlayerTabs({
  shikimoriId,
  userId,
  userName: _userName = null, // eslint-disable-line @typescript-eslint/no-unused-vars
  animeTitle,
  translations,
  episodesInfo,
  initialProgress,
  rutubeEpisodes,
  sharedEpisode = null,
  sharedSeason = null,
}: Props) {
  const hasKodik = translations.length > 0;
  const hasRutube = !!rutubeEpisodes && Object.keys(rutubeEpisodes).length > 0;
  const showTabs = hasKodik && hasRutube;

  const [activeTab, setActiveTab] = useState<Tab>('kodik');

  // TODO: WatchTogether временно отключён — требует доработки синхронизации
  const watchTogetherActive = false;
  const watchTogetherCanControl = true;
  const watchTogetherRemoteState = null;
  const handleWatchTogetherStateChange = () => {};
  const watchTogetherControls = null;

  if (!hasKodik && !hasRutube) {
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
      {/* Переключатель источника */}
      {showTabs && (
        <div style={{ display: 'flex', gap: 8 }}>
          {([['kodik', 'Kodik'], ['rutube', 'Rutube']] as [Tab, string][]).map(([tab, label]) => {
            const isActive = activeTab === tab;
            const isLockedByWatchTogether = watchTogetherActive && tab === 'rutube';
            return (
              <button
                key={tab}
                onClick={() => {
                  if (isLockedByWatchTogether) return;
                  setActiveTab(tab);
                }}
                disabled={isLockedByWatchTogether}
                style={{
                  padding: '6px 18px', borderRadius: 20,
                  border: '1px solid',
                  cursor: isLockedByWatchTogether ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
                  transition: 'all 0.15s',
                  borderColor: isActive ? '#6C3CE1' : 'rgba(255,255,255,0.1)',
                  background: isActive ? '#6C3CE1' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  opacity: isLockedByWatchTogether ? 0.45 : 1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Kodik */}
      {(!showTabs || activeTab === 'kodik') && hasKodik && (
        <KodikPlayer
          shikimoriId={shikimoriId}
          userId={userId}
          translations={translations}
          episodesInfo={episodesInfo}
          animeTitle={animeTitle}
          initialProgress={initialProgress}
          sharedEpisode={sharedEpisode}
          sharedSeason={sharedSeason}
          watchTogetherEnabled={watchTogetherActive}
          watchTogetherCanControl={watchTogetherCanControl}
          watchTogetherRemoteState={watchTogetherRemoteState}
          onWatchTogetherStateChange={handleWatchTogetherStateChange}
          watchTogetherSlot={watchTogetherControls}
        />
      )}

      {/* Rutube */}
      {(!showTabs || activeTab === 'rutube') && hasRutube && (
        <>
          <RutubePlayer
            rutubeEpisodes={rutubeEpisodes!}
            userId={userId}
            shikimoriId={shikimoriId}
            animeTitle={animeTitle}
          />
          {watchTogetherControls}
        </>
      )}

    </div>
  );
}
