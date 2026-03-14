'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import type { AnimeShort } from '@/lib/db/anime';
import type { ViewMode } from '@/components/ui/FilterBar';
import type { WatchProgressEntry } from './AnimeGrid';
import { FavoriteButton } from './FavoriteButton';
import { proxifyImageUrl } from '@/lib/image-proxy';

interface AnimeCardProps {
  anime: AnimeShort;
  view?: ViewMode;
  isFavorited?: boolean;
  isLoggedIn?: boolean;
  watchProgress?: WatchProgressEntry | null;
}

function calcProgressPercent(entry: WatchProgressEntry, anime: AnimeShort): number {
  if (entry.is_completed) return 100;
  const total = anime.last_episode ?? anime.episodes_count;
  if (!total || total <= 0) return 0;
  return Math.min(99, Math.round((entry.episode / total) * 100));
}

function formatKind(kind: string | null): string {
  const map: Record<string, string> = {
    tv: 'TV', movie: 'Фильм', ova: 'OVA', ona: 'ONA',
    special: 'Спецвыпуск', music: 'Клип',
    tv_13: 'TV', tv_24: 'TV', tv_48: 'TV',
  };
  return kind ? (map[kind] ?? kind.toUpperCase()) : '';
}

function formatStatus(status: string | null): string {
  const map: Record<string, string> = {
    ongoing: 'Онгоинг', released: 'Завершён', anons: 'Анонс',
  };
  return status ? (map[status] ?? status) : '';
}

export const AnimeCard = memo(function AnimeCard({ anime, view = 'grid', isFavorited = false, isLoggedIn = false, watchProgress = null }: AnimeCardProps) {
  const progressPercent = watchProgress ? calcProgressPercent(watchProgress, anime) : 0;
  const poster = anime.poster_url ? proxifyImageUrl(anime.poster_url, 280) : null;
  const posterUnoptimized = !!poster && poster.startsWith('/api/image?');
  const format = formatKind(anime.anime_kind);
  const status = formatStatus(anime.anime_status);
  const score = anime.shikimori_rating;
  const year = anime.year;
  const episodes = anime.last_episode ?? anime.episodes_count;
  const seasonLabel = anime.season_number && anime.season_number > 0
    ? `Сезон ${anime.season_number}`
    : null;

  const statusColor =
    anime.anime_status === 'ongoing' ? '#3CE1A8' :
    anime.anime_status === 'anons'   ? '#3C7EE1' :
    'rgba(255,255,255,0.35)';

  // ── List view ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <Link
        href={`/anime/${anime.id}`}
        style={{
          display: 'flex', gap: 20, padding: '16px 20px', borderRadius: 16,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          textDecoration: 'none', transition: 'all 0.25s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        }}
      >
        {/* Постер */}
        <div style={{
          flexShrink: 0, width: 72, height: 100, borderRadius: 10,
          overflow: 'hidden', background: 'rgba(255,255,255,0.06)', position: 'relative',
        }}>
          {poster
            ? <Image src={poster} alt={anime.title} fill sizes="72px" style={{ objectFit: 'cover' }} unoptimized={posterUnoptimized} loading="lazy" />
            : <PosterPlaceholder />
          }
          {progressPercent > 0 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.4)' }}>
              <div style={{
                height: '100%', width: `${progressPercent}%`,
                background: progressPercent === 100 ? '#3CE1A8' : 'linear-gradient(90deg, #6C3CE1, #E13C6E)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          )}
        </div>

        {/* Данные */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.4 }}>
                {anime.title}
              </p>
              {anime.title_orig && anime.title_orig !== anime.title && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
                  {anime.title_orig}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {score && score > 0 && (
                <span style={{ color: '#F5C842', fontSize: 13, fontWeight: 700 }}>
                  ★ {score.toFixed(1)}
                </span>
              )}
              <FavoriteButton shikimoriId={anime.id} isFavorited={isFavorited} isLoggedIn={isLoggedIn} variant="icon" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {seasonLabel && (
              <span style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: 'rgba(140,82,255,0.18)', color: '#BEA7FF',
              }}>{seasonLabel}</span>
            )}
            {format && (
              <span style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)',
              }}>{format}</span>
            )}
            {status && (
              <span style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: `${statusColor}15`, color: statusColor,
              }}>{status}</span>
            )}
            {episodes > 0 && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {episodes} эп.
              </span>
            )}
            {year && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{year}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ── Grid view ──────────────────────────────────────────────────────────────
  return (
    <Link
      href={`/anime/${anime.id}`}
      style={{
        display: 'block', borderRadius: 16, overflow: 'hidden', textDecoration: 'none',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Постер */}
      <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        {poster
          ? <Image src={poster} alt={anime.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw" style={{ objectFit: 'cover', transition: 'transform 0.4s' }} unoptimized={posterUnoptimized} loading="lazy" />
          : <PosterPlaceholder />
        }
        {/* Прогресс-бар */}
        {progressPercent > 0 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.5)', zIndex: 2 }}>
            <div style={{
              height: '100%', width: `${progressPercent}%`,
              background: progressPercent === 100 ? '#3CE1A8' : 'linear-gradient(90deg, #6C3CE1, #E13C6E)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        )}
        {score && score > 0 && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            borderRadius: 8, padding: '3px 8px',
            fontSize: 12, fontWeight: 700, color: '#F5C842',
          }}>★ {score.toFixed(1)}</div>
        )}
        {format && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            borderRadius: 8, padding: '3px 8px',
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
          }}>{format}</div>
        )}
        <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
          <FavoriteButton shikimoriId={anime.id} isFavorited={isFavorited} isLoggedIn={isLoggedIn} variant="icon" />
        </div>
      </div>

      {/* Подпись */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: '#fff', margin: 0,
          lineHeight: 1.4, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          height: '2.8em',
        }}>{anime.title}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', overflow: 'hidden' }}>
          {seasonLabel && (
            <span style={{
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              padding: '2px 7px', borderRadius: 5,
              background: 'rgba(140,82,255,0.18)', color: '#BEA7FF',
            }}>{seasonLabel}</span>
          )}
          {status && (
            <span style={{
              fontSize: 11, fontWeight: 600, flexShrink: 0,
              padding: '2px 7px', borderRadius: 5,
              background: `${statusColor}15`, color: statusColor,
            }}>{status}</span>
          )}
          {episodes > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{episodes} эп.</span>
          )}
          {year && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{year}</span>
          )}
        </div>
      </div>
    </Link>
  );
});

function PosterPlaceholder() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)',
    }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="6" width="24" height="20" rx="3" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <circle cx="12" cy="13" r="2.5" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <path d="M4 22l7-6 5 5 4-3 8 5" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
