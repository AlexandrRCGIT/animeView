'use client';

import { useState } from 'react';
import { isValidTvCode, normalizeTvCode } from '@/lib/tv-auth';

interface Props {
  initialCode?: string;
}

export function TvLinkApprove({ initialCode = '' }: Props) {
  const [code, setCode] = useState(normalizeTvCode(initialCode));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const normalizedCode = normalizeTvCode(code);
  const codeValid = isValidTvCode(normalizedCode);

  async function approve() {
    if (!codeValid) {
      setStatus('error');
      setMessage('Введите корректный код из 6 символов.');
      return;
    }

    setStatus('submitting');
    setMessage(null);

    try {
      const response = await fetch('/api/tv-auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode }),
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
      <h1 className="text-xl font-bold text-white mb-2">Добавить устройство</h1>
      <p className="text-zinc-400 text-sm mb-4">
        Введите код, который показан на телевизоре, и подтвердите вход.
      </p>

      <label className="block mb-6">
        <span className="block text-xs text-zinc-500 uppercase tracking-[0.12em] mb-2">Код устройства</span>
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Например: A7K9P2"
          maxLength={6}
          value={code}
          onChange={(event) => {
            setCode(normalizeTvCode(event.target.value));
            if (message) setMessage(null);
            if (status !== 'idle') setStatus('idle');
          }}
          className="w-full h-12 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-violet-500 outline-none px-3 text-center text-lg font-mono tracking-[0.22em] text-zinc-100 uppercase"
        />
      </label>

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
        disabled={status === 'submitting' || status === 'success' || !codeValid}
        className="w-full h-11 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {status === 'submitting' ? 'Подтверждаем...' : status === 'success' ? 'Подтверждено' : 'Подтвердить вход'}
      </button>
    </div>
  );
}
