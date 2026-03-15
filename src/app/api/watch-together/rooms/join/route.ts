import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isTrustedWriteRequest } from '@/lib/security';
import {
  isValidUuid,
  mapJoinedRoom,
  resolveUserIdentities,
  type RawRoomRow,
} from '@/lib/watch-together/server';

interface JoinRoomPayload {
  roomId?: string;
  password?: string;
}

export async function POST(request: Request) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: JoinRoomPayload;
  try {
    payload = (await request.json()) as JoinRoomPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const roomId = (payload.roomId ?? '').trim();
  if (!isValidUuid(roomId)) {
    return NextResponse.json({ ok: false, error: 'Некорректный roomId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watch_together_rooms')
    .select('id, anime_id, room_name, is_private, host_user_id, channel_key, status, state, password_hash, created_at, updated_at, last_event_at')
    .eq('id', roomId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Комната не найдена' }, { status: 404 });
  }
  if (data.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'Комната уже закрыта' }, { status: 409 });
  }

  if (data.is_private) {
    const password = typeof payload.password === 'string' ? payload.password : '';
    if (password.length > 256) {
      return NextResponse.json({ ok: false, error: 'Слишком длинный пароль' }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, String(data.password_hash ?? ''));
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Неверный пароль комнаты' }, { status: 403 });
    }
  }

  const identityMap = await resolveUserIdentities([String(data.host_user_id)]);
  const room = mapJoinedRoom(data as RawRoomRow, identityMap, session.user.id);

  return NextResponse.json({ ok: true, room });
}
