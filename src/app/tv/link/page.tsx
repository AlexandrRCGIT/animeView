import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export const metadata = {
  title: 'Добавить устройство — AnimeView',
};

export default async function TvLinkPage({ searchParams }: Props) {
  const params = await searchParams;
  const target = params.code
    ? `/auth/device/link?code=${encodeURIComponent(params.code)}`
    : '/auth/device/link';
  redirect(target);
}
