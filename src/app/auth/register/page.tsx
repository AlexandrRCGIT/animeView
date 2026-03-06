import Link from 'next/link';
import { registerUser } from '@/app/actions/auth';
import { BackButton } from '@/components/ui/BackButton';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  email_exists: 'Этот email уже зарегистрирован',
  invalid: 'Заполните все поля. Пароль — минимум 8 символов',
  default: 'Ошибка регистрации. Попробуйте снова.',
};

export default async function RegisterPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.default) : null;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <BackButton />
        </div>
        <Link href="/" className="block text-center text-2xl font-bold text-white mb-2">
          Anime<span className="text-violet-500">View</span>
        </Link>
        <p className="text-center text-zinc-500 text-sm mb-8">Создать аккаунт</p>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
            {errorMessage}
          </div>
        )}

        <form action={registerUser} className="flex flex-col gap-3">
          <input
            name="name"
            type="text"
            placeholder="Имя"
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <input
            name="password"
            type="password"
            placeholder="Пароль (мин. 8 символов)"
            required
            minLength={8}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Создать аккаунт
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Уже есть аккаунт?{' '}
          <Link href="/auth/signin" className="text-violet-400 hover:text-violet-300 transition-colors">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
