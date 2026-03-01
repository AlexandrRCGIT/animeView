'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserName, updateUserEmail } from '@/app/actions/settings';

interface Props {
  currentName: string;
  currentEmail: string;
  isDiscord: boolean;
}

const inputClass =
  'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] transition-colors w-full';

export function ProfileForm({ currentName, currentEmail, isDiscord }: Props) {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasChanges =
    name.trim() !== currentName ||
    (!isDiscord && email.trim().toLowerCase() !== currentEmail.toLowerCase());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('idle');

    startTransition(async () => {
      if (name.trim() !== currentName) {
        const res = await updateUserName(name);
        if (!res.ok) {
          setStatus('error');
          setErrorMsg(res.error ?? 'Ошибка');
          return;
        }
      }

      if (!isDiscord && email.trim().toLowerCase() !== currentEmail.toLowerCase()) {
        const res = await updateUserEmail(email);
        if (!res.ok) {
          setStatus('error');
          setErrorMsg(res.error ?? 'Ошибка');
          return;
        }
      }

      setStatus('success');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-zinc-400">Никнейм</label>
        <input
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setStatus('idle');
          }}
          maxLength={50}
          required
          className={inputClass}
        />
      </div>

      {!isDiscord && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-zinc-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setStatus('idle');
            }}
            required
            className={inputClass}
          />
        </div>
      )}

      {status === 'success' && <p className="text-sm text-green-400">Сохранено.</p>}
      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending || !hasChanges}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {isPending ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
