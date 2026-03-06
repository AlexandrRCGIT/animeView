'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AuthButton } from '@/components/ui/AuthButton';

const ABOUT_LINKS = [
  { label: 'Контакты',                    href: '/contacts' },
  { label: 'Политика конфиденциальности', href: '/privacy' },
  { label: 'Пользовательское соглашение', href: '/terms' },
];

function AboutMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter() {
    if (closeTimer[0]) clearTimeout(closeTimer[0]);
    setOpen(true);
  }

  function handleLeave() {
    closeTimer[1](setTimeout(() => setOpen(false), 200));
  }

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.01em',
        transition: 'color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
      >
        О сайте
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Невидимый мост между кнопкой и меню — предотвращает закрытие при переходе */}
      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, height: 12 }} />

      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', left: 0,
        background: 'rgba(14,14,22,0.97)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
        padding: '6px 0', minWidth: 220,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transform: open ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'opacity 0.2s, transform 0.2s',
        zIndex: 200,
      }}>
        {ABOUT_LINKS.map(({ label, href }) => (
          <Link key={href} href={href} style={{
            display: 'block', padding: '9px 16px',
            color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
            fontSize: 13, fontWeight: 500, transition: 'color 0.15s, background 0.15s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              e.currentTarget.style.background = 'transparent';
            }}
          >{label}</Link>
        ))}
      </div>
    </div>
  );
}

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [displayName, setDisplayName] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/me')
      .then(r => r.json())
      .then((data: { name: string | null }) => { if (data.name) setDisplayName(data.name); })
      .catch(() => {});
  }, [session?.user?.id]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
  }

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(8,8,14,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.5)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Левая часть: логотип + ссылки */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #E13C6E, #6C3CE1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 900, color: '#fff',
            fontFamily: 'var(--font-unbounded), sans-serif',
            boxShadow: '0 0 20px rgba(108,60,225,0.4)',
            flexShrink: 0,
          }}>A</div>
          <span style={{
            fontFamily: 'var(--font-unbounded), sans-serif', fontWeight: 700,
            fontSize: 18, color: '#fff', letterSpacing: '-0.02em',
          }}>AnimeView</span>
        </Link>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {[
            { label: 'Каталог', href: '/search' },
            { label: 'Избранное', href: '/favorites' },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{
              color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
              fontSize: 14, fontWeight: 500, transition: 'color 0.2s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            >{label}</Link>
          ))}
          <AboutMenu />
        </div>
      </div>

      {/* Правая часть: поиск + авторизация */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <form onSubmit={handleSearch} style={{
          display: 'flex', alignItems: 'center',
          background: searchOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
          borderRadius: 12, padding: searchOpen ? '8px 16px' : 8,
          border: searchOpen ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          width: searchOpen ? 280 : 36, overflow: 'hidden',
        }}>
          <button
            type="button"
            onClick={() => setSearchOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          {searchOpen && (
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск аниме..."
              style={{
                background: 'none', border: 'none', outline: 'none', color: '#fff',
                fontSize: 14, marginLeft: 10, width: '100%',
              }}
            />
          )}
        </form>

        <AuthButton session={session ? {
          ...session,
          user: { ...session.user, name: displayName ?? session.user?.name },
        } : null} />
      </div>
    </nav>
  );
}
