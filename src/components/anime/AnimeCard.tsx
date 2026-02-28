'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getBestTitle, formatStatus, formatKind, getShikimoriImageUrl } from '@/lib/api/shikimori';
import type { AnimeShort } from '@/lib/api/shikimori';
import type { ViewMode } from '@/components/ui/FilterBar';
import { FavoriteButton } from './FavoriteButton';

interface AnimeCardProps {
  anime: AnimeShort;
  view?: ViewMode;
  isFavorited?: boolean;
  isLoggedIn?: boolean;
}

export function AnimeCard({ anime, view = 'grid', isFavorited = false, isLoggedIn = false }: AnimeCardProps) {
  const title  = getBestTitle(anime);
  const poster = getShikimoriImageUrl(anime.image.original);
  const format = formatKind(anime.kind);
  const status = formatStatus(anime.status);
  const score  = parseFloat(anime.score);
  const year   = anime.aired_on?.split('-')[0] ?? null;

  const statusColor =
    anime.status === 'ongoing'  ? '#3CE1A8' :
    anime.status === 'anons'    ? '#3C7EE1' :
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
          <Image src={poster} alt={title} fill sizes="72px" style={{ objectFit: 'cover' }} />
        </div>

        {/* Данные */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.4 }}>
                {title}
              </p>
              {anime.name !== title && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
                  {anime.name}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {score > 0 && (
                <span style={{ color: '#F5C842', fontSize: 13, fontWeight: 700 }}>
                  ★ {score.toFixed(1)}
                </span>
              )}
              <FavoriteButton shikimoriId={anime.id} isFavorited={isFavorited} isLoggedIn={isLoggedIn} variant="icon" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
            {anime.episodes > 0 && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {anime.episodes} эп.
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
        <Image
          src={poster}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          style={{ objectFit: 'cover', transition: 'transform 0.4s' }}
        />
        {/* Рейтинг */}
        {score > 0 && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            borderRadius: 8, padding: '3px 8px',
            fontSize: 12, fontWeight: 700, color: '#F5C842',
          }}>★ {score.toFixed(1)}</div>
        )}
        {/* Формат */}
        {format && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            borderRadius: 8, padding: '3px 8px',
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
          }}>{format}</div>
        )}
        {/* Кнопка избранного */}
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
        }}>{title}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {status && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '2px 7px', borderRadius: 5,
              background: `${statusColor}15`, color: statusColor,
            }}>{status}</span>
          )}
          {anime.episodes > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{anime.episodes} эп.</span>
          )}
          {year && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{year}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
