'use client';

import Image from 'next/image';
import Link from 'next/link';

export function HomeFooter() {
  return (
    <footer style={{
      width: 'min(1400px, calc(100% - clamp(28px, 8vw, 80px)))',
      padding: 'clamp(16px, 4vw, 40px)',
      margin: '0 auto',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Image src="/icons/pwa-192.png" alt="AnimeView" width={24} height={24} style={{ borderRadius: 6 }} />
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

      <a href="https://webmaster.yandex.ru/siteinfo/?site=https://anime-view.org" target="_blank" rel="noreferrer" style={{ opacity: 0.6, transition: 'opacity 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://yandex.ru/cycounter?https://anime-view.org&theme=dark&lang=ru"
          width={88}
          height={31}
          alt="Яндекс.ИКС"
          style={{ borderRadius: 6, display: 'block' }}
        />
      </a>
    </footer>
  );
}
