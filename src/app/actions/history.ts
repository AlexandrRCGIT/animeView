'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

export async function deleteWatchProgress(shikimoriId: number) {
  const session = await auth();
  if (!session?.user?.id) return;

  await supabase
    .from('watch_progress')
    .delete()
    .eq('user_id', session.user.id)
    .eq('shikimori_id', shikimoriId);

  revalidatePath('/history');
}
