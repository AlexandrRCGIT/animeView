import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Header } from '@/components/ui/Header';

export const metadata = { title: 'Настройки — AnimeView' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect('/auth/signin?callbackUrl=/settings');

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Настройки</h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1">Аккаунт</p>
            <p className="text-white">{session.user?.name}</p>
            <p className="text-zinc-500 text-sm">{session.user?.email}</p>
          </div>
        </div>
      </main>
    </>
  );
}
