const encoder = new TextEncoder();

export interface SsePresenceMeta {
  userId: string;
  userName: string;
  isHost: boolean;
}

interface SseClient {
  clientId: string;
  meta: SsePresenceMeta;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

// channelKey → Map<clientId, SseClient>
const rooms = new Map<string, Map<string, SseClient>>();

function formatEvent(event: string, data: unknown): Uint8Array {
  const json = JSON.stringify(data);
  return encoder.encode(`event: ${event}\ndata: ${json}\n\n`);
}

export function addClient(
  channelKey: string,
  clientId: string,
  meta: SsePresenceMeta,
  controller: ReadableStreamDefaultController<Uint8Array>,
): void {
  if (!rooms.has(channelKey)) {
    rooms.set(channelKey, new Map());
  }
  rooms.get(channelKey)!.set(clientId, { clientId, meta, controller });
}

export function removeClient(channelKey: string, clientId: string): void {
  const room = rooms.get(channelKey);
  if (!room) return;
  room.delete(clientId);
  if (room.size === 0) rooms.delete(channelKey);
}

export function broadcast(
  channelKey: string,
  event: string,
  data: unknown,
  excludeClientId?: string,
): void {
  const room = rooms.get(channelKey);
  if (!room) return;
  const chunk = formatEvent(event, data);
  for (const [id, client] of room) {
    if (id === excludeClientId) continue;
    try {
      client.controller.enqueue(chunk);
    } catch {
      // client disconnected, will be cleaned up by cancel()
    }
  }
}

export function broadcastPresence(channelKey: string): void {
  const room = rooms.get(channelKey);
  const presence: SsePresenceMeta[] = room
    ? [...room.values()].map((c) => c.meta)
    : [];
  broadcast(channelKey, 'presence', presence);
}

export function sendToClient(
  channelKey: string,
  clientId: string,
  event: string,
  data: unknown,
): void {
  const client = rooms.get(channelKey)?.get(clientId);
  if (!client) return;
  try {
    client.controller.enqueue(formatEvent(event, data));
  } catch {
    // ignore
  }
}
