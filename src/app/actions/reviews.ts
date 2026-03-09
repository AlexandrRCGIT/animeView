'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export interface ReviewData {
  score_plot:       number;
  score_art:        number;
  score_engagement: number;
  score_characters: number;
  score_music:      number;
  text:             string;
}

export interface Review {
  id:               string;
  user_id:          string;
  shikimori_id:     number;
  score_plot:       number;
  score_art:        number;
  score_engagement: number;
  score_characters: number;
  score_music:      number;
  score_overall:    number;
  text:             string;
  created_at:       string;
  updated_at:       string;
  display_name:     string | null;
}

async function recalcSiteRating(shikimoriId: number) {
  const { data } = await supabase
    .from('reviews')
    .select('score_overall')
    .eq('shikimori_id', shikimoriId);

  const count = data?.length ?? 0;
  const avg = count
    ? data!.reduce((s, r) => s + Number(r.score_overall), 0) / count
    : null;

  await supabase
    .from('anime')
    .update({
      site_rating: avg != null ? +avg.toFixed(2) : null,
      site_rating_count: count,
    })
    .eq('shikimori_id', shikimoriId);
}

export async function submitReview(shikimoriId: number, data: ReviewData) {
  const userId = await requireSession();

  const { error } = await supabase.from('reviews').upsert(
    {
      user_id:          userId,
      shikimori_id:     shikimoriId,
      score_plot:       data.score_plot,
      score_art:        data.score_art,
      score_engagement: data.score_engagement,
      score_characters: data.score_characters,
      score_music:      data.score_music,
      text:             data.text,
      updated_at:       new Date().toISOString(),
    },
    { onConflict: 'user_id,shikimori_id' }
  );

  if (error) throw new Error(error.message);

  await recalcSiteRating(shikimoriId);
  revalidatePath(`/anime/${shikimoriId}`);
}

export async function deleteReview(shikimoriId: number) {
  const userId = await requireSession();

  await supabase
    .from('reviews')
    .delete()
    .eq('user_id', userId)
    .eq('shikimori_id', shikimoriId);

  await recalcSiteRating(shikimoriId);
  revalidatePath(`/anime/${shikimoriId}`);
}

export async function getMyReview(shikimoriId: number): Promise<Review | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('shikimori_id', shikimoriId)
    .maybeSingle();

  if (!data) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', session.user.id)
    .maybeSingle();

  return { ...data, display_name: profile?.display_name ?? null } as Review;
}

export async function getReviews(shikimoriId: number): Promise<Review[]> {
  const { data: rows } = await supabase
    .from('reviews')
    .select('*')
    .eq('shikimori_id', shikimoriId)
    .order('created_at', { ascending: false });

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
  })) as Review[];
}
