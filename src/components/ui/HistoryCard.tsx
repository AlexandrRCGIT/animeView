'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { deleteWatchProgress } from '@/app/actions/history';

interface HistoryCardProps {
  shikimoriId: number;
  title: string;
  poster_url: string | null;
  season: number;
  episode: number;
  translation_title: string | null;
  progress_seconds: number | null;
  duration_seconds: number | null;
  is_completed: boolean;
}

export function HistoryCard({ shikimoriId, title, poster_url, season, episode, translation_title, progress_seconds, duration_seconds, is_completed }: HistoryCardProps) {
  const [deleted, setDeleted] = useState(false);
  const [, startTransition] = useTransition();

  if (deleted) return null;

  const poster = poster_url ? (poster_url.startsWith('http') ? `/api/image?url=${encodeURIComponent(poster_url)}` : poster_url) : '';
  const posterUnoptimized = poster.startsWith('/api/image?');

  const percent =
    progress_seconds !== null && duration_seconds !== null && duration_seconds > 0
      ? Math.max(0, Math.min(100, Math.round((progress_seconds / duration_seconds) * 100)))
      : null;

  function handleDelete() {
    setDeleted(true);
    startTransition(() => {
      void deleteWatchProgress(shikimoriId);
    });
  }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <Link
        href={`/anime/${shikimoriId}`}
        style={{
          display: 'flex',
          gap: 12,
          textDecoration: 'none',
          padding: 10,
          paddingRight: 36,
        }}
      >
        <div
          style={{
            width: 68,
            minWidth: 68,
            aspectRatio: '2/3',
            borderRadius: 10,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.08)',
            position: 'relative',
          }}
        >
          {poster && (
            <Image
              src={poster}
              alt={title}
              fill
              sizes="68px"
              style={{ objectFit: 'cover' }}
              unoptimized={posterUnoptimized}
            />
          )}
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            Сезон {season} · Серия {episode}
          </div>
          {translation_title && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{translation_title}</div>
          )}
          <div style={{ marginTop: 2, fontSize: 12, color: is_completed ? '#3CE1A8' : '#a78bfa' }}>
            {is_completed ? 'Досмотрено' : percent !== null ? `Прогресс: ${percent}%` : 'Начато'}
          </div>
        </div>
      </Link>

      <button
        onClick={handleDelete}
        title="Удалить из истории"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: 6,
          border: 'none',
          background: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = 'rgba(220,50,50,0.2)';
          e.currentTarget.style.color = '#f87171';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
        }}
      >
        ×
      </button>
    </div>
  );
}
