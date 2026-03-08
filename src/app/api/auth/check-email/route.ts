import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 10 checks per minute per IP to slow down email enumeration
  const ip = getClientIp(request.headers);
  if (!rateLimit(`check-email:${ip}`, 10, 60_000)) {
    return NextResponse.json({ exists: false }, { status: 429 });
  }

  const { email } = await request.json() as { email?: string };
  if (!email) return NextResponse.json({ exists: false });

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}
