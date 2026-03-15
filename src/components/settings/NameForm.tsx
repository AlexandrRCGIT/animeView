'use client';

import { useState, useTransition } from 'react';
import { updateUserName } from '@/app/actions/settings';
import { USER_NAME_MAX_LENGTH, USER_NAME_MIN_LENGTH } from '@/lib/input-limits';

interface Props {
  currentName: string;
}

export function NameForm({ currentName }: Props) {
  const [name, setName] = useState(currentName);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('idle');
    startTransition(async () => {
      const res = await updateUserName(name);
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
      <label className="text-sm text-zinc-400">Никнейм</label>
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setStatus('idle'); }}
          minLength={USER_NAME_MIN_LENGTH}
          maxLength={USER_NAME_MAX_LENGTH}
          required
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button
          type="submit"
          disabled={isPending || name.trim() === currentName}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {isPending ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
      {status === 'success' && (
        <p className="text-sm text-green-400">Никнейм обновлён. Изменения отобразятся после повторного входа.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}
    </form>
  );
}
