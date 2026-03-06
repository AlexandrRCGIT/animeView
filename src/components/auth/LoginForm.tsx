'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

interface Props {
  callbackUrl: string;
}

type ErrorType = 'no_account' | 'wrong_password' | 'default' | null;

export function LoginForm({ callbackUrl }: Props) {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState<ErrorType>(null);
  const [pending, setPending] = useState(false);

  const noAccount    = error === 'no_account';
  const wrongPass    = error === 'wrong_password';
  const defaultError = error === 'default';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      // 1. Проверяем существование email
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const { exists } = await checkRes.json() as { exists: boolean };

      if (!exists) {
        setError('no_account');
        setPending(false);
        return;
      }

      // 2. Пробуем войти
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('wrong_password');
        setPending(false);
        return;
      }

      // 3. Успех — переходим на callbackUrl
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('default');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={`w-full bg-zinc-900 border rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            noAccount
              ? 'border-amber-500/60 focus:border-amber-500'
              : 'border-zinc-800 focus:border-violet-500'
          }`}
        />
        {noAccount && (
          <p className="text-xs text-amber-400 px-1">
            Аккаунт с этим email не найден.{' '}
            <Link
              href="/auth/register"
              className="underline hover:text-amber-300 transition-colors"
            >
              Зарегистрироваться?
            </Link>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <input
          name="password"
          type="password"
          placeholder="Пароль"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={`w-full bg-zinc-900 border rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            wrongPass
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-zinc-800 focus:border-violet-500'
          }`}
        />
        {wrongPass && (
          <p className="text-xs text-red-400 px-1">Неверный пароль</p>
        )}
      </div>

      {defaultError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
          Ошибка входа. Попробуй снова.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        {pending ? 'Входим...' : 'Войти'}
      </button>
    </form>
  );
}
