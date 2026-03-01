'use client';

import { useState, useTransition } from 'react';
import { updateUserEmail } from '@/app/actions/settings';

interface Props {
  currentEmail: string;
}

export function EmailForm({ currentEmail }: Props) {
  const [email, setEmail] = useState(currentEmail);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('idle');
    startTransition(async () => {
      const res = await updateUserEmail(email);
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(res.error ?? 'Ошибка');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm text-zinc-400">Email</label>
      <div className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
          required
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button
          type="submit"
          disabled={isPending || email.trim().toLowerCase() === currentEmail.toLowerCase()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {isPending ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
      {status === 'success' && (
        <p className="text-sm text-green-400">Email обновлён.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}
    </form>
  );
}
