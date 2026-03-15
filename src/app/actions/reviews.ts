'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { hasUnsafeControlChars } from '@/lib/security';
import { USER_CONTENT_TEXT_MAX_LENGTH, USER_CONTENT_TEXT_MIN_LENGTH } from '@/lib/input-limits';

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
  avatar_url:       string | null;
}

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

async function recalcSiteRating(shikimoriId: number): Promise<void> {
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
  if (!Number.isInteger(shikimoriId) || shikimoriId <= 0) {
    throw new Error('Некорректный id тайтла');
  }

  const scoreKeys: Array<keyof Pick<ReviewData, 'score_plot' | 'score_art' | 'score_engagement' | 'score_characters' | 'score_music'>> = [
    'score_plot',
    'score_art',
    'score_engagement',
    'score_characters',
    'score_music',
  ];
  for (const key of scoreKeys) {
    const value = Number(data[key]);
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      throw new Error('Оценки должны быть от 1 до 10');
    }
  }

  const trimmedText = typeof data.text === 'string' ? data.text.trim() : '';
  if (trimmedText.length < USER_CONTENT_TEXT_MIN_LENGTH) {
    throw new Error(`Текст рецензии должен быть не короче ${USER_CONTENT_TEXT_MIN_LENGTH} символов`);
  }
  if (trimmedText.length > USER_CONTENT_TEXT_MAX_LENGTH) {
    throw new Error(`Текст рецензии слишком длинный (максимум ${USER_CONTENT_TEXT_MAX_LENGTH} символов)`);
  }
  if (hasUnsafeControlChars(trimmedText)) {
    throw new Error('Текст рецензии содержит недопустимые символы');
  }

  const { error } = await supabase.from('reviews').upsert(
    {
      user_id:          userId,
      shikimori_id:     shikimoriId,
      score_plot:       data.score_plot,
      score_art:        data.score_art,
      score_engagement: data.score_engagement,
      score_characters: data.score_characters,
      score_music:      data.score_music,
      text:             trimmedText,
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

  const profileMap = await resolveProfiles([session.user.id]);
  const profile = profileMap.get(session.user.id) ?? { display_name: null, avatar_url: null };

  return { ...data, ...profile } as Review;
}

export async function getMyReviews(): Promise<Review[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const { data: rows } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (!rows?.length) return [];

  const profileMap = await resolveProfiles([session.user.id]);
  const profile = profileMap.get(session.user.id) ?? { display_name: null, avatar_url: null };

  return rows.map((r) => ({ ...r, ...profile })) as Review[];
}

export async function getReviews(shikimoriId: number): Promise<Review[]> {
  const { data: rows } = await supabase
    .from('reviews')
    .select('*')
    .eq('shikimori_id', shikimoriId)
    .order('created_at', { ascending: false });

  if (!rows?.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const profileMap = await resolveProfiles(userIds);

  return rows.map((r) => {
    const profile = profileMap.get(r.user_id) ?? { display_name: null, avatar_url: null };
    return { ...r, ...profile };
  }) as Review[];
}
