import { randomInt, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isTrustedWriteRequest } from '@/lib/security';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import {
  TV_AUTH_CODE_ALPHABET,
  TV_AUTH_CODE_LENGTH,
  TV_AUTH_POLL_INTERVAL_MS,
  TV_AUTH_TTL_MS,
  extractClientIp,
  getAppOrigin,
} from '@/lib/tv-auth';

const INSERT_RETRIES = 8;
const SESSION_CREATE_LIMIT_PER_MIN = 20;
const ALLOWED_LINK_PATHS = new Set(['/tv/link', '/auth/device/link']);

interface SessionPayload {
  linkPath?: string;
  clientDeviceId?: string;
  clientDeviceName?: string;
  createdVia?: 'tv' | 'web';
}

function generateCode(): string {
  let result = '';
  for (let i = 0; i < TV_AUTH_CODE_LENGTH; i += 1) {
    const index = randomInt(0, TV_AUTH_CODE_ALPHABET.length);
    result += TV_AUTH_CODE_ALPHABET[index];
  }
  return result;
}

function normalizeLinkPath(value: string | undefined): string {
  if (value && ALLOWED_LINK_PATHS.has(value)) return value;
  return '/tv/link';
}

function normalizeClientDeviceId(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 128);
}

function normalizeDeviceName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 160);
}

function normalizeCreatedVia(value: SessionPayload['createdVia']): 'tv' | 'web' {
  return value === 'web' ? 'web' : 'tv';
}

export async function POST(request: Request) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: 'Уже авторизован' },
      { status: 409 },
    );
  }

  const ipLimiter = getClientIp(request.headers);
  if (!rateLimit(`tv-auth:create:${ipLimiter}`, SESSION_CREATE_LIMIT_PER_MIN, 60_000)) {
    return NextResponse.json(
      { ok: false, error: 'Слишком много попыток, попробуйте позже' },
      { status: 429 },
    );
  }

  const createdAt = Date.now();
  const expiresAt = new Date(createdAt + TV_AUTH_TTL_MS).toISOString();
  const requesterIp = extractClientIp(request.headers);
  const requesterUserAgent = request.headers.get('user-agent');
  let payload: SessionPayload | null = null;
  try {
    payload = (await request.json()) as SessionPayload;
  } catch {
    payload = null;
  }
  const verifyPath = normalizeLinkPath(payload?.linkPath);
  const createdVia = normalizeCreatedVia(payload?.createdVia);
  const clientDeviceId = normalizeClientDeviceId(payload?.clientDeviceId);
  const fallbackDeviceName = createdVia === 'tv' ? 'Телевизор' : 'Браузер';
  const clientDeviceName = normalizeDeviceName(payload?.clientDeviceName, fallbackDeviceName);

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
        client_device_id: clientDeviceId,
        client_device_name: clientDeviceName,
        created_via: createdVia,
      });

    if (!error) {
      const verifyUrl = new URL(verifyPath, getAppOrigin(request.url));
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
