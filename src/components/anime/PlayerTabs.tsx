'use client';

import { useCallback, useEffect, useState } from 'react';
import { KodikPlayer } from './KodikPlayer';
import { RutubePlayer } from './RutubePlayer';
import { WatchTogetherPanel } from './WatchTogetherPanel';
import type { DBTranslation, EpisodesInfo } from '@/lib/db/anime';
import type { WatchTogetherState } from '@/lib/watch-together/types';

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
  animeTitle: string;
  translations: DBTranslation[];
  episodesInfo: EpisodesInfo | null;
  initialProgress?: WatchProgressData | null;
  rutubeEpisodes?: Record<string, Record<string, string>> | null;
  sharedEpisode?: number | null;
  sharedSeason?: number | null;
  userName?: string | null;
}

type Tab = 'kodik' | 'rutube';

export function PlayerTabs({
  shikimoriId,
  userId,
  animeTitle,
  translations,
  episodesInfo,
  initialProgress,
  rutubeEpisodes,
  sharedEpisode = null,
  sharedSeason = null,
  userName = null,
}: Props) {
  const hasKodik = translations.length > 0;
  const hasRutube = !!rutubeEpisodes && Object.keys(rutubeEpisodes).length > 0;
  const showTabs = hasKodik && hasRutube;

  const [activeTab, setActiveTab] = useState<Tab>('kodik');
  const [watchTogetherRemoteState, setWatchTogetherRemoteState] = useState<WatchTogetherState | null>(null);
  const [watchTogetherLocalState, setWatchTogetherLocalState] = useState<WatchTogetherState | null>(null);
  const [watchTogetherActive, setWatchTogetherActive] = useState(false);
  const [watchTogetherCanControl, setWatchTogetherCanControl] = useState(true);
  const [watchTogetherOpen, setWatchTogetherOpen] = useState(false);
  const [wtDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      const enabled = params.get('wtdebug') === '1' || localStorage.getItem('wtdebug') === '1';
      if (enabled) {
        localStorage.setItem('wtdebug', '1');
      }
      return enabled;
    } catch {
      return false;
    }
  });

  const logWtDebug = useCallback(async (event: string, payload: Record<string, unknown>) => {
    if (!wtDebugEnabled) return;

    const row = {
      event,
      payload,
      at: new Date().toISOString(),
      animeId: shikimoriId,
      userId,
    };
    console.log('[WT_DEBUG]', row);

    try {
      await fetch('/api/watch-together/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
    } catch {
      // ignore debug transport errors
    }
  }, [wtDebugEnabled, shikimoriId, userId]);

  useEffect(() => {
    void logWtDebug('player_tabs_state', {
      hasKodik,
      hasRutube,
      showTabs,
      activeTab,
      watchTogetherOpen,
      watchTogetherActive,
      watchTogetherCanControl,
      translationsCount: translations.length,
      rutubeSeasonsCount: rutubeEpisodes ? Object.keys(rutubeEpisodes).length : 0,
    });
  }, [
    hasKodik,
    hasRutube,
    showTabs,
    activeTab,
    watchTogetherOpen,
    watchTogetherActive,
    watchTogetherCanControl,
    translations.length,
    rutubeEpisodes,
    logWtDebug,
  ]);

  useEffect(() => {
    if (hasKodik || hasRutube) return;
    void logWtDebug('player_tabs_no_video', {
      hasKodik,
      hasRutube,
      translationsCount: translations.length,
    });
  }, [hasKodik, hasRutube, translations.length, logWtDebug]);

  const watchTogetherControls = (
    <div style={{ display: 'grid', gap: 10 }}>
      {(watchTogetherOpen || watchTogetherActive) && (
        <WatchTogetherPanel
          animeId={shikimoriId}
          userId={userId}
          userName={userName}
          playerState={watchTogetherLocalState}
          syncSupported={hasKodik}
          onRemoteState={(state) => {
            setWatchTogetherRemoteState(state);
          }}
          onSessionChange={({ active, canControl }) => {
            setWatchTogetherActive(active);
            setWatchTogetherCanControl(canControl);
            if (!active) {
              setWatchTogetherRemoteState(null);
            }
          }}
        />
      )}
    </div>
  );

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
          onWatchTogetherStateChange={setWatchTogetherLocalState}
          watchTogetherSlot={watchTogetherControls}
          watchTogetherOpen={watchTogetherOpen}
          onWatchTogetherToggle={() => setWatchTogetherOpen((prev) => !prev)}
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

      {wtDebugEnabled && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(252,165,165,0.35)',
            background: 'rgba(127,29,29,0.2)',
            color: '#fecaca',
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          WT DEBUG:
          {' '}
          hasKodik={String(hasKodik)},
          {' '}
          hasRutube={String(hasRutube)},
          {' '}
          showTabs={String(showTabs)},
          {' '}
          activeTab={activeTab},
          {' '}
          open={String(watchTogetherOpen)},
          {' '}
          active={String(watchTogetherActive)},
          {' '}
          canControl={String(watchTogetherCanControl)}
        </div>
      )}
    </div>
  );
}
