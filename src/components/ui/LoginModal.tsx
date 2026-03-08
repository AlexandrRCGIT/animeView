'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthModal } from '@/lib/context/AuthModalContext';
import { TelegramLoginButton } from './TelegramLoginButton';

export function LoginModal() {
  const { open, closeLoginModal } = useAuthModal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const deviceLoginHref = `/auth/device?callbackUrl=${encodeURIComponent(pathname || '/')}`;
  const firstInputRef = useRef<HTMLInputElement>(null);
  const resetForm = useCallback(() => {
    setError('');
    setEmail('');
    setPassword('');
    setLoading(false);
  }, []);
  const handleClose = useCallback(() => {
    resetForm();
    closeLoginModal();
  }, [closeLoginModal, resetForm]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => firstInputRef.current?.focus(), 50);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError('Неверный email или пароль');
    } else {
      handleClose();
      router.refresh();
    }
  }

  async function handleDiscord() {
    await signIn('discord');
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: '#0F0F1A',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '36px 32px',
          position: 'relative',
        }}
      >
        {/* Закрыть */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', padding: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #E13C6E, #6C3CE1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: '#fff',
            fontFamily: 'var(--font-unbounded), sans-serif',
          }}>A</div>
          <h2 style={{
            margin: 0, fontSize: 20, fontWeight: 700, color: '#fff',
            fontFamily: 'var(--font-unbounded), sans-serif',
          }}>Войти в аккаунт</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Чтобы добавлять аниме в избранное
          </p>
        </div>

        {/* Discord */}
        <button
          onClick={handleDiscord}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#5865F2', border: 'none', borderRadius: 12,
            padding: '12px 20px', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', marginBottom: 20, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="20" height="15" viewBox="0 0 71 55" fill="currentColor">
            <path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.8a40.4 40.4 0 0 0-1.8 3.6 54.2 54.2 0 0 0-16.2 0A38.5 38.5 0 0 0 25.8.8 58.4 58.4 0 0 0 11.2 5C1.6 19.3-1 33.2.3 46.9a59 59 0 0 0 18 9.1 44 44 0 0 0 3.8-6.2 38.3 38.3 0 0 1-6-2.9l1.5-1.1a42.2 42.2 0 0 0 36 0l1.5 1.1a38.5 38.5 0 0 1-6 2.9 44 44 0 0 0 3.8 6.2 58.8 58.8 0 0 0 18-9.1c1.6-16-2.8-29.8-11.8-42ZM23.7 38.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.3 7.2 0 4-2.8 7.2-6.3 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.3 7.2 0 4-2.8 7.2-6.3 7.2Z"/>
          </svg>
          Войти через Discord
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <TelegramLoginButton callbackUrl={pathname || '/'} />
        </div>

        <Link
          href={deviceLoginHref}
          onClick={closeLoginModal}
          style={{
            width: '100%', height: 42,
            marginBottom: 16,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.88)',
            fontSize: 14,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textDecoration: 'none',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <path d="M8 20h8" />
            <path d="M12 18v2" />
          </svg>
          Войти по коду
        </Link>

        {/* Разделитель */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>или</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Ошибка */}
        {error && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(225,60,60,0.1)', border: '1px solid rgba(225,60,60,0.2)',
            color: '#E13C3C', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Форма */}
        <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            ref={firstInputRef}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '11px 14px',
              color: '#fff', fontSize: 14, outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '11px 14px',
              color: '#fff', fontSize: 14, outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: 10,
              padding: '12px 20px', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, marginTop: 4,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 20 }}>
          Нет аккаунта?{' '}
          <Link
            href="/auth/register"
            onClick={closeLoginModal}
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
