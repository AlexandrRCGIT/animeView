import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TvLinkApprove } from '@/components/auth/TvLinkApprove';
import { isValidTvCode, normalizeTvCode } from '@/lib/tv-auth';

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export const metadata = {
  title: 'Подтверждение входа на ТВ — AnimeView',
};

export default async function TvLinkPage({ searchParams }: Props) {
  const params = await searchParams;
  const code = normalizeTvCode(params.code ?? '');

  if (!isValidTvCode(code)) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h1 className="text-xl font-bold text-white mb-2">Некорректный код</h1>
          <p className="text-zinc-400 text-sm mb-5">
            Проверьте QR-код на телевизоре и откройте ссылку заново.
          </p>
          <Link
            href="/"
            className="inline-flex px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            На главную
          </Link>
        </div>
      </main>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/tv/link?code=${code}`)}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-10">
      <TvLinkApprove code={code} />
    </main>
  );
}
