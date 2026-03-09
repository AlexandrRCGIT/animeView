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
  id:          string;
  user_id:     string;
  shikimori_id: number;
  parent_id:   string | null;
  text:        string;
  created_at:  string;
  updated_at:  string;
  display_name: string | null;
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

export async function getComments(shikimoriId: number): Promise<Comment[]> {
  const { data: rows } = await supabase
    .from('comments')
    .select('*')
    .eq('shikimori_id', shikimoriId)
    .order('created_at', { ascending: true });

  if (!rows?.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);

  const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));

  return rows.map((r) => ({
    ...r,
    display_name: nameMap.get(r.user_id) ?? null,
  })) as Comment[];
}
