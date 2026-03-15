import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { hasUnsafeControlChars, isTrustedWriteRequest } from '@/lib/security';

interface ProgressPayload {
  shikimoriId: number;
  season?: number;
  episode?: number;
  translationId?: number | null;
  translationTitle?: string | null;
  progressSeconds?: number | null;
  durationSeconds?: number | null;
  markCompleted?: boolean;
}

const COMPLETED_PROGRESS_THRESHOLD = 0.9;
const WATCH_PROGRESS_LIMIT_PER_MIN = 180;

function toSafeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const shikimoriId = Number(searchParams.get('shikimoriId') ?? '');
  if (!Number.isFinite(shikimoriId) || shikimoriId <= 0) {
    return NextResponse.json({ error: 'Invalid shikimoriId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watch_progress')
    .select(
      'shikimori_id, season, episode, translation_id, translation_title, progress_seconds, duration_seconds, is_completed, updated_at',
    )
    .eq('user_id', session.user.id)
    .eq('shikimori_id', shikimoriId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, progress: data ?? null });
}

export async function POST(request: Request) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!rateLimit(`watch-progress:${session.user.id}:${ip}`, WATCH_PROGRESS_LIMIT_PER_MIN, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let payload: ProgressPayload;
  try {
    payload = (await request.json()) as ProgressPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const shikimoriId = Number(payload.shikimoriId);
  if (!Number.isFinite(shikimoriId) || shikimoriId <= 0) {
    return NextResponse.json({ error: 'Invalid shikimoriId' }, { status: 400 });
  }

  const season = Math.max(0, Math.floor(Number(payload.season ?? 1)));
  const episode = Math.max(1, Math.floor(Number(payload.episode ?? 1)));
  const progressSeconds = toSafeNumber(payload.progressSeconds ?? null);
  const durationSeconds = toSafeNumber(payload.durationSeconds ?? null);
  const markCompleted = Boolean(payload.markCompleted);
  const translationTitleRaw = typeof payload.translationTitle === 'string' ? payload.translationTitle.trim() : '';
  if (translationTitleRaw.length > 180 || hasUnsafeControlChars(translationTitleRaw)) {
    return NextResponse.json({ error: 'Invalid translationTitle' }, { status: 400 });
  }

  const progressRatio =
    progressSeconds !== null && durationSeconds !== null && durationSeconds > 0
      ? progressSeconds / durationSeconds
      : null;
  const isCompleted =
    markCompleted || (progressRatio !== null && progressRatio >= COMPLETED_PROGRESS_THRESHOLD);

  const now = new Date().toISOString();
  const row = {
    user_id: session.user.id,
    shikimori_id: shikimoriId,
    season,
    episode,
    translation_id: payload.translationId ?? null,
    translation_title: translationTitleRaw || null,
    progress_seconds: progressSeconds,
    duration_seconds: durationSeconds,
    is_completed: isCompleted,
    opened_at: now,
    completed_at: isCompleted ? now : null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('watch_progress')
    .upsert(row, { onConflict: 'user_id,shikimori_id' })
    .select(
      'shikimori_id, season, episode, translation_id, translation_title, progress_seconds, duration_seconds, is_completed, updated_at',
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, progress: data ?? null });
}
