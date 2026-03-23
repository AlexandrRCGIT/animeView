import { supabase } from '@/lib/supabase';

const MISSING_TABLE_CODE = '42P01';

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'code' in error && (error as { code?: string }).code === MISSING_TABLE_CODE;
}

export async function markAnimeUpdatesViewed(userId: string): Promise<void> {
  const { error } = await supabase.from('user_anime_views').upsert(
    { user_id: userId, last_seen_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
}

export async function hasUnviewedAnimeUpdates(userId: string): Promise<boolean> {
  const [viewRes, latestRes] = await Promise.all([
    supabase
      .from('user_anime_views')
      .select('last_seen_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('anime')
      .select('kodik_updated_at')
      .not('poster_url', 'is', null)
      .order('kodik_updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (viewRes.error && !isMissingTableError(viewRes.error)) return false;
  if (!latestRes.data?.kodik_updated_at) return false;
  if (!viewRes.data) return true; // первый визит

  return new Date(latestRes.data.kodik_updated_at) > new Date(viewRes.data.last_seen_at);
}
