'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/admin/kodik', label: 'Kodik' },
  { href: '/admin/rutube', label: 'Rutube' },
  { href: '/admin/online', label: 'Онлайн' },
  { href: '/admin/dmca', label: 'DMCA' },
];

export function AdminHeader({ title }: { title: string }) {
  const pathname = usePathname();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 32,
      flexWrap: 'wrap',
      paddingBottom: 16,
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* Ссылка на главную */}
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        textDecoration: 'none',
        padding: '4px 10px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        whiteSpace: 'nowrap',
      }}>
        ← Сайт
      </Link>

      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 16 }}>|</span>

      {/* Навигация по admin-разделам */}
      {NAV_LINKS.map(link => {
        const active = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} style={{
            color: active ? '#fff' : 'rgba(255,255,255,0.4)',
            fontSize: 13,
            textDecoration: 'none',
            padding: '4px 10px',
            borderRadius: 8,
            background: active ? 'rgba(108,60,225,0.25)' : 'transparent',
            border: active ? '1px solid rgba(108,60,225,0.4)' : '1px solid transparent',
            whiteSpace: 'nowrap',
          }}>
            {link.label}
          </Link>
        );
      })}

      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 16 }}>|</span>

      {/* Текущий раздел */}
      <h1 style={{
        margin: 0,
        fontSize: 18,
        fontWeight: 800,
        fontFamily: 'var(--font-unbounded), sans-serif',
        color: '#fff',
      }}>
        {title}
      </h1>
    </div>
  );
}
