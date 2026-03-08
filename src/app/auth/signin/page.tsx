import Link from 'next/link';
import { signIn } from '@/auth';
import { TelegramLoginButton } from '@/components/ui/TelegramLoginButton';
import { BackButton } from '@/components/ui/BackButton';
import { LoginForm } from '@/components/auth/LoginForm';

interface Props {
  searchParams: Promise<{ callbackUrl?: string; success?: string }>;
}

export const metadata = { title: 'Вход — AnimeView' };

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl, success } = await searchParams;
  const redirectTo = callbackUrl ?? '/';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <BackButton />
        </div>
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

        <Link
          href={`/auth/device?callbackUrl=${encodeURIComponent(redirectTo)}`}
          className="w-full mb-6 flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-900 text-zinc-200 text-sm font-medium py-2.5 px-4 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <path d="M8 20h8" />
            <path d="M12 18v2" />
          </svg>
          Войти по коду
        </Link>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs text-zinc-500">
            <span className="bg-zinc-950 px-2">или</span>
          </div>
        </div>

        <LoginForm callbackUrl={redirectTo} />

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
