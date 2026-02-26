import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { Header } from '@/components/ui/Header';
import { FavStylePicker } from '@/components/ui/FavStylePicker';
import { SignOutButton } from '@/components/ui/SignOutButton';
import type { FavStyle } from '@/app/actions/settings';

export const metadata = { title: 'Настройки — AnimeView' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect('/auth/signin?callbackUrl=/settings');

  const favStyle = ((await cookies()).get('fav_style')?.value ?? 'icon') as FavStyle;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-white">Настройки</h1>

        {/* Предпочтение избранного */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
          <div>
            <p className="text-base font-semibold text-white">Кнопка «Избранное»</p>
            <p className="text-sm text-zinc-500 mt-0.5">Выберите, как добавлять тайтлы в избранное на странице аниме</p>
          </div>
          <FavStylePicker value={favStyle} />
        </section>

        {/* Аккаунт */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
          <p className="text-base font-semibold text-white">Аккаунт</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold">
              {(session.user?.name ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{session.user?.name}</p>
              {session.user?.email && (
                <p className="text-xs text-zinc-500">{session.user.email}</p>
              )}
            </div>
          </div>
          <SignOutButton />
        </section>
      </main>
    </>
  );
}
