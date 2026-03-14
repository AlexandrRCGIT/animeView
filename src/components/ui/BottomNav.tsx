'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const NAV_ITEMS = [
  {
    label: 'Главная',
    href: '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    label: 'Каталог',
    href: '/search',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    ),
  },
  {
    label: 'Новости',
    href: '/news',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16v14H4z"/>
        <path d="M8 9h8"/>
        <path d="M8 13h5"/>
      </svg>
    ),
  },
  {
    label: 'Избранное',
    href: '/favorites',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
  {
    label: 'История',
    href: '/history',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    ),
  },
  {
    label: 'Профиль',
    href: '/settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const isAuth = status === 'authenticated';
  const [newsUnread, setNewsUnread] = useState(false);

  useEffect(() => {
    if (!isAuth) {
      setNewsUnread(false);
      return;
    }
    fetch('/api/content/unread', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { news?: boolean }) => setNewsUnread(Boolean(data.news)))
      .catch(() => {});
  }, [isAuth, pathname]);

  const items = isAuth
    ? NAV_ITEMS
    : NAV_ITEMS.filter(i => i.href !== '/favorites' && i.href !== '/history');

  return (
    <nav style={{
      display: 'none',
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(8,8,14,0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
    }}
      className="bottom-nav"
    >
      <div style={{
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        {items.map(({ label, href, icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          const hasUnread = href === '/news' && newsUnread && !pathname.startsWith('/news');
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '4px 12px', textDecoration: 'none',
              color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              transition: 'color 0.2s',
              position: 'relative',
            }}>
              {icon}
              {hasUnread && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    width: 7,
                    height: 7,
                    borderRadius: '999px',
                    background: '#E13C6E',
                    boxShadow: '0 0 10px rgba(225,60,110,0.9)',
                  }}
                />
              )}
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
