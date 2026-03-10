export const WATCH_TOGETHER_ROOM_NAME_MAX = 80;
export const WATCH_TOGETHER_PASSWORD_MIN = 4;
export const WATCH_TOGETHER_PASSWORD_MAX = 64;
export const WATCH_TOGETHER_MESSAGE_MAX = 1000;
export const WATCH_TOGETHER_STATE_FLUSH_MS = 3000;

export interface WatchTogetherState {
  season: number;
  episode: number;
  translationId: number | null;
  translationTitle: string | null;
  currentTime: number;
  paused: boolean;
  updatedAt: number;
}

export interface WatchTogetherRoomSummary {
  id: string;
  animeId: number;
  roomName: string | null;
  isPrivate: boolean;
  hostUserId: string;
  hostDisplayName: string;
  hostAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastEventAt: string;
}

export interface WatchTogetherJoinedRoom extends WatchTogetherRoomSummary {
  channelKey: string;
  isHost: boolean;
  state: WatchTogetherState;
}

export interface WatchTogetherChatMessage {
  id: number;
  roomId: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
  message: string;
  createdAt: string;
}

function toSafeInt(value: unknown, fallback: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const int = Math.floor(num);
  if (int < min) return min;
  if (int > max) return max;
  return int;
}

function toSafeFloat(value: unknown, fallback: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

export function normalizeWatchTogetherState(
  input: Partial<WatchTogetherState> | null | undefined,
): WatchTogetherState {
  const now = Date.now();
  const translationRaw =
    typeof input?.translationTitle === 'string' ? input.translationTitle.trim() : '';

  return {
    season: toSafeInt(input?.season, 1, 1, 99),
    episode: toSafeInt(input?.episode, 1, 1, 5000),
    translationId:
      typeof input?.translationId === 'number' && Number.isFinite(input.translationId)
        ? Math.floor(input.translationId)
        : null,
    translationTitle: translationRaw ? translationRaw.slice(0, 180) : null,
    currentTime: toSafeFloat(input?.currentTime, 0, 0, 172800),
    paused: Boolean(input?.paused),
    updatedAt: toSafeInt(input?.updatedAt, now, 0, 9999999999999),
  };
}

export function sanitizeRoomName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, WATCH_TOGETHER_ROOM_NAME_MAX);
}

