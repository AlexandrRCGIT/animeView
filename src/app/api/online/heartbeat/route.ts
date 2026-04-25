import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

const VISITOR_COOKIE = 'av_visitor_id';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// TTL = 30 min — поддерживает окна admin/online/now вплоть до 30 минут
const PRESENCE_TTL_SECONDS = 30 * 60;
// Суточный ZSET для метрик (visitors_24h, visitors_today)
const VISITORS_ZSET_KEY = 'visitors:24h';

function createVisitorId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function normalizeVisitorId(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(value)) return null;
  return value;
}

function normalizePath(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value || !value.startsWith('/')) return null;
  return value.slice(0, 256);
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  const payload = (await req.json().catch(() => null)) as { path?: unknown } | null;

  const fromCookie = normalizeVisitorId(req.cookies.get(VISITOR_COOKIE)?.value ?? null);
  const visitorId = fromCookie ?? createVisitorId();

  const pagePath = normalizePath(payload?.path) ?? '/';
  const userId = session?.user?.id ?? null;
  const now = Date.now();

  // Текущее присутствие (для онлайн-счётчика)
  await redis.setex(
    `presence:${visitorId}`,
    PRESENCE_TTL_SECONDS,
    JSON.stringify({ user_id: userId, page_path: pagePath, last_seen_at: now }),
  ).catch(() => {});

  // Суточный ZSET для метрик (visitors_24h, visitors_today)
  void (async () => {
    try {
      const cutoff24h = now - 86400_000;
      await redis.zadd(VISITORS_ZSET_KEY, now, visitorId);
      await redis.zremrangebyscore(VISITORS_ZSET_KEY, 0, cutoff24h);
      await redis.expire(VISITORS_ZSET_KEY, 86400);
    } catch {}
  })();

  const response = NextResponse.json({ ok: true });
  if (!fromCookie) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      path: '/',
      maxAge: VISITOR_COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
}
