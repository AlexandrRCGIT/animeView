'use client';

import { useState, useRef, useEffect } from 'react';
import { submitFeedback } from '@/app/actions/feedback';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setStatus('loading');
    const res = await submitFeedback({
      text,
      email: email || undefined,
      telegram: telegram || undefined,
      page_url: window.location.pathname,
    });
    if (res.ok) {
      setStatus('done');
      setTimeout(() => {
        setOpen(false);
        setStatus('idle');
        setText('');
        setEmail('');
        setTelegram('');
      }, 2000);
    } else {
      setStatus('error');
      setErrorMsg(res.error ?? 'Ошибка');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Оставить отзыв"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 900,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(108,60,225,0.9)',
          border: '1px solid rgba(108,60,225,0.5)',
          boxShadow: '0 4px 20px rgba(108,60,225,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.18s, box-shadow 0.18s',
          backdropFilter: 'blur(8px)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(108,60,225,0.6)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(108,60,225,0.4)';
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
            animation: 'fb-fade 0.18s ease both',
          }}
        />
      )}

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 84,
            right: 24,
            zIndex: 1001,
            width: 'min(360px, calc(100vw - 32px))',
            background: '#13131C',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 18,
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            animation: 'fb-slide 0.22s cubic-bezier(0.4,0,0.2,1) both',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`
            @keyframes fb-fade  { from { opacity: 0 } to { opacity: 1 } }
            @keyframes fb-slide { from { opacity: 0; transform: translateY(12px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
            .fb-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.18s; }
            .fb-input:focus { border-color: rgba(108,60,225,0.5); }
            .fb-input::placeholder { color: rgba(255,255,255,0.3); }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 0' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Обратная связь</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Пожелания, баги, идеи — всё приветствуется</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 20, padding: 4, lineHeight: 1 }}
            >×</button>
          </div>

          {status === 'done' ? (
            <div style={{ padding: '32px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 15 }}>Спасибо за отзыв!</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>Мы обязательно прочитаем</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                ref={textareaRef}
                className="fb-input"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Напиши что думаешь..."
                rows={4}
                maxLength={2000}
                required
                style={{ resize: 'none', padding: '10px 12px', lineHeight: 1.5 }}
              />

              <input
                className="fb-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email (необязательно)"
                style={{ padding: '9px 12px' }}
              />

              <input
                className="fb-input"
                type="text"
                value={telegram}
                onChange={e => setTelegram(e.target.value)}
                placeholder="Telegram @username (необязательно)"
                style={{ padding: '9px 12px' }}
              />

              {status === 'error' && (
                <div style={{ color: '#f87171', fontSize: 12, padding: '4px 0' }}>{errorMsg}</div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !text.trim()}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  background: text.trim() ? '#6C3CE1' : 'rgba(108,60,225,0.3)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: text.trim() ? 'pointer' : 'default',
                  transition: 'background 0.18s',
                  marginTop: 2,
                }}
              >
                {status === 'loading' ? 'Отправляем...' : 'Отправить'}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
