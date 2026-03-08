import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TvLinkApprove } from '@/components/auth/TvLinkApprove';
import { isValidTvCode, normalizeTvCode } from '@/lib/tv-auth';

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export const metadata = {
  title: 'Добавить устройство — AnimeView',
};

export default async function DeviceLinkPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawCode = normalizeTvCode(params.code ?? '');
  const initialCode = isValidTvCode(rawCode) ? rawCode : '';

  const session = await auth();
  if (!session?.user?.id) {
    const callbackUrl = initialCode ? `/auth/device/link?code=${initialCode}` : '/auth/device/link';
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm transition-colors">
            ← На главную
          </Link>
        </div>
        <TvLinkApprove initialCode={initialCode} />
      </div>
    </main>
  );
}
