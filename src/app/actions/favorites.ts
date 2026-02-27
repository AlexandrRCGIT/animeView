'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function addFavorite(shikimoriId: number) {
  const userId = await requireSession();
  await supabase
    .from('favorites')
    .upsert({ user_id: userId, shikimori_id: shikimoriId }, { onConflict: 'user_id,shikimori_id' });
  revalidatePath(`/anime/${shikimoriId}`);
}

export async function removeFavorite(shikimoriId: number) {
  const userId = await requireSession();
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('shikimori_id', shikimoriId);
  revalidatePath(`/anime/${shikimoriId}`);
}

export async function getFavorites(): Promise<number[]> {
  const userId = await requireSession();
  const { data } = await supabase
    .from('favorites')
    .select('shikimori_id')
    .eq('user_id', userId);
  return (data ?? []).map((row) => row.shikimori_id as number);
}

export async function isFavorite(shikimoriId: number): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('shikimori_id', shikimoriId)
    .maybeSingle();
  return data !== null;
}
