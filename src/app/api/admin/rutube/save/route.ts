import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { isAdminUserId } from '@/lib/admin';
import { isTrustedWriteRequest } from '@/lib/security';

// POST /api/admin/rutube/save
// Body: { shikimori_id: number, rutube_episodes: Record<string, Record<string, string>> | null }
export async function POST(req: NextRequest) {
  if (!isTrustedWriteRequest(req)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { shikimori_id?: number; rutube_episodes?: unknown };
  try {
    body = (await req.json()) as { shikimori_id?: number; rutube_episodes?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { shikimori_id, rutube_episodes } = body;

  if (!shikimori_id) {
    return NextResponse.json({ error: 'shikimori_id required' }, { status: 400 });
  }
  if (!Number.isInteger(shikimori_id) || shikimori_id <= 0) {
    return NextResponse.json({ error: 'Invalid shikimori_id' }, { status: 400 });
  }

  if (rutube_episodes !== null && rutube_episodes !== undefined) {
    if (typeof rutube_episodes !== 'object' || Array.isArray(rutube_episodes)) {
      return NextResponse.json({ error: 'Invalid rutube_episodes format' }, { status: 400 });
    }

    const seasons = Object.entries(rutube_episodes as Record<string, unknown>);
    if (seasons.length > 120) {
      return NextResponse.json({ error: 'Too many seasons in payload' }, { status: 400 });
    }

    for (const [season, episodes] of seasons) {
      if (!/^\d{1,3}$/.test(season)) {
        return NextResponse.json({ error: 'Invalid season key' }, { status: 400 });
      }
      if (typeof episodes !== 'object' || !episodes || Array.isArray(episodes)) {
        return NextResponse.json({ error: 'Invalid episodes map' }, { status: 400 });
      }
      const entries = Object.entries(episodes as Record<string, unknown>);
      if (entries.length > 6000) {
        return NextResponse.json({ error: 'Too many episodes in payload' }, { status: 400 });
      }
      for (const [episode, value] of entries) {
        if (!/^\d{1,4}$/.test(episode)) {
          return NextResponse.json({ error: 'Invalid episode key' }, { status: 400 });
        }
        if (typeof value !== 'string' || value.length < 6 || value.length > 200) {
          return NextResponse.json({ error: 'Invalid Rutube id value' }, { status: 400 });
        }
      }
    }
  }

  const { error } = await supabase
    .from('anime')
    .update({ rutube_episodes: rutube_episodes ?? null })
    .eq('shikimori_id', shikimori_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
