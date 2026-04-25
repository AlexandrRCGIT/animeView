import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isAdminUserId } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('dmca_blocked')
    .select('shikimori_id, title, title_orig, blocked_at, reason')
    .order('blocked_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
