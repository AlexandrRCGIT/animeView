import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ name: null });
  }

  const { data } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', session.user.id)
    .maybeSingle();

  return NextResponse.json({
    name: data?.display_name ?? session.user.name ?? null,
  });
}
