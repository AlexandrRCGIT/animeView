import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isValidTvDeviceId } from '@/lib/tv-auth';

type PollState = 'pending' | 'approved' | 'consumed' | 'expired' | 'cancelled';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = (searchParams.get('deviceId') ?? '').trim();

  if (!deviceId || !isValidTvDeviceId(deviceId)) {
    return NextResponse.json({ ok: false, error: 'Invalid deviceId' }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from('tv_login_sessions')
    .select('id, status, expires_at')
    .eq('id', deviceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }

  const expiresAtMs = new Date(row.expires_at).getTime();
  const expired = Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
  let status = row.status as PollState;

  if (expired && (status === 'pending' || status === 'approved')) {
    status = 'expired';
    await supabase
      .from('tv_login_sessions')
      .update({ status: 'expired' })
      .eq('id', row.id)
      .in('status', ['pending', 'approved']);
  }

  return NextResponse.json({
    ok: true,
    status,
    expiresAt: row.expires_at,
  });
}
