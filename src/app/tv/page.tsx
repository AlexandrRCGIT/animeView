import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { TvLoginPanel } from '@/components/auth/TvLoginPanel';

export const metadata = {
  title: 'Вход на ТВ — AnimeView',
};

export default async function TvPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-[#08080E] text-zinc-100 px-4 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link href="/" className="text-2xl font-bold text-white">
            Anime<span className="text-violet-500">View</span>
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Обычный вход
          </Link>
        </div>

        {session?.user?.id ? (
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Вы уже авторизованы</h1>
            <p className="text-zinc-400 mb-6">
              Аккаунт: <span className="text-zinc-200">{session.user.name ?? session.user.id}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >
                Перейти на главную
              </Link>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/tv' });
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-colors"
                >
                  Выйти и войти другим аккаунтом
                </button>
              </form>
            </div>
          </div>
        ) : (
          <TvLoginPanel />
        )}
      </div>
    </main>
  );
}
