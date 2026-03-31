'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  normalizeWatchTogetherState,
  WATCH_TOGETHER_STATE_FLUSH_MS,
  type WatchTogetherChatMessage,
  type WatchTogetherJoinedRoom,
  type WatchTogetherRoomSummary,
  type WatchTogetherState,
} from '@/lib/watch-together/types';
import type { SsePresenceMeta } from '@/lib/watch-together/sse-registry';

interface WatchTogetherPanelProps {
  animeId: number;
  userId: string | null;
  userName: string | null;
  playerState: WatchTogetherState | null;
  syncSupported: boolean;
  onRemoteState: (state: WatchTogetherState | null) => void;
  onSessionChange: (next: { active: boolean; canControl: boolean }) => void;
}

interface CreateRoomPayload {
  animeId: number;
  roomName: string;
  isPrivate: boolean;
  password?: string;
  state?: Partial<WatchTogetherState>;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Ошибка запроса';
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roomSignature(state: WatchTogetherState): string {
  return [
    state.season,
    state.episode,
    state.translationId ?? 'n',
    state.translationTitle ?? '',
    Math.round(state.currentTime),
    state.paused ? 1 : 0,
  ].join(':');
}

export function WatchTogetherPanel({
  animeId,
  userId,
  userName,
  playerState,
  syncSupported,
  onRemoteState,
  onSessionChange,
}: WatchTogetherPanelProps) {
  const [rooms, setRooms] = useState<WatchTogetherRoomSummary[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [roomName, setRoomName] = useState('');
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const [joinedRoom, setJoinedRoom] = useState<WatchTogetherJoinedRoom | null>(null);
  const [messages, setMessages] = useState<WatchTogetherChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [participants, setParticipants] = useState<SsePresenceMeta[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const lastHostSignatureRef = useRef<string>('');
  const lastStateFlushAtRef = useRef<number>(0);
  const pendingStateRef = useRef<WatchTogetherState | null>(null);
  const flushTimerRef = useRef<number | null>(null);

  const canUseWatchTogether = Boolean(userId);
  const isInRoom = Boolean(joinedRoom);
  const isHost = Boolean(joinedRoom?.isHost);

  const fetchRooms = useCallback(async () => {
    if (!canUseWatchTogether) return;
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const res = await fetch(`/api/watch-together/rooms?animeId=${animeId}`, { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; error?: string; rooms?: WatchTogetherRoomSummary[] };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Не удалось загрузить комнаты');
      setRooms(data.rooms ?? []);
    } catch (error) {
      setRoomsError(toErrorMessage(error));
    } finally {
      setRoomsLoading(false);
    }
  }, [animeId, canUseWatchTogether]);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  const flushRoomState = useCallback(async (state: WatchTogetherState) => {
    const room = joinedRoom;
    if (!room?.isHost) return;
    const res = await fetch(`/api/watch-together/rooms/${room.id}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelKey: room.channelKey, state }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? 'Не удалось обновить состояние комнаты');
    }
  }, [joinedRoom]);

  const scheduleRoomStateFlush = useCallback((state: WatchTogetherState) => {
    pendingStateRef.current = state;
    const now = Date.now();
    const elapsed = now - lastStateFlushAtRef.current;

    const runFlush = () => {
      if (!pendingStateRef.current) return;
      const next = pendingStateRef.current;
      pendingStateRef.current = null;
      lastStateFlushAtRef.current = Date.now();
      void flushRoomState(next).catch((error) => setRuntimeError(toErrorMessage(error)));
    };

    if (elapsed >= WATCH_TOGETHER_STATE_FLUSH_MS) { runFlush(); return; }
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      runFlush();
    }, WATCH_TOGETHER_STATE_FLUSH_MS - elapsed);
  }, [flushRoomState]);

  const leaveRoom = useCallback(() => {
    onRemoteState(null);
    onSessionChange({ active: false, canControl: true });
    setJoinedRoom(null);
    setMessages([]);
    setParticipants([]);
    setRuntimeError(null);
    setJoiningRoomId(null);
    setJoinPassword('');
    lastHostSignatureRef.current = '';
    pendingStateRef.current = null;
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, [onRemoteState, onSessionChange]);

  const loadMessages = useCallback(async (room: WatchTogetherJoinedRoom) => {
    try {
      const params = new URLSearchParams({ channelKey: room.channelKey, limit: '100' });
      const res = await fetch(`/api/watch-together/rooms/${room.id}/messages?${params}`, { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; error?: string; messages?: WatchTogetherChatMessage[] };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Не удалось загрузить чат');
      setMessages(data.messages ?? []);
    } catch (error) {
      setRuntimeError(toErrorMessage(error));
    }
  }, []);

  // SSE подключение
  useEffect(() => {
    if (!joinedRoom || !userId) return;

    const params = new URLSearchParams({
      channelKey: joinedRoom.channelKey,
      isHost: joinedRoom.isHost ? '1' : '0',
      userName: encodeURIComponent(userName?.trim() || 'Пользователь'),
    });

    const es = new EventSource(`/api/watch-together/sse?${params}`);
    esRef.current = es;

    es.addEventListener('init', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as { state?: Partial<WatchTogetherState> };
      const state = normalizeWatchTogetherState(data.state ?? null);
      setJoinedRoom((prev) => prev ? { ...prev, state } : prev);
      if (!joinedRoom.isHost) onRemoteState(state);
    });

    es.addEventListener('sync', (e) => {
      const state = normalizeWatchTogetherState(JSON.parse((e as MessageEvent).data) as Partial<WatchTogetherState>);
      setJoinedRoom((prev) => prev ? { ...prev, state } : prev);
      onRemoteState(state);
    });

    es.addEventListener('chat', (e) => {
      const incoming = JSON.parse((e as MessageEvent).data) as WatchTogetherChatMessage;
      setMessages((prev) => {
        if (prev.some((item) => item.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });

    es.addEventListener('room', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as { type?: string };
      if (data.type === 'closed' || data.type === 'host_left') {
        setRuntimeError('Хост закрыл комнату');
        leaveRoom();
        void fetchRooms();
      }
    });

    es.addEventListener('presence', (e) => {
      const list = JSON.parse((e as MessageEvent).data) as SsePresenceMeta[];
      const dedup = new Map<string, SsePresenceMeta>();
      for (const entry of list) dedup.set(entry.userId, entry);
      setParticipants([...dedup.values()]);
    });

    es.onerror = () => {
      setRuntimeError('Соединение прервано, переподключение...');
    };

    void loadMessages(joinedRoom);
    onRemoteState(joinedRoom.state);

    return () => {
      es.close();
      if (esRef.current === es) esRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedRoom?.id, userId]);

  useEffect(() => {
    if (!joinedRoom) {
      onSessionChange({ active: false, canControl: true });
      return;
    }
    onSessionChange({ active: true, canControl: joinedRoom.isHost });
  }, [joinedRoom, onSessionChange]);

  // Хост рассылает своё состояние
  useEffect(() => {
    if (!joinedRoom?.isHost || !playerState) return;

    const normalized = normalizeWatchTogetherState(playerState);
    const signature = roomSignature(normalized);
    if (signature === lastHostSignatureRef.current) return;
    lastHostSignatureRef.current = signature;

    setJoinedRoom((prev) => prev ? { ...prev, state: normalized } : prev);
    scheduleRoomStateFlush(normalized);
  }, [joinedRoom, playerState, scheduleRoomStateFlush]);

  async function createRoom() {
    if (!userId) return;
    setRuntimeError(null);
    setCreateLoading(true);
    try {
      const payload: CreateRoomPayload = {
        animeId, roomName, isPrivate: isPrivateRoom,
        password: isPrivateRoom ? roomPassword : undefined,
        state: normalizeWatchTogetherState(playerState),
      };
      const res = await fetch('/api/watch-together/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; room?: WatchTogetherJoinedRoom };
      if (!res.ok || !data.ok || !data.room) throw new Error(data.error ?? 'Не удалось создать комнату');
      setJoinedRoom(data.room);
      setRoomName(''); setRoomPassword(''); setIsPrivateRoom(false);
      setMessages([]); setJoinPassword(''); setJoiningRoomId(null);
      await fetchRooms();
    } catch (error) {
      setRuntimeError(toErrorMessage(error));
    } finally {
      setCreateLoading(false);
    }
  }

  async function joinRoom(roomId: string, password = '') {
    if (!userId) return;
    setRuntimeError(null);
    setJoinLoading(true);
    try {
      const res = await fetch('/api/watch-together/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; room?: WatchTogetherJoinedRoom };
      if (!res.ok || !data.ok || !data.room) throw new Error(data.error ?? 'Не удалось подключиться к комнате');
      setJoinedRoom(data.room);
      setJoiningRoomId(null); setJoinPassword('');
      await fetchRooms();
    } catch (error) {
      setRuntimeError(toErrorMessage(error));
    } finally {
      setJoinLoading(false);
    }
  }

  async function sendMessage() {
    if (!joinedRoom || !chatText.trim() || chatSending) return;
    setChatSending(true);
    setRuntimeError(null);
    try {
      const res = await fetch(`/api/watch-together/rooms/${joinedRoom.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelKey: joinedRoom.channelKey, message: chatText.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: WatchTogetherChatMessage };
      if (!res.ok || !data.ok || !data.message) throw new Error(data.error ?? 'Не удалось отправить сообщение');
      // Наше собственное сообщение добавляем локально (SSE broadcast придёт всем остальным)
      setMessages((prev) => prev.some((m) => m.id === data.message!.id) ? prev : [...prev, data.message!]);
      setChatText('');
    } catch (error) {
      setRuntimeError(toErrorMessage(error));
    } finally {
      setChatSending(false);
    }
  }

  async function closeRoom() {
    if (!joinedRoom?.isHost) return;
    setRuntimeError(null);
    try {
      const res = await fetch(`/api/watch-together/rooms/${joinedRoom.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelKey: joinedRoom.channelKey }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Не удалось закрыть комнату');
      leaveRoom();
      await fetchRooms();
    } catch (error) {
      setRuntimeError(toErrorMessage(error));
    }
  }

  if (!canUseWatchTogether) {
    return (
      <section style={{ marginTop: 20 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.72)' }}>
          WatchTogether
        </h3>
        <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Войдите в аккаунт, чтобы создавать комнаты совместного просмотра.
        </p>
      </section>
    );
  }

  if (!syncSupported) {
    return (
      <section style={{
        marginTop: 20, borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.09)',
        background: 'rgba(255,255,255,0.03)', padding: 14,
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
          WatchTogether
        </h3>
        <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.58)' }}>
          Для этого тайтла нет Kodik-источника, поэтому синхронизация плеера пока недоступна.
        </p>
      </section>
    );
  }

  return (
    <section style={{
      marginTop: 20, borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.09)',
      background: 'rgba(255,255,255,0.03)', padding: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
          WatchTogether
        </h3>
        <button type="button" onClick={() => { void fetchRooms(); }} disabled={roomsLoading}
          style={{
            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.72)', borderRadius: 9, height: 32, padding: '0 10px',
            fontSize: 12, cursor: 'pointer', opacity: roomsLoading ? 0.65 : 1,
          }}>
          {roomsLoading ? 'Обновляю...' : 'Обновить список'}
        </button>
      </div>

      {runtimeError && <p style={{ margin: '10px 0 0', color: '#fca5a5', fontSize: 12 }}>{runtimeError}</p>}
      {roomsError && <p style={{ margin: '10px 0 0', color: '#fca5a5', fontSize: 12 }}>{roomsError}</p>}

      {!isInRoom && (
        <>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <input value={roomName} onChange={(e) => setRoomName(e.target.value)}
              placeholder="Название комнаты (опционально)" maxLength={80}
              style={{
                height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0 12px', fontSize: 13, outline: 'none',
              }} />

            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>
              <input type="checkbox" checked={isPrivateRoom} onChange={(e) => setIsPrivateRoom(e.target.checked)} />
              Закрытая комната (по паролю)
            </label>

            {isPrivateRoom && (
              <input value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="Пароль комнаты" type="password" minLength={4} maxLength={64}
                style={{
                  height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0 12px', fontSize: 13, outline: 'none',
                }} />
            )}

            <button type="button" onClick={() => { void createRoom(); }}
              disabled={createLoading || (isPrivateRoom && roomPassword.trim().length < 4)}
              style={{
                height: 36, borderRadius: 10, border: '1px solid rgba(108,60,225,0.55)',
                background: 'rgba(108,60,225,0.22)', color: '#d6cbff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', opacity: createLoading ? 0.7 : 1,
              }}>
              {createLoading ? 'Создание...' : 'Создать комнату'}
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              Активные комнаты по этому тайтлу
            </div>
            {rooms.length === 0 ? (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Пока нет активных комнат.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {rooms.map((room) => (
                  <div key={room.id} style={{
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                    padding: 10, background: 'rgba(255,255,255,0.03)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                          {room.roomName || `Комната ${room.id.slice(0, 8)}`}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                          Хост: {room.hostDisplayName} • обновлена {formatDateTime(room.lastEventAt)}
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => {
                          if (room.isPrivate) { setJoiningRoomId(room.id); return; }
                          void joinRoom(room.id);
                        }}
                        disabled={joinLoading}
                        style={{
                          height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.78)',
                          padding: '0 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                        {room.isPrivate ? 'Ввести пароль' : 'Подключиться'}
                      </button>
                    </div>

                    {joiningRoomId === room.id && room.isPrivate && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)}
                          placeholder="Пароль" type="password"
                          style={{
                            height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0 10px', fontSize: 12, outline: 'none',
                          }} />
                        <button type="button" onClick={() => { void joinRoom(room.id, joinPassword); }}
                          disabled={joinLoading || !joinPassword.trim()}
                          style={{
                            height: 32, borderRadius: 8, border: '1px solid rgba(108,60,225,0.55)',
                            background: 'rgba(108,60,225,0.22)', color: '#d6cbff', padding: '0 10px', fontSize: 12, cursor: 'pointer',
                          }}>
                          {joinLoading ? 'Вход...' : 'Войти'}
                        </button>
                        <button type="button" onClick={() => { setJoiningRoomId(null); setJoinPassword(''); }}
                          style={{
                            height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding: '0 10px', fontSize: 12, cursor: 'pointer',
                          }}>
                          Отмена
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {isInRoom && joinedRoom && (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <div style={{
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
            padding: '10px 12px', background: 'rgba(255,255,255,0.025)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {joinedRoom.roomName || `Комната ${joinedRoom.id.slice(0, 8)}`}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                  ID: {joinedRoom.id.slice(0, 8)} • {joinedRoom.isPrivate ? 'Закрытая' : 'Открытая'} •
                  {' '}{isHost ? 'Вы хост' : `Хост: ${joinedRoom.hostDisplayName}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {isHost && (
                  <button type="button" onClick={() => { void closeRoom(); }}
                    style={{
                      height: 32, borderRadius: 8, border: '1px solid rgba(255,107,107,0.5)',
                      background: 'rgba(255,107,107,0.15)', color: '#ffb3b3', padding: '0 10px', fontSize: 12, cursor: 'pointer',
                    }}>
                    Закрыть комнату
                  </button>
                )}
                <button type="button" onClick={leaveRoom}
                  style={{
                    height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.78)', padding: '0 10px', fontSize: 12, cursor: 'pointer',
                  }}>
                  Выйти
                </button>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)' }}>
            Онлайн: {participants.length || 1}
            {' • '}
            {participants.map((p) => (p.isHost ? `${p.userName} (хост)` : p.userName)).join(', ') || (userName ?? 'Вы')}
          </div>

          {!isHost && (
            <div style={{
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', padding: '8px 10px',
              fontSize: 12, color: 'rgba(255,255,255,0.65)',
            }}>
              Управление плеером у хоста. Вы видите синхронное воспроизведение.
            </div>
          )}

          <div style={{
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
            background: 'rgba(255,255,255,0.02)', padding: 10,
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>Чат комнаты</div>
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 6, paddingRight: 4 }}>
              {messages.length === 0 ? (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Сообщений пока нет</div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} style={{
                    borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.03)', padding: '6px 8px',
                  }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      {message.userDisplayName} • {formatDateTime(message.createdAt)}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 13, color: 'rgba(255,255,255,0.82)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {message.message}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <input value={chatText} onChange={(e) => setChatText(e.target.value)}
                placeholder="Напишите сообщение..." maxLength={1000}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                style={{
                  flex: 1, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0 10px', fontSize: 13, outline: 'none',
                }} />
              <button type="button" onClick={() => { void sendMessage(); }}
                disabled={chatSending || !chatText.trim()}
                style={{
                  height: 34, borderRadius: 9, border: '1px solid rgba(108,60,225,0.55)',
                  background: 'rgba(108,60,225,0.22)', color: '#d6cbff', padding: '0 12px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: chatSending ? 0.7 : 1,
                }}>
                {chatSending ? '...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
