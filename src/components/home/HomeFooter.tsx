'use client';

import Link from 'next/link';

export function HomeFooter() {
  return (
    <footer style={{
      padding: '40px', maxWidth: 1400, margin: '0 auto',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'linear-gradient(135deg, #E13C6E, #6C3CE1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900, color: '#fff',
          fontFamily: 'var(--font-unbounded), sans-serif',
        }}>A</div>
        <span style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.4)',
        }}>AnimeView</span>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {[
          { label: 'Каталог', href: '/search' },
          { label: 'Избранное', href: '/favorites' },
        ].map(({ label, href }) => (
          <Link key={label} href={href} style={{
            color: 'rgba(255,255,255,0.3)', fontSize: 13,
            textDecoration: 'none', transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >{label}</Link>
        ))}
      </div>
    </footer>
  );
}
