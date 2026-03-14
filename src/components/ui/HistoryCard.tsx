'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { deleteWatchProgress } from '@/app/actions/history';
import { proxifyImageUrl } from '@/lib/image-proxy';

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

  const poster = poster_url ? proxifyImageUrl(poster_url, 120) : '';
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
              loading="lazy"
            />
          )}
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            {season > 1 ? `Сезон ${season} · ` : ''}Серия {episode}
          </div>
          {translation_title && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{translation_title}</div>
          )}

          {/* Прогресс */}
          <div style={{ marginTop: 'auto', paddingTop: 6 }}>
            {!is_completed && percent !== null && (
              <>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 5,
                }}>
                  <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                    Просмотрено
                  </span>
                  <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700 }}>
                    {percent}%
                  </span>
                </div>
                <div style={{
                  height: 3, borderRadius: 2,
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${percent}%`,
                    background: 'linear-gradient(90deg, #E13C6E, #6C3CE1)',
                    borderRadius: 2,
                  }} />
                </div>
              </>
            )}
            {is_completed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'rgba(60,225,168,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#3CE1A8" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <span style={{ fontSize: 11, color: '#3CE1A8', fontWeight: 600 }}>Досмотрено</span>
              </div>
            )}
            {!is_completed && percent === null && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Начато</span>
            )}
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
