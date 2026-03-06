'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem('cookie_consent', '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: 'calc(100% - 48px)', maxWidth: 560,
      background: 'rgba(18,18,28,0.95)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    }}>
      <p style={{ flex: 1, minWidth: 200, fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
        Мы используем файлы куки для авторизации и сохранения настроек.{' '}
        <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>
          Подробнее
        </Link>
      </p>
      <button
        onClick={accept}
        style={{
          flexShrink: 0,
          background: 'linear-gradient(135deg, #E13C6E, #6C3CE1)',
          border: 'none', borderRadius: 10, padding: '8px 20px',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Понятно
      </button>
    </div>
  );
}
