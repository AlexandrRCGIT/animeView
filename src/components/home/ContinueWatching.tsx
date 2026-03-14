'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { proxifyImageUrl } from '@/lib/image-proxy';

interface WatchItem {
  shikimori_id: number;
  season: number;
  episode: number;
  progress_seconds: number | null;
  duration_seconds: number | null;
  is_completed: boolean;
  title: string;
  poster_url: string | null;
  year: number | null;
  anime_kind: string | null;
  episodes_count: number;
  last_episode: number | null;
}

function ProgressBar({ progress, duration }: { progress: number | null; duration: number | null }) {
  if (!progress || !duration || duration <= 0) return null;
  const pct = Math.min(100, Math.round((progress / duration) * 100));
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
      background: 'rgba(255,255,255,0.15)',
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: 'linear-gradient(90deg, #E13C6E, #6C3CE1)',
        transition: 'width 0.3s',
      }} />
    </div>
  );
}

function kindLabel(kind: string | null): string {
  switch (kind) {
    case 'tv': return 'TV';
    case 'movie': return 'Фильм';
    case 'ova': return 'OVA';
    case 'ona': return 'ONA';
    default: return kind ?? '';
  }
}

export function ContinueWatching() {
  const { status } = useSession();
  const [items, setItems] = useState<WatchItem[] | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/watch-progress/history?limit=6')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setItems(data.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const loading = items === null;
  if (status !== 'authenticated' || (!loading && (items?.length ?? 0) === 0)) return null;

  return (
    <section style={{ padding: '0 clamp(14px, 4vw, 40px)', marginBottom: 48 }}>
      <h2 style={{
        fontSize: 'clamp(18px, 2.8vw, 20px)', fontWeight: 700, color: '#fff',
        marginBottom: 20, letterSpacing: '-0.02em',
      }}>
        Продолжить просмотр
      </h2>

      {loading ? (
        <div style={{ display: 'flex', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              flex: '0 0 clamp(136px, 38vw, 160px)', height: 240, borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite',
            }} />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: 16,
          overflowX: 'auto', paddingBottom: 8,
        }}>
          {(items ?? []).map(item => (
            <Link
              key={item.shikimori_id}
              href={`/anime/${item.shikimori_id}`}
              style={{ textDecoration: 'none', flexShrink: 0 }}
            >
              <div style={{
                width: 'clamp(136px, 38vw, 160px)',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'transform 0.2s, border-color 0.2s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(108,60,225,0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                {/* Постер */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3' }}>
                  {item.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proxifyImageUrl(item.poster_url, 240)}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  )}

                  {/* Галочка если завершено */}
                  {item.is_completed && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(34,197,94,0.9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                  )}

                  {/* Прогресс-бар */}
                  <ProgressBar progress={item.progress_seconds} duration={item.duration_seconds} />
                </div>

                {/* Инфо */}
                <div style={{ padding: '8px 10px' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 4,
                  }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {kindLabel(item.anime_kind)}
                    {item.year ? ` · ${item.year}` : ''}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'rgba(108,60,225,0.9)',
                    marginTop: 3, fontWeight: 600,
                  }}>
                    {item.season > 1 ? `С${item.season} ` : ''}Серия {item.episode}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
