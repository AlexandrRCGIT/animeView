import { randomInt, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import {
  TV_AUTH_CODE_ALPHABET,
  TV_AUTH_CODE_LENGTH,
  TV_AUTH_POLL_INTERVAL_MS,
  TV_AUTH_TTL_MS,
  extractClientIp,
  getAppOrigin,
} from '@/lib/tv-auth';

const INSERT_RETRIES = 8;

function generateCode(): string {
  let result = '';
  for (let i = 0; i < TV_AUTH_CODE_LENGTH; i += 1) {
    const index = randomInt(0, TV_AUTH_CODE_ALPHABET.length);
    result += TV_AUTH_CODE_ALPHABET[index];
  }
  return result;
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: 'Уже авторизован' },
      { status: 409 },
    );
  }

  const createdAt = Date.now();
  const expiresAt = new Date(createdAt + TV_AUTH_TTL_MS).toISOString();
  const requesterIp = extractClientIp(request.headers);
  const requesterUserAgent = request.headers.get('user-agent');

  for (let attempt = 0; attempt < INSERT_RETRIES; attempt += 1) {
    const code = generateCode();
    const deviceId = randomUUID();

    const { error } = await supabase
      .from('tv_login_sessions')
      .insert({
        id: deviceId,
        code,
        status: 'pending',
        expires_at: expiresAt,
        requester_ip: requesterIp,
        requester_user_agent: requesterUserAgent,
      });

    if (!error) {
      const verifyUrl = new URL('/tv/link', getAppOrigin(request.url));
      verifyUrl.searchParams.set('code', code);

      return NextResponse.json({
        ok: true,
        deviceId,
        code,
        expiresAt,
        pollIntervalMs: TV_AUTH_POLL_INTERVAL_MS,
        verifyUrl: verifyUrl.toString(),
      });
    }

    if (error.code !== '23505') {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { ok: false, error: 'Не удалось создать код входа, попробуйте снова' },
    { status: 500 },
  );
}
