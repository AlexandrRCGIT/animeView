'use client';

import { KodikPlayer } from './KodikPlayer';
import type { DBTranslation, EpisodesInfo } from '@/lib/db/anime';

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
}

export function PlayerTabs({ shikimoriId, userId, animeTitle, translations, episodesInfo, initialProgress }: Props) {
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
    <KodikPlayer
      shikimoriId={shikimoriId}
      userId={userId}
      translations={translations}
      episodesInfo={episodesInfo}
      animeTitle={animeTitle}
      initialProgress={initialProgress}
    />
  );
}
