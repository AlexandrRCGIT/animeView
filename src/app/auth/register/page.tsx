import Link from 'next/link';
import { BackButton } from '@/components/ui/BackButton';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = { title: 'Регистрация — AnimeView' };

export default function RegisterPage() {
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

        <RegisterForm />

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
