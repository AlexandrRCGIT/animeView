import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import {
  type RawRoomRow,
  mapJoinedRoom,
  mapRoomSummary,
  resolveUserIdentities,
} from '@/lib/watch-together/server';
import {
  normalizeWatchTogetherState,
  sanitizeRoomName,
  WATCH_TOGETHER_PASSWORD_MAX,
  WATCH_TOGETHER_PASSWORD_MIN,
  type WatchTogetherState,
} from '@/lib/watch-together/types';

interface CreateRoomPayload {
  animeId?: number;
  roomName?: string;
  isPrivate?: boolean;
  password?: string;
  state?: Partial<WatchTogetherState>;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const animeId = Number(searchParams.get('animeId') ?? '');
  if (!Number.isFinite(animeId) || animeId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid animeId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watch_together_rooms')
    .select('id, anime_id, room_name, is_private, host_user_id, channel_key, status, state, created_at, updated_at, last_event_at')
    .eq('anime_id', animeId)
    .eq('status', 'active')
    .order('last_event_at', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as RawRoomRow[];
  const hostIds = rows.map((row) => String(row.host_user_id ?? '')).filter(Boolean);
  const identityMap = await resolveUserIdentities(hostIds);

  const rooms = rows.map((row) =>
    mapRoomSummary(
      row,
      identityMap,
    ),
  );

  return NextResponse.json({ ok: true, rooms });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: CreateRoomPayload;
  try {
    payload = (await request.json()) as CreateRoomPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const animeId = Number(payload.animeId ?? 0);
  if (!Number.isFinite(animeId) || animeId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid animeId' }, { status: 400 });
  }

  const isPrivate = Boolean(payload.isPrivate);
  const password = typeof payload.password === 'string' ? payload.password.trim() : '';
  if (isPrivate) {
    if (password.length < WATCH_TOGETHER_PASSWORD_MIN || password.length > WATCH_TOGETHER_PASSWORD_MAX) {
      return NextResponse.json(
        { ok: false, error: `Пароль комнаты должен быть от ${WATCH_TOGETHER_PASSWORD_MIN} до ${WATCH_TOGETHER_PASSWORD_MAX} символов` },
        { status: 400 },
      );
    }
  }

  const roomName = sanitizeRoomName(payload.roomName);
  const passwordHash = isPrivate ? await bcrypt.hash(password, 10) : null;
  const initialState = normalizeWatchTogetherState(payload.state);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('watch_together_rooms')
    .insert({
      anime_id: animeId,
      room_name: roomName,
      is_private: isPrivate,
      password_hash: passwordHash,
      host_user_id: session.user.id,
      channel_key: randomBytes(24).toString('hex'),
      status: 'active',
      state: initialState,
      last_event_at: nowIso,
      updated_at: nowIso,
    })
    .select('id, anime_id, room_name, is_private, host_user_id, channel_key, status, state, created_at, updated_at, last_event_at')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Не удалось создать комнату' }, { status: 500 });
  }

  const identityMap = await resolveUserIdentities([session.user.id]);
  const room = mapJoinedRoom(data as RawRoomRow, identityMap, session.user.id);

  return NextResponse.json({ ok: true, room }, { status: 201 });
}
