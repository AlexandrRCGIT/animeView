import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const VISITOR_COOKIE = 'av_visitor_id';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

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
  const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? null;

  const { error } = await supabase.from('online_presence').upsert(
    {
      visitor_id: visitorId,
      user_id: userId,
      is_authenticated: Boolean(userId),
      page_path: pagePath,
      user_agent: userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'visitor_id' },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }

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
