'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AuthButton } from '@/components/ui/AuthButton';
import { proxifyImageUrl } from '@/lib/image-proxy';

interface SuggestResult {
  shikimori_id: number;
  title: string;
  title_orig: string | null;
  poster_url: string | null;
  year: number | null;
  anime_kind: string | null;
}

interface MePayload {
  name: string | null;
  isAdmin?: boolean;
  unread?: {
    news?: boolean;
    info?: boolean;
  };
}

interface MenuLink {
  label: string;
  href: string;
  highlight?: boolean;
}

function DotBadge() {
  return (
    <span
      aria-label="new"
      style={{
        width: 6,
        height: 6,
        borderRadius: '999px',
        background: '#E13C6E',
        boxShadow: '0 0 10px rgba(225,60,110,0.9)',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

function DropdownMenu({ label, links }: { label: string; links: MenuLink[] }) {
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
    <div style={{ position: 'relative' }} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          letterSpacing: '0.01em',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(event) => (event.currentTarget.style.color = '#fff')}
        onMouseLeave={(event) => (event.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
      >
        {label}
        {links.some((link) => Boolean(link.highlight)) && <DotBadge />}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, height: 12 }} />

      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          background: 'rgba(14,14,22,0.97)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '6px 0',
          minWidth: 220,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'opacity 0.2s, transform 0.2s',
          zIndex: 200,
        }}
      >
        {links.map(({ label: itemLabel, href, highlight }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '9px 16px',
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = '#fff';
              event.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              event.currentTarget.style.background = 'transparent';
            }}
          >
            <span>{itemLabel}</span>
            {highlight && <DotBadge />}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState({ news: false, info: false });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestCacheRef = useRef<Map<string, SuggestResult[]>>(new Map());
  const searchRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ?? null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const apply = () => setIsMobile(media.matches);
    apply();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
    media.addListener(apply);
    return () => media.removeListener(apply);
  }, []);

  useEffect(() => {
    if (!sessionUserId) return;

    fetch('/api/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: MePayload) => {
        if (data.name) setDisplayName(data.name);
        setIsAdmin(Boolean(data.isAdmin));
        setUnread({
          news: Boolean(data.unread?.news),
          info: Boolean(data.unread?.info),
        });
      })
      .catch(() => {});
  }, [sessionUserId, pathname]);

  const fetchSuggestions = useCallback((value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }

    const normalized = value.trim().toLowerCase();
    const cached = suggestCacheRef.current.get(normalized);
    if (cached) {
      setSuggestions(cached);
      setSuggestOpen(cached.length > 0);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search-suggest?q=${encodeURIComponent(value)}`, { cache: 'force-cache' })
        .then((response) => response.json())
        .then((data) => {
          const results = (data.results ?? []) as SuggestResult[];
          suggestCacheRef.current.set(normalized, results);
          setSuggestions(results);
          setSuggestOpen(results.length > 0);
        })
        .catch(() => {});
    }, 280);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
    setSuggestOpen(false);
    setQuery('');
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    fetchSuggestions(value);
  }

  function handleSuggestClick(id: number) {
    setSuggestOpen(false);
    setSearchOpen(false);
    setQuery('');
    router.push(`/anime/${id}`);
  }

  const effectiveDisplayName = sessionUserId ? displayName : null;
  const effectiveIsAdmin = sessionUserId ? isAdmin : false;
  const effectiveUnread = sessionUserId ? unread : { news: false, info: false };

  const newsHighlighted = effectiveUnread.news && !pathname.startsWith('/news');
  const infoHighlighted = effectiveUnread.info && !pathname.startsWith('/info');

  const aboutLinks: MenuLink[] = [
    { label: 'Информация по продукту', href: '/info', highlight: infoHighlighted },
    { label: 'Контакты', href: '/contacts' },
    { label: 'Политика конфиденциальности', href: '/privacy' },
    { label: 'Пользовательское соглашение', href: '/terms' },
  ];

  const adminLinks: MenuLink[] = [
    { label: 'Kodik добавление', href: '/admin/kodik' },
    { label: 'Rutube', href: '/admin/rutube' },
    { label: 'Онлайн сейчас', href: '/admin/online' },
  ];

  const navLinks = [
    { label: 'Каталог', href: '/search', highlight: false },
    { label: 'Новости', href: '/news', highlight: newsHighlighted },
    { label: 'Избранное', href: '/favorites', highlight: false },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: isMobile ? '0 12px' : '0 40px',
        height: isMobile ? 60 : 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(8,8,14,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.5)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 32, minWidth: 0 }}>
        <Link href="/" data-tv-default="true" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #E13C6E, #6C3CE1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 900,
              color: '#fff',
              fontFamily: 'var(--font-unbounded), sans-serif',
              boxShadow: '0 0 20px rgba(108,60,225,0.4)',
              flexShrink: 0,
            }}
          >
            A
          </div>
          <span
            style={{
              fontFamily: 'var(--font-unbounded), sans-serif',
              fontWeight: 700,
              fontSize: isMobile ? 16 : 18,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            AnimeView
          </span>
        </Link>

        {!isMobile && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {navLinks.map(({ label, href, highlight }) => (
              <Link
                key={label}
                href={href}
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  letterSpacing: '0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(event) => (event.currentTarget.style.color = '#fff')}
                onMouseLeave={(event) => (event.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              >
                {label}
                {highlight && <DotBadge />}
              </Link>
            ))}
            <DropdownMenu label="О сайте" links={aboutLinks} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, minWidth: 0 }}>
        {!isMobile && effectiveIsAdmin && <DropdownMenu label="Админ панель" links={adminLinks} />}

        <div ref={searchRef} style={{ position: 'relative' }}>
          <form
            onSubmit={handleSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: searchOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              borderRadius: 12,
              padding: searchOpen ? '8px 16px' : 8,
              border: searchOpen ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              width: searchOpen ? (isMobile ? 170 : 280) : 36,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            {searchOpen && (
              <input
                autoFocus
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder="Поиск аниме..."
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 14,
                  marginLeft: 10,
                  width: '100%',
                }}
              />
            )}
          </form>

          {suggestOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: isMobile ? 'min(92vw, 340px)' : 320,
                background: 'rgba(14,14,22,0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                overflow: 'hidden',
                zIndex: 300,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.shikimori_id}
                  onClick={() => handleSuggestClick(suggestion.shikimori_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(event) => (event.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(event) => (event.currentTarget.style.background = 'none')}
                >
                  {suggestion.poster_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proxifyImageUrl(suggestion.poster_url, 120)}
                      alt=""
                      style={{ width: 32, height: 46, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {suggestion.title}
                    </div>
                    {suggestion.title_orig && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.35)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {suggestion.title_orig}
                      </div>
                    )}
                    {suggestion.year && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                        {suggestion.anime_kind === 'tv' ? 'TV' : suggestion.anime_kind} · {suggestion.year}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                  setSuggestOpen(false);
                  setSearchOpen(false);
                  setQuery('');
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(108,60,225,0.1)',
                  border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  color: '#a78bfa',
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(event) => (event.currentTarget.style.background = 'rgba(108,60,225,0.2)')}
                onMouseLeave={(event) => (event.currentTarget.style.background = 'rgba(108,60,225,0.1)')}
              >
                Показать все результаты →
              </button>
            </div>
          )}
        </div>

        <AuthButton
          session={
            session
              ? {
                  ...session,
                  user: { ...session.user, name: effectiveDisplayName ?? session.user?.name },
                }
              : null
          }
        />
      </div>
    </nav>
  );
}
