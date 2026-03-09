'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export interface Comment {
  id:           string;
  user_id:      string;
  shikimori_id: number;
  parent_id:    string | null;
  text:         string;
  created_at:   string;
  updated_at:   string;
  display_name: string | null;
  avatar_url:   string | null;
}

/** Разрезолвить имена и аватары для списка userId из разных провайдеров */
async function resolveProfiles(
  userIds: string[]
): Promise<Map<string, { display_name: string | null; avatar_url: string | null }>> {
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', userIds);

  const map = new Map<string, { display_name: string | null; avatar_url: string | null }>(
    (profiles ?? []).map((p) => [
      p.user_id as string,
      { display_name: p.display_name as string | null, avatar_url: p.avatar_url as string | null },
    ])
  );

  // Для credentials-пользователей без display_name → берём из таблицы users
  const needName = userIds.filter(
    (id) => id.startsWith('credentials:') && !map.get(id)?.display_name
  );
  if (needName.length) {
    const dbIds = needName.map((id) => id.slice('credentials:'.length));
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', dbIds);

    for (const u of users ?? []) {
      const uid = `credentials:${u.id}`;
      const existing = map.get(uid) ?? { display_name: null, avatar_url: null };
      if (!existing.display_name && u.name) {
        map.set(uid, { ...existing, display_name: u.name as string });
      }
    }
  }

  return map;
}

export async function addComment(
  shikimoriId: number,
  text: string,
  parentId?: string
) {
  const userId = await requireSession();
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 2000) throw new Error('Invalid text');

  const { error } = await supabase.from('comments').insert({
    user_id:      userId,
    shikimori_id: shikimoriId,
    parent_id:    parentId ?? null,
    text:         trimmed,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/anime/${shikimoriId}`);
}

export async function deleteComment(commentId: string, shikimoriId: number) {
  const userId = await requireSession();

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  revalidatePath(`/anime/${shikimoriId}`);
}

export async function getMyComments(): Promise<Comment[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const { data: rows } = await supabase
    .from('comments')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (!rows?.length) return [];

  const profileMap = await resolveProfiles([session.user.id]);
  const profile = profileMap.get(session.user.id) ?? { display_name: null, avatar_url: null };

  return rows.map((r) => ({ ...r, ...profile })) as Comment[];
}

export async function getComments(shikimoriId: number): Promise<Comment[]> {
  const { data: rows } = await supabase
    .from('comments')
    .select('*')
    .eq('shikimori_id', shikimoriId)
    .order('created_at', { ascending: true });

  if (!rows?.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const profileMap = await resolveProfiles(userIds);

  return rows.map((r) => {
    const profile = profileMap.get(r.user_id) ?? { display_name: null, avatar_url: null };
    return { ...r, ...profile };
  }) as Comment[];
}
