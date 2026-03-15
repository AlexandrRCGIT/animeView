import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { isTrustedWriteRequest, isValidEmail } from '@/lib/security';

export async function POST(request: NextRequest) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ exists: false }, { status: 403 });
  }

  // Rate limit: 10 checks per minute per IP to slow down email enumeration
  const ip = getClientIp(request.headers);
  if (!rateLimit(`check-email:${ip}`, 10, 60_000)) {
    return NextResponse.json({ exists: false }, { status: 429 });
  }

  let payload: { email?: string };
  try {
    payload = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ exists: false });
  }

  const email = payload.email?.trim().toLowerCase() ?? '';
  if (!email || !isValidEmail(email) || email.length > 254) {
    return NextResponse.json({ exists: false });
  }

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}
