import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };
  if (!email) return NextResponse.json({ exists: false });

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}
