import { supabase } from '@/lib/supabase';

export type ContentType = 'info' | 'news';

export interface ContentPost {
  id: number;
  type: ContentType;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  author_user_id: string | null;
}

export interface ContentUnreadFlags {
  news: boolean;
  info: boolean;
}

const CONTENT_TYPES: ContentType[] = ['info', 'news'];
const MISSING_TABLE_CODE = '42P01';

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'code' in error && (error as { code?: string }).code === MISSING_TABLE_CODE;
}

export function parseContentType(value: string | null | undefined): ContentType | null {
  if (!value) return null;
  return CONTENT_TYPES.includes(value as ContentType) ? (value as ContentType) : null;
}

export async function getPublishedPosts(type: ContentType, limit = 100): Promise<ContentPost[]> {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const { data, error } = await supabase
    .from('content_posts')
    .select('id, type, title, body, is_published, created_at, updated_at, published_at, author_user_id')
    .eq('type', type)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as ContentPost[]).filter((row) => row.type === type);
}

export async function getAdminPosts(type: ContentType, limit = 300): Promise<ContentPost[]> {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const { data, error } = await supabase
    .from('content_posts')
    .select('id, type, title, body, is_published, created_at, updated_at, published_at, author_user_id')
    .eq('type', type)
    .order('updated_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as ContentPost[]).filter((row) => row.type === type);
}

async function getLatestPublishedAt(type: ContentType): Promise<string | null> {
  const { data, error } = await supabase
    .from('content_posts')
    .select('published_at')
    .eq('type', type)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(error.message);
  }

  return typeof data?.published_at === 'string' ? data.published_at : null;
}

export async function markContentRead(userId: string, type: ContentType): Promise<void> {
  const latestPublishedAt = await getLatestPublishedAt(type);
  const lastSeenAt = latestPublishedAt ?? new Date().toISOString();

  const { error } = await supabase.from('user_content_reads').upsert(
    {
      user_id: userId,
      content_type: type,
      last_seen_at: lastSeenAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,content_type' },
  );

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
}

export async function getContentUnreadFlags(userId: string): Promise<ContentUnreadFlags> {
  const [latestNews, latestInfo] = await Promise.all([
    getLatestPublishedAt('news'),
    getLatestPublishedAt('info'),
  ]);

  const { data: reads, error } = await supabase
    .from('user_content_reads')
    .select('content_type, last_seen_at')
    .eq('user_id', userId)
    .in('content_type', CONTENT_TYPES);

  if (error) {
    if (isMissingTableError(error)) return { news: false, info: false };
    throw new Error(error.message);
  }

  const map = new Map<string, string>();
  for (const row of reads ?? []) {
    const type = typeof row.content_type === 'string' ? row.content_type : '';
    const seen = typeof row.last_seen_at === 'string' ? row.last_seen_at : '';
    if (type && seen) map.set(type, seen);
  }

  const hasUnread = (type: ContentType, latest: string | null): boolean => {
    if (!latest) return false;
    const seen = map.get(type);
    if (!seen) return true;
    return Date.parse(latest) > Date.parse(seen);
  };

  return {
    news: hasUnread('news', latestNews),
    info: hasUnread('info', latestInfo),
  };
}

export async function saveContentPost(params: {
  id?: number;
  type: ContentType;
  title: string;
  body: string;
  is_published: boolean;
  author_user_id: string;
}): Promise<ContentPost> {
  const title = params.title.trim();
  const body = params.body.trim();
  if (!title || !body) {
    throw new Error('Title/body is empty');
  }

  const nowIso = new Date().toISOString();

  if (params.id) {
    const { data: existing, error: existingError } = await supabase
      .from('content_posts')
      .select('id, published_at')
      .eq('id', params.id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }
    if (!existing) {
      throw new Error('Post not found');
    }

    const patch: {
      title: string;
      body: string;
      is_published: boolean;
      updated_at: string;
      published_at?: string | null;
    } = {
      title,
      body,
      is_published: params.is_published,
      updated_at: nowIso,
    };
    if (params.is_published && !existing.published_at) {
      patch.published_at = nowIso;
    }
    if (!params.is_published) {
      patch.published_at = existing.published_at;
    }

    const { data, error } = await supabase
      .from('content_posts')
      .update(patch)
      .eq('id', params.id)
      .select('id, type, title, body, is_published, created_at, updated_at, published_at, author_user_id')
      .single();

    if (error) throw new Error(error.message);
    return data as ContentPost;
  }

  const { data, error } = await supabase
    .from('content_posts')
    .insert({
      type: params.type,
      title,
      body,
      is_published: params.is_published,
      published_at: params.is_published ? nowIso : null,
      author_user_id: params.author_user_id,
    })
    .select('id, type, title, body, is_published, created_at, updated_at, published_at, author_user_id')
    .single();

  if (error) throw new Error(error.message);
  return data as ContentPost;
}

export async function deleteContentPost(id: number): Promise<void> {
  const { error } = await supabase.from('content_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
