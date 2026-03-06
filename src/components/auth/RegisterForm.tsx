'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerUser } from '@/app/actions/auth';

const ERROR_MESSAGES = {
  email_exists: 'Этот email уже зарегистрирован — попробуй войти',
  invalid:      'Заполни все поля. Пароль — минимум 8 символов',
  default:      'Ошибка регистрации. Попробуй снова.',
};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerUser, null);

  const errorMessage = state?.error ? ERROR_MESSAGES[state.error] : null;
  const isEmailTaken = state?.error === 'email_exists';

  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="name"
        type="text"
        placeholder="Имя"
        required
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
      />

      <div className="flex flex-col gap-1">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className={`w-full bg-zinc-900 border rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            isEmailTaken
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-zinc-800 focus:border-violet-500'
          }`}
        />
        {isEmailTaken && (
          <p className="text-xs text-red-400 px-1">
            Этот email уже используется.{' '}
            <Link href="/auth/signin" className="underline hover:text-red-300 transition-colors">
              Войти?
            </Link>
          </p>
        )}
      </div>

      <input
        name="password"
        type="password"
        placeholder="Пароль (мин. 8 символов)"
        required
        minLength={8}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
      />

      {errorMessage && !isEmailTaken && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        {pending ? 'Создаём аккаунт...' : 'Создать аккаунт'}
      </button>
    </form>
  );
}
