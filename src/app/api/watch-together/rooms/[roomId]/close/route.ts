import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isValidUuid } from '@/lib/watch-together/server';
import { isTrustedWriteRequest } from '@/lib/security';
import { broadcast } from '@/lib/watch-together/sse-registry';

interface Params {
  roomId: string;
}

interface CloseRoomPayload {
  channelKey?: string;
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

  let payload: CloseRoomPayload;
  try {
    payload = (await request.json()) as CloseRoomPayload;
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
  if (room.host_user_id !== session.user.id) {
    return NextResponse.json({ ok: false, error: 'Только хост может закрыть комнату' }, { status: 403 });
  }
  if (room.status === 'closed') {
    return NextResponse.json({ ok: true, alreadyClosed: true });
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('watch_together_rooms')
    .update({
      status: 'closed',
      closed_at: nowIso,
      updated_at: nowIso,
      last_event_at: nowIso,
    })
    .eq('id', roomId)
    .eq('channel_key', channelKey)
    .eq('host_user_id', session.user.id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  // Broadcast via SSE: room closed
  broadcast(channelKey, 'room', { type: 'closed' });

  return NextResponse.json({ ok: true });
}
