import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { markAnimeUpdatesViewed } from '@/lib/anime-updates';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  await markAnimeUpdatesViewed(session.user.id).catch(() => {});
  return NextResponse.json({ ok: true });
}
