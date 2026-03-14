import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isAdminUserId } from '@/lib/admin';
import { getContentUnreadFlags } from '@/lib/content';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({
      name: null,
      isAdmin: false,
      unread: { news: false, info: false },
    });
  }

  const { data } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', session.user.id)
    .maybeSingle();

  let unread = { news: false, info: false };
  try {
    unread = await getContentUnreadFlags(session.user.id);
  } catch {
    unread = { news: false, info: false };
  }

  return NextResponse.json({
    id: session.user.id,
    name: data?.display_name ?? session.user.name ?? null,
    isAdmin: isAdminUserId(session.user.id),
    unread,
  });
}
