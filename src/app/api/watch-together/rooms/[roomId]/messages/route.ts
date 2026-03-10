import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import {
  isValidUuid,
  mapChatMessage,
  resolveUserIdentities,
  type RawMessageRow,
} from '@/lib/watch-together/server';
import { WATCH_TOGETHER_MESSAGE_MAX } from '@/lib/watch-together/types';

interface Params {
  roomId: string;
}

interface PostMessagePayload {
  channelKey?: string;
  message?: string;
}

const CHAT_LIMIT_PER_MIN = 15;
const CHAT_LIMIT_WINDOW_MS = 60_000;

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { roomId } = await context.params;
  if (!isValidUuid(roomId)) {
    return NextResponse.json({ ok: false, error: 'Некорректный roomId' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const channelKey = (searchParams.get('channelKey') ?? '').trim();
  const limitRaw = Number(searchParams.get('limit') ?? '80');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 80;

  if (!channelKey) {
    return NextResponse.json({ ok: false, error: 'Отсутствует channelKey' }, { status: 400 });
  }

  const { data: room, error: roomError } = await supabase
    .from('watch_together_rooms')
    .select('id, status')
    .eq('id', roomId)
    .eq('channel_key', channelKey)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ ok: false, error: roomError.message }, { status: 500 });
  }
  if (!room) {
    return NextResponse.json({ ok: false, error: 'Комната не найдена' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('watch_together_messages')
    .select('id, room_id, user_id, message, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as RawMessageRow[]).reverse();
  const identityMap = await resolveUserIdentities(rows.map((row) => row.user_id));
  const messages = rows.map((row) => mapChatMessage(row, identityMap));

  return NextResponse.json({ ok: true, messages, roomStatus: room.status });
}

export async function POST(
  request: Request,
  context: { params: Promise<Params> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { roomId } = await context.params;
  if (!isValidUuid(roomId)) {
    return NextResponse.json({ ok: false, error: 'Некорректный roomId' }, { status: 400 });
  }

  const ip = getClientIp(request.headers);
  const limiterKey = `wt:chat:${roomId}:${session.user.id}:${ip}`;
  if (!rateLimit(limiterKey, CHAT_LIMIT_PER_MIN, CHAT_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: 'Слишком много сообщений, попробуйте позже' }, { status: 429 });
  }

  let payload: PostMessagePayload;
  try {
    payload = (await request.json()) as PostMessagePayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const channelKey = (payload.channelKey ?? '').trim();
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (!channelKey) {
    return NextResponse.json({ ok: false, error: 'Отсутствует channelKey' }, { status: 400 });
  }
  if (!message || message.length > WATCH_TOGETHER_MESSAGE_MAX) {
    return NextResponse.json({ ok: false, error: `Сообщение должно быть от 1 до ${WATCH_TOGETHER_MESSAGE_MAX} символов` }, { status: 400 });
  }

  const { data: room, error: roomError } = await supabase
    .from('watch_together_rooms')
    .select('id, status')
    .eq('id', roomId)
    .eq('channel_key', channelKey)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ ok: false, error: roomError.message }, { status: 500 });
  }
  if (!room) {
    return NextResponse.json({ ok: false, error: 'Комната не найдена' }, { status: 404 });
  }
  if (room.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'Комната закрыта' }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('watch_together_messages')
    .insert({
      room_id: roomId,
      user_id: session.user.id,
      message,
      created_at: nowIso,
    })
    .select('id, room_id, user_id, message, created_at')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Не удалось отправить сообщение' }, { status: 500 });
  }

  await supabase
    .from('watch_together_rooms')
    .update({
      last_event_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', roomId)
    .eq('channel_key', channelKey)
    .eq('status', 'active');

  const identityMap = await resolveUserIdentities([session.user.id]);
  const mapped = mapChatMessage(data as RawMessageRow, identityMap);

  return NextResponse.json({ ok: true, message: mapped }, { status: 201 });
}

