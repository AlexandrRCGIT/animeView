import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getContentUnreadFlags } from '@/lib/content';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ news: false, info: false });
  }

  try {
    const unread = await getContentUnreadFlags(session.user.id);
    return NextResponse.json(unread);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load unread flags';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
