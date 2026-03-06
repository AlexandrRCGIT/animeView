import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import { TelegramLoginButton } from '@/components/ui/TelegramLoginButton';

interface Props {
  searchParams: Promise<{ error?: string; callbackUrl?: string; success?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Неверный email или пароль',
  OAuthAccountNotLinked: 'Этот email уже используется другим способом входа',
  Default: 'Ошибка входа. Попробуйте снова.',
};

export default async function SignInPage({ searchParams }: Props) {
  const { error, callbackUrl, success } = await searchParams;
  const redirectTo = callbackUrl ?? '/';

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-2xl font-bold text-white mb-8">
          Anime<span className="text-violet-500">View</span>
        </Link>

        {success === 'registered' && (
          <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3">
            Аккаунт создан — можно войти
          </div>
        )}

        {/* Discord */}
        <form
          action={async () => {
            'use server';
            await signIn('discord', { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg py-2.5 px-4 text-sm font-medium transition-colors mb-6"
          >
            <svg width="20" height="15" viewBox="0 0 71 55" fill="currentColor">
              <path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.8a40.4 40.4 0 0 0-1.8 3.6 54.2 54.2 0 0 0-16.2 0A38.5 38.5 0 0 0 25.8.8 58.4 58.4 0 0 0 11.2 5C1.6 19.3-1 33.2.3 46.9a59 59 0 0 0 18 9.1 44 44 0 0 0 3.8-6.2 38.3 38.3 0 0 1-6-2.9l1.5-1.1a42.2 42.2 0 0 0 36 0l1.5 1.1a38.5 38.5 0 0 1-6 2.9 44 44 0 0 0 3.8 6.2 58.8 58.8 0 0 0 18-9.1c1.6-16-2.8-29.8-11.8-42ZM23.7 38.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.3 7.2 0 4-2.8 7.2-6.3 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.3 7.2 0 4-2.8 7.2-6.3 7.2Z" />
            </svg>
            Войти через Discord
          </button>
        </form>

        <div className="mb-6 flex justify-center">
          <TelegramLoginButton callbackUrl={redirectTo} />
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs text-zinc-500">
            <span className="bg-zinc-950 px-2">или</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
            {errorMessage}
          </div>
        )}

        {/* Credentials */}
        <form
          action={async (formData: FormData) => {
            'use server';
            try {
              await signIn('credentials', {
                email: formData.get('email'),
                password: formData.get('password'),
                redirectTo,
              });
            } catch (e) {
              if (e instanceof AuthError) {
                redirect(
                  `/auth/signin?error=${e.type}${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`
                );
              }
              throw e;
            }
          }}
          className="flex flex-col gap-3"
        >
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
            placeholder="Пароль"
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Войти
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Нет аккаунта?{' '}
          <Link href="/auth/register" className="text-violet-400 hover:text-violet-300 transition-colors">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
