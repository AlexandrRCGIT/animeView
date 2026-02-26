'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function addFavorite(anilistId: number) {
  const userId = await requireSession();
  await supabase
    .from('favorites')
    .upsert({ user_id: userId, anilist_id: anilistId }, { onConflict: 'user_id,anilist_id' });
  revalidatePath(`/anime/${anilistId}`);
}

export async function removeFavorite(anilistId: number) {
  const userId = await requireSession();
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('anilist_id', anilistId);
  revalidatePath(`/anime/${anilistId}`);
}

export async function getFavorites(): Promise<number[]> {
  const userId = await requireSession();
  const { data } = await supabase
    .from('favorites')
    .select('anilist_id')
    .eq('user_id', userId);
  return (data ?? []).map((row) => row.anilist_id as number);
}

export async function isFavorite(anilistId: number): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('anilist_id', anilistId)
    .maybeSingle();
  return data !== null;
}
