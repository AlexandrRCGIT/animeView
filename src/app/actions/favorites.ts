'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

export type WatchStatus = 'watching' | 'completed' | 'planned' | 'on_hold' | 'dropped';

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

export interface FavoriteEntry {
  shikimori_id: number;
  watch_status: WatchStatus | null;
}

export async function getAllFavoriteEntries(): Promise<FavoriteEntry[]> {
  const userId = await requireSession();
  const { data } = await supabase
    .from('favorites')
    .select('shikimori_id, watch_status')
    .eq('user_id', userId);
  return (data ?? []) as FavoriteEntry[];
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

// ─── Статус просмотра ─────────────────────────────────────────────────────────

export async function getWatchStatus(shikimoriId: number): Promise<WatchStatus | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { data } = await supabase
    .from('favorites')
    .select('watch_status')
    .eq('user_id', session.user.id)
    .eq('shikimori_id', shikimoriId)
    .maybeSingle();
  return (data?.watch_status as WatchStatus) ?? null;
}

export async function setWatchStatus(shikimoriId: number, status: WatchStatus | null) {
  const userId = await requireSession();

  // Читаем старый статус чтобы правильно обновить счётчики
  const { data: existing } = await supabase
    .from('favorites')
    .select('watch_status')
    .eq('user_id', userId)
    .eq('shikimori_id', shikimoriId)
    .maybeSingle();
  const oldStatus = (existing?.watch_status as WatchStatus | null) ?? null;

  if (status === null) {
    await supabase
      .from('favorites')
      .update({ watch_status: null })
      .eq('user_id', userId)
      .eq('shikimori_id', shikimoriId);
  } else {
    await supabase
      .from('favorites')
      .upsert(
        { user_id: userId, shikimori_id: shikimoriId, watch_status: status },
        { onConflict: 'user_id,shikimori_id' }
      );
  }

  // Обновляем счётчики атомарно через хранимую функцию
  if (oldStatus !== status) {
    await supabase.rpc('update_watch_counts', {
      p_anime_id:   shikimoriId,
      p_old_status: oldStatus,
      p_new_status: status,
    });
  }

  revalidatePath(`/anime/${shikimoriId}`);
}
