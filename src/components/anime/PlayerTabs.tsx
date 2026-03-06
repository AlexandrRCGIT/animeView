'use client';

import { KodikPlayer } from './KodikPlayer';
import type { DBTranslation, EpisodesInfo } from '@/lib/db/anime';

interface Props {
  animeTitle: string;
  translations: DBTranslation[];
  episodesInfo: EpisodesInfo | null;
}

export function PlayerTabs({ animeTitle, translations, episodesInfo }: Props) {
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
      translations={translations}
      episodesInfo={episodesInfo}
      animeTitle={animeTitle}
    />
  );
}
