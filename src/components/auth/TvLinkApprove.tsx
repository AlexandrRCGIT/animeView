'use client';

import { useState } from 'react';

interface Props {
  code: string;
}

export function TvLinkApprove({ code }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function approve() {
    setStatus('submitting');
    setMessage(null);

    try {
      const response = await fetch('/api/tv-auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json().catch(() => null) as
        | { ok: true }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
        setStatus('error');
        setMessage(payload && 'error' in payload && payload.error ? payload.error : 'Не удалось подтвердить вход');
        return;
      }

      setStatus('success');
      setMessage('Вход подтверждён. Вернитесь к телевизору — авторизация завершится автоматически.');
    } catch {
      setStatus('error');
      setMessage('Сетевая ошибка. Попробуйте ещё раз.');
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-2xl">
      <h1 className="text-xl font-bold text-white mb-2">Подтвердить вход на ТВ</h1>
      <p className="text-zinc-400 text-sm mb-4">Код устройства</p>

      <div className="mb-6 inline-flex items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2">
        <span className="font-mono text-3xl font-extrabold text-violet-300 tracking-[0.16em]">
          {code}
        </span>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            status === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-200'
              : 'bg-red-500/10 border border-red-500/30 text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <button
        onClick={() => void approve()}
        disabled={status === 'submitting' || status === 'success'}
        className="w-full h-11 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {status === 'submitting' ? 'Подтверждаем...' : status === 'success' ? 'Подтверждено' : 'Подтвердить вход'}
      </button>
    </div>
  );
}
