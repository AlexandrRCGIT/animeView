'use client';

import Link from 'next/link';
import { SHIKIMORI_GENRES } from '@/lib/api/shikimori';

const COLORS = ['#E13C6E', '#6C3CE1', '#3CE1A8', '#3C7EE1', '#E1C13C', '#E13C3C'];

export function GenreCloud() {
  return (
    <section style={{ padding: '0 40px', maxWidth: 1400, margin: '0 auto 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h2 style={{
          fontFamily: 'var(--font-unbounded), sans-serif', fontSize: 22, fontWeight: 700,
          color: '#fff', margin: 0, letterSpacing: '-0.02em',
        }}>Жанры</h2>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {SHIKIMORI_GENRES.map((g, i) => {
          const c = COLORS[i % COLORS.length];
          return (
            <Link
              key={g.value}
              href={`/search?genre=${g.value}`}
              style={{
                padding: '10px 20px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = `${c}15`;
                el.style.borderColor = `${c}44`;
                el.style.color = c;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = 'rgba(255,255,255,0.03)';
                el.style.borderColor = 'rgba(255,255,255,0.08)';
                el.style.color = 'rgba(255,255,255,0.6)';
              }}
            >{g.label}</Link>
          );
        })}
      </div>
    </section>
  );
}
