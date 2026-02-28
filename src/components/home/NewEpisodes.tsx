'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface EpisodeItem {
  id: number;
  title: string;
  image: string;
}

interface Props {
  episodes: EpisodeItem[];
}

export function NewEpisodes({ episodes }: Props) {
  if (!episodes.length) return null;

  return (
    <section style={{ padding: '0 40px', maxWidth: 1400, margin: '0 auto 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#E13C3C',
            boxShadow: '0 0 12px #E13C3C88',
          }} className="animate-pulse" />
          <h2 style={{
            fontFamily: 'var(--font-unbounded), sans-serif', fontSize: 22, fontWeight: 700,
            color: '#fff', margin: 0, letterSpacing: '-0.02em',
          }}>Онгоинги сезона</h2>
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <Link href="/search?status=ongoing" style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 13,
          textDecoration: 'none', fontWeight: 500,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >Все →</Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 16,
      }}>
        {episodes.map((ep, i) => (
          <Link
            key={ep.id}
            href={`/anime/${ep.id}`}
            style={{
              position: 'relative', borderRadius: 16, overflow: 'hidden',
              aspectRatio: '3/4', display: 'block',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(-6px)';
              el.style.borderColor = 'rgba(255,255,255,0.15)';
              el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(0)';
              el.style.borderColor = 'rgba(255,255,255,0.06)';
              el.style.boxShadow = 'none';
            }}
          >
            {/* Постер */}
            <Image
              src={ep.image}
              alt={ep.title}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
            />

            {/* NEW бейдж */}
            <div style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(225,60,60,0.9)', borderRadius: 8,
              padding: '4px 8px', fontSize: 11, fontWeight: 700,
              color: '#fff', backdropFilter: 'blur(4px)',
            }}>NEW</div>

            {/* Номер */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'var(--font-unbounded), sans-serif',
              fontSize: 52, fontWeight: 900,
              color: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
            }}>{i + 1}</div>

            {/* Подпись */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: 14,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
            }}>
              <p style={{
                fontSize: 13, fontWeight: 700, color: '#fff',
                margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{ep.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
