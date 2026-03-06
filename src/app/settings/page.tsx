import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/ui/Header';
import { BackButton } from '@/components/ui/BackButton';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { PasswordForm } from '@/components/settings/PasswordForm';
import { ThemePicker } from '@/components/settings/ThemePicker';

export const metadata = { title: 'Настройки — AnimeView' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect('/auth/signin?callbackUrl=/settings');

  const userId = session.user.id;
  const isOAuth = userId.startsWith('discord:') || userId.startsWith('telegram:');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();

  const currentName = profile?.display_name ?? session.user.name ?? '';

  // Для credentials-пользователей читаем email из БД, а не из JWT (JWT кешируется до ре-логина)
  let currentEmail = session.user.email ?? '';
  if (!isOAuth) {
    const dbId = userId.startsWith('credentials:') ? userId.slice('credentials:'.length) : userId;
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', dbId)
      .maybeSingle();
    if (userData?.email) currentEmail = userData.email;
  }

  const themeAccent = (await cookies()).get('theme_accent')?.value ?? '#6C3CE1';

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-[720px] flex flex-col gap-6">
        <div>
          <BackButton />
          <h1 className="text-2xl font-bold text-white mt-4">Настройки</h1>
        </div>

        {/* Профиль */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-5">
          <p className="text-base font-semibold text-white">Профиль</p>

          <ProfileForm
            currentName={currentName}
            currentEmail={currentEmail}
            isOAuth={isOAuth}
          />

          {!isOAuth && (
            <>
              <div className="border-t border-zinc-800" />
              <PasswordForm />
            </>
          )}
        </section>

        {/* Оформление */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-5">
          <p className="text-base font-semibold text-white">Оформление</p>
          <ThemePicker current={themeAccent} />
        </section>
      </main>
    </>
  );
}
