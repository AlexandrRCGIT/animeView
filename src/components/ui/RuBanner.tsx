'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ru_banner_dismissed';
const TG_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'AnimeViewBoosterBot';

interface Props {
  isRussia: boolean;
}

export function RuBanner({ isRussia }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isRussia) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, [isRussia]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(600px, calc(100vw - 24px))',
      zIndex: 9999,
      borderRadius: 16,
      background: 'rgba(15, 15, 24, 0.97)',
      border: '1px solid rgba(140, 82, 255, 0.35)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      padding: '16px 18px',
    }}>
      {/* Закрыть */}
      <button
        onClick={dismiss}
        aria-label="Закрыть"
        style={{
          position: 'absolute', top: 10, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.35)', fontSize: 20, lineHeight: 1,
          padding: 4,
        }}
      >×</button>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Иконка */}
        <div style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: 10,
          background: 'rgba(140,82,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          🇷🇺
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: '#fff',
            margin: '0 0 6px', lineHeight: 1.4,
          }}>
            Вы заходите из России
          </p>
          <p style={{
            fontSize: 12, color: 'rgba(255,255,255,0.55)',
            margin: '0 0 12px', lineHeight: 1.6,
          }}>
            Мы используем Cloudflare — он защищает сайт от DDoS-атак,
            ускоряет загрузку и обеспечивает безопасное соединение.
            С июня 2025 года Cloudflare частично ограничен
            у российских провайдеров — из-за этого сайт может не открываться.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Кнопка Telegram */}
            <a
              href={`https://t.me/${TG_BOT}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #6C3CE1, #9B5DE5)',
                color: '#fff', borderRadius: 9, padding: '7px 14px',
                fontSize: 12, fontWeight: 600, textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.938-.918c-.64-.203-.652-.64.135-.954l11.566-4.461c.537-.194 1.006.131.961.887z"/>
              </svg>
              Бустер в Telegram
            </a>

            {/* Кнопка «уже работает» */}
            <button
              onClick={dismiss}
              style={{
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.5)',
                border: 'none', borderRadius: 9, padding: '7px 14px',
                fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              У меня всё работает
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
