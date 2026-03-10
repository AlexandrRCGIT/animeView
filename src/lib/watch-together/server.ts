import { supabase } from '@/lib/supabase';
import type {
  WatchTogetherJoinedRoom,
  WatchTogetherRoomSummary,
  WatchTogetherState,
  WatchTogetherChatMessage,
} from '@/lib/watch-together/types';
import { normalizeWatchTogetherState } from '@/lib/watch-together/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RawRoomRow {
  id: string;
  anime_id: number;
  room_name: string | null;
  is_private: boolean;
  host_user_id: string;
  channel_key: string;
  status: 'active' | 'closed';
  state: unknown;
  created_at: string;
  updated_at: string;
  last_event_at: string;
}

export interface RawMessageRow {
  id: number;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

interface UserIdentity {
  displayName: string;
  avatarUrl: string | null;
}

function fallbackDisplayName(userId: string): string {
  if (userId.startsWith('discord:')) return 'Discord пользователь';
  if (userId.startsWith('telegram:')) return 'Telegram пользователь';
  return 'Пользователь';
}

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function resolveUserIdentities(
  userIds: string[],
): Promise<Map<string, UserIdentity>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return new Map();

  const map = new Map<string, UserIdentity>();

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', unique);

  for (const row of profiles ?? []) {
    map.set(row.user_id as string, {
      displayName: (row.display_name as string | null)?.trim() || fallbackDisplayName(row.user_id as string),
      avatarUrl: (row.avatar_url as string | null) ?? null,
    });
  }

  const credentialsIds = unique
    .filter((id) => id.startsWith('credentials:'))
    .map((id) => id.slice('credentials:'.length));

  if (credentialsIds.length) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', credentialsIds);

    for (const user of users ?? []) {
      const uid = `credentials:${user.id}`;
      const existing = map.get(uid);
      const dbName = (user.name as string | null)?.trim() || fallbackDisplayName(uid);
      map.set(uid, {
        displayName: existing?.displayName && existing.displayName !== fallbackDisplayName(uid)
          ? existing.displayName
          : dbName,
        avatarUrl: existing?.avatarUrl ?? null,
      });
    }
  }

  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, {
        displayName: fallbackDisplayName(id),
        avatarUrl: null,
      });
    }
  }

  return map;
}

export function mapRoomSummary(
  row: RawRoomRow,
  identityMap: Map<string, UserIdentity>,
): WatchTogetherRoomSummary {
  const identity = identityMap.get(row.host_user_id);
  return {
    id: row.id,
    animeId: row.anime_id,
    roomName: row.room_name,
    isPrivate: row.is_private,
    hostUserId: row.host_user_id,
    hostDisplayName: identity?.displayName ?? fallbackDisplayName(row.host_user_id),
    hostAvatarUrl: identity?.avatarUrl ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEventAt: row.last_event_at,
  };
}

export function mapJoinedRoom(
  row: RawRoomRow,
  identityMap: Map<string, UserIdentity>,
  currentUserId: string,
): WatchTogetherJoinedRoom {
  return {
    ...mapRoomSummary(row, identityMap),
    channelKey: row.channel_key,
    isHost: row.host_user_id === currentUserId,
    state: normalizeWatchTogetherState(row.state as Partial<WatchTogetherState> | null),
  };
}

export function mapChatMessage(
  row: RawMessageRow,
  identityMap: Map<string, UserIdentity>,
): WatchTogetherChatMessage {
  const identity = identityMap.get(row.user_id);
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    userDisplayName: identity?.displayName ?? fallbackDisplayName(row.user_id),
    userAvatarUrl: identity?.avatarUrl ?? null,
    message: row.message,
    createdAt: row.created_at,
  };
}
