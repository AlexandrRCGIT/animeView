import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isTrustedWriteRequest } from '@/lib/security';
import {
  isValidUuid,
  type RawRoomRow,
} from '@/lib/watch-together/server';
import { normalizeWatchTogetherState, type WatchTogetherState } from '@/lib/watch-together/types';
import { broadcast } from '@/lib/watch-together/sse-registry';

interface Params {
  roomId: string;
}

interface UpdateStatePayload {
  channelKey?: string;
  state?: Partial<WatchTogetherState>;
}

export async function POST(
  request: Request,
  context: { params: Promise<Params> },
) {
  if (!isTrustedWriteRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { roomId } = await context.params;
  if (!isValidUuid(roomId)) {
    return NextResponse.json({ ok: false, error: 'Некорректный roomId' }, { status: 400 });
  }

  let payload: UpdateStatePayload;
  try {
    payload = (await request.json()) as UpdateStatePayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const channelKey = (payload.channelKey ?? '').trim();
  if (!channelKey) {
    return NextResponse.json({ ok: false, error: 'Отсутствует channelKey' }, { status: 400 });
  }

  const { data: room, error } = await supabase
    .from('watch_together_rooms')
    .select('id, host_user_id, status')
    .eq('id', roomId)
    .eq('channel_key', channelKey)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!room) {
    return NextResponse.json({ ok: false, error: 'Комната не найдена' }, { status: 404 });
  }
  if (room.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'Комната закрыта' }, { status: 409 });
  }
  if (room.host_user_id !== session.user.id) {
    return NextResponse.json({ ok: false, error: 'Только хост может синхронизировать состояние' }, { status: 403 });
  }

  const state = normalizeWatchTogetherState(payload.state);
  const nowIso = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('watch_together_rooms')
    .update({
      state,
      last_event_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', roomId)
    .eq('channel_key', channelKey)
    .eq('status', 'active')
    .select('id, anime_id, room_name, is_private, host_user_id, channel_key, status, state, created_at, updated_at, last_event_at')
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json(
      { ok: false, error: updateError?.message ?? 'Не удалось обновить состояние' },
      { status: 500 },
    );
  }

  const finalState = normalizeWatchTogetherState((updated as RawRoomRow).state as Partial<WatchTogetherState>);

  // Broadcast via SSE to all guests in the room
  broadcast(channelKey, 'sync', finalState);

  return NextResponse.json({ ok: true, state: finalState });
}
