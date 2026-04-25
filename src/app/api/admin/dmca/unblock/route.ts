import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isAdminUserId } from '@/lib/admin';
import { isTrustedWriteRequest } from '@/lib/security';

export async function POST(request: Request) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { shikimori_id?: number };
  try {
    body = (await request.json()) as { shikimori_id?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const shikimori_id = Number(body.shikimori_id ?? 0);
  if (!Number.isInteger(shikimori_id) || shikimori_id <= 0) {
    return NextResponse.json({ error: 'Некорректный shikimori_id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('dmca_blocked')
    .delete()
    .eq('shikimori_id', shikimori_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, shikimori_id });
}
