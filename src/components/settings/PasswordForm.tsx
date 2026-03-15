'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserPassword } from '@/app/actions/settings';
import { USER_PASSWORD_MAX_LENGTH, USER_PASSWORD_MIN_LENGTH } from '@/lib/input-limits';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function PasswordInput({
  placeholder,
  value,
  onChange,
  maxLength,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        required
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-white outline-none focus:border-[var(--accent)] transition-colors w-full"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
        tabIndex={-1}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('idle');

    if (newPwd.length < USER_PASSWORD_MIN_LENGTH) {
      setStatus('error');
      setErrorMsg(`Новый пароль должен быть не менее ${USER_PASSWORD_MIN_LENGTH} символов`);
      return;
    }
    if (
      current.length > USER_PASSWORD_MAX_LENGTH ||
      newPwd.length > USER_PASSWORD_MAX_LENGTH ||
      confirm.length > USER_PASSWORD_MAX_LENGTH
    ) {
      setStatus('error');
      setErrorMsg(`Максимальная длина пароля: ${USER_PASSWORD_MAX_LENGTH} символов`);
      return;
    }
    if (newPwd !== confirm) {
      setStatus('error');
      setErrorMsg('Пароли не совпадают');
      return;
    }

    startTransition(async () => {
      const res = await updateUserPassword(current, newPwd);
      if (res.ok) {
        setStatus('success');
        setCurrent('');
        setNewPwd('');
        setConfirm('');
        router.refresh();
      } else {
        setStatus('error');
        setErrorMsg(res.error ?? 'Ошибка');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm text-zinc-400">Смена пароля</label>

      <PasswordInput
        placeholder="Текущий пароль"
        value={current}
        onChange={v => { setCurrent(v); setStatus('idle'); }}
        maxLength={USER_PASSWORD_MAX_LENGTH}
      />
      <PasswordInput
        placeholder={`Новый пароль (от ${USER_PASSWORD_MIN_LENGTH} символов)`}
        value={newPwd}
        onChange={v => { setNewPwd(v); setStatus('idle'); }}
        maxLength={USER_PASSWORD_MAX_LENGTH}
      />
      <PasswordInput
        placeholder="Подтвердите новый пароль"
        value={confirm}
        onChange={v => { setConfirm(v); setStatus('idle'); }}
        maxLength={USER_PASSWORD_MAX_LENGTH}
      />

      {status === 'success' && <p className="text-sm text-green-400">Пароль успешно изменён.</p>}
      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending || !current || !newPwd || !confirm}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {isPending ? 'Сохранение...' : 'Изменить пароль'}
        </button>
      </div>
    </form>
  );
}
