'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TV_AUTH_POLL_INTERVAL_MS } from '@/lib/tv-auth';

type PollStatus = 'pending' | 'approved' | 'consumed' | 'expired' | 'cancelled';

interface CreatedSession {
  deviceId: string;
  code: string;
  expiresAt: string;
  verifyUrl: string;
  pollIntervalMs?: number;
}

interface PollResponse {
  status: PollStatus;
  expiresAt: string;
}

function formatSeconds(secondsLeft: number): string {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TvLoginPanel() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<CreatedSession | null>(null);
  const [status, setStatus] = useState<'loading' | 'waiting' | 'authorizing' | 'expired' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const pollInFlightRef = useRef(false);

  const qrUrl = useMemo(() => {
    if (!sessionData?.verifyUrl) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=0&data=${encodeURIComponent(sessionData.verifyUrl)}`;
  }, [sessionData?.verifyUrl]);

  const refreshSession = useCallback(async () => {
    setStatus('loading');
    setError(null);

    const response = await fetch('/api/tv-auth/session', { method: 'POST' });
    const payload = await response.json().catch(() => null) as
      | ({ ok: true } & CreatedSession)
      | { ok: false; error?: string }
      | null;

    if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
      setStatus('error');
      setError(payload && 'error' in payload && payload.error ? payload.error : 'Не удалось получить код входа');
      return;
    }

    setSessionData({
      deviceId: payload.deviceId,
      code: payload.code,
      expiresAt: payload.expiresAt,
      verifyUrl: payload.verifyUrl,
      pollIntervalMs: payload.pollIntervalMs,
    });
    setStatus('waiting');
  }, []);

  // Создаем первую сессию при открытии страницы
  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // Таймер до истечения кода
  useEffect(() => {
    if (!sessionData || (status !== 'waiting' && status !== 'authorizing')) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(sessionData.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && status === 'waiting') {
        setStatus('expired');
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [sessionData, status]);

  // Опрос статуса кода
  useEffect(() => {
    if (!sessionData || status !== 'waiting') return;

    const intervalMs = sessionData.pollIntervalMs ?? TV_AUTH_POLL_INTERVAL_MS;
    const interval = window.setInterval(async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;

      try {
        const response = await fetch(`/api/tv-auth/poll?deviceId=${encodeURIComponent(sessionData.deviceId)}`);
        const payload = await response.json().catch(() => null) as
          | { ok: true } & PollResponse
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
          if (response.status === 404 || response.status === 410) {
            setStatus('expired');
          } else {
            setStatus('error');
            setError(payload && 'error' in payload && payload.error ? payload.error : 'Ошибка проверки кода');
          }
          return;
        }

        if (payload.status === 'approved') {
          setStatus('authorizing');
          const signInResult = await signIn('tv-device', {
            device_id: sessionData.deviceId,
            redirect: false,
            callbackUrl: '/',
          });

          if (signInResult?.error) {
            setStatus('error');
            setError('Не удалось завершить вход. Обновите код и попробуйте снова.');
            return;
          }

          router.replace('/');
          router.refresh();
          return;
        }

        if (payload.status === 'consumed') {
          router.replace('/');
          router.refresh();
          return;
        }

        if (payload.status === 'expired' || payload.status === 'cancelled') {
          setStatus('expired');
        }
      } catch {
        setStatus('error');
        setError('Сбой сети при проверке статуса входа');
      } finally {
        pollInFlightRef.current = false;
      }
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [router, sessionData, status]);

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-sm p-6 md:p-8 shadow-2xl">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Вход на телевизоре</h1>
      <p className="text-zinc-400 text-sm md:text-base mb-6">
        Откройте ссылку на телефоне через QR-код и подтвердите вход в аккаунт.
      </p>

      {status === 'loading' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
          Генерируем код входа...
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300 text-sm">
          {error ?? 'Ошибка входа'}
        </div>
      )}

      {status === 'expired' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200 text-sm">
          Код истёк. Получите новый код и повторите вход.
        </div>
      )}

      {sessionData && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">
          <div>
            <div className="text-zinc-400 text-xs uppercase tracking-[0.16em] mb-2">Код входа</div>
            <div className="inline-flex items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10 px-5 py-3">
              <span className="font-mono text-4xl md:text-5xl font-extrabold text-violet-300 tracking-[0.2em]">
                {sessionData.code}
              </span>
            </div>

            <p className="text-zinc-400 text-sm mt-4 leading-relaxed">
              1. Откройте камеру на телефоне и отсканируйте QR.
              <br />
              2. Подтвердите вход на странице.
              <br />
              3. Телевизор войдёт автоматически.
            </p>

            <div className="mt-4 text-sm">
              {status === 'authorizing' ? (
                <span className="text-violet-300">Подтверждено. Выполняем вход...</span>
              ) : (
                <span className="text-zinc-400">
                  Код действует ещё: <span className="text-white font-semibold">{formatSeconds(secondsLeft)}</span>
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => void refreshSession()}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition-colors"
              >
                Обновить код
              </button>
              <a
                href={sessionData.verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm transition-colors"
              >
                Открыть ссылку вручную
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 flex items-center justify-center">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="QR-код для входа"
                width={280}
                height={280}
                className="rounded-lg w-full h-auto max-w-[280px]"
              />
            ) : (
              <div className="text-zinc-500 text-sm">QR недоступен</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
