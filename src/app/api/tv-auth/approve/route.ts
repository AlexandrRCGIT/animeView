import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { extractClientIp, isValidTvCode, normalizeTvCode } from '@/lib/tv-auth';
import { isTrustedWriteRequest } from '@/lib/security';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

interface ApprovePayload {
  code?: string;
}

const APPROVE_LIMIT_PER_MIN = 30;

export async function POST(request: Request) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const limiterIp = getClientIp(request.headers);
  if (!rateLimit(`tv-auth:approve:${session.user.id}:${limiterIp}`, APPROVE_LIMIT_PER_MIN, 60_000)) {
    return NextResponse.json({ ok: false, error: 'Слишком много попыток' }, { status: 429 });
  }

  let payload: ApprovePayload;
  try {
    payload = (await request.json()) as ApprovePayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const code = normalizeTvCode(payload.code ?? '');
  if (!isValidTvCode(code)) {
    return NextResponse.json({ ok: false, error: 'Некорректный код' }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from('tv_login_sessions')
    .select('id, status, expires_at, user_id')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Код не найден' }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const expiresAtMs = new Date(row.expires_at).getTime();
  const isExpired = Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
  if (isExpired) {
    await supabase
      .from('tv_login_sessions')
      .update({ status: 'expired' })
      .eq('id', row.id)
      .in('status', ['pending', 'approved']);
    return NextResponse.json({ ok: false, error: 'Код входа истёк' }, { status: 410 });
  }

  if (row.status === 'consumed') {
    return NextResponse.json({ ok: false, error: 'Код уже использован' }, { status: 409 });
  }

  if (row.status === 'approved') {
    if (row.user_id === session.user.id) {
      return NextResponse.json({ ok: true, status: 'approved' });
    }
    return NextResponse.json({ ok: false, error: 'Код подтвержден другим аккаунтом' }, { status: 409 });
  }

  if (row.status !== 'pending') {
    return NextResponse.json({ ok: false, error: `Недоступный статус: ${row.status}` }, { status: 409 });
  }

  const approverIp = extractClientIp(request.headers);
  const approverUserAgent = request.headers.get('user-agent');

  const { data: approvedRow, error: updateError } = await supabase
    .from('tv_login_sessions')
    .update({
      status: 'approved',
      user_id: session.user.id,
      approved_at: nowIso,
      approver_ip: approverIp,
      approver_user_agent: approverUserAgent,
    })
    .eq('id', row.id)
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .select('id')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }
  if (!approvedRow) {
    return NextResponse.json({ ok: false, error: 'Код уже подтвержден или истёк' }, { status: 409 });
  }

  return NextResponse.json({ ok: true, status: 'approved' });
}
