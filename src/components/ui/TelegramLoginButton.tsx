'use client';

import { useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

interface Props {
  callbackUrl?: string;
  className?: string;
}

export function TelegramLoginButton({ callbackUrl = '/', className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !botUsername) return;

    window.onTelegramAuth = async (user: TelegramUser) => {
      await signIn('telegram', {
        id: String(user.id),
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        username: user.username ?? '',
        photo_url: user.photo_url ?? '',
        auth_date: String(user.auth_date),
        hash: user.hash,
        callbackUrl,
      });
    };

    container.innerHTML = '';
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?23';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
      delete window.onTelegramAuth;
    };
  }, [botUsername, callbackUrl]);

  if (!botUsername) return null;

  return <div className={className} ref={containerRef} />;
}
