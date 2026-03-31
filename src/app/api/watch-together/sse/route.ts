import { randomBytes } from 'crypto';
import { auth } from '@/auth';
import {
  addClient,
  removeClient,
  broadcastPresence,
  sendToClient,
  broadcast,
} from '@/lib/watch-together/sse-registry';
import { supabase } from '@/lib/supabase';
import { normalizeWatchTogetherState } from '@/lib/watch-together/types';

export const dynamic = 'force-dynamic';

const KEEPALIVE_MS = 25_000;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelKey = (searchParams.get('channelKey') ?? '').trim();
  const isHost = searchParams.get('isHost') === '1';
  const rawName = (searchParams.get('userName') ?? '').trim();
  const userName = rawName.slice(0, 80) || 'Пользователь';

  if (!channelKey || channelKey.length > 100) {
    return new Response('Invalid channelKey', { status: 400 });
  }

  // Отправляем текущее состояние комнаты при подключении
  const { data: roomRow } = await supabase
    .from('watch_together_rooms')
    .select('state, status')
    .eq('channel_key', channelKey)
    .maybeSingle();

  if (!roomRow || roomRow.status !== 'active') {
    return new Response('Room not found or closed', { status: 404 });
  }

  const userId = session.user.id;
  const clientId = randomBytes(8).toString('hex');
  const meta = { userId, userName, isHost };

  const encoder = new TextEncoder();

  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      addClient(channelKey, clientId, meta, controller);

      // Текущее состояние комнаты — отправляем только этому клиенту
      const currentState = normalizeWatchTogetherState(
        roomRow.state as Parameters<typeof normalizeWatchTogetherState>[0],
      );
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify({ state: currentState })}\n\n`),
      );

      // Presence всем в комнате
      broadcastPresence(channelKey);

      // Keepalive
      keepaliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          if (keepaliveTimer) clearInterval(keepaliveTimer);
        }
      }, KEEPALIVE_MS);
    },

    cancel() {
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      controllerRef = null;
      removeClient(channelKey, clientId);
      broadcastPresence(channelKey);

      // Если хост ушёл — уведомить гостей
      if (isHost) {
        broadcast(channelKey, 'room', { type: 'host_left' });
      }
    },
  });

  // Подавляем предупреждение — контроллер используется в cancel
  void controllerRef;
  void sendToClient;

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // отключить nginx буферизацию
    },
  });
}
