import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const DEFAULT_ONLINE_WINDOW_MINUTES = 5;

type CountResult = {
  count: number;
  ok: boolean;
  error?: string;
};

type CountQueryResult = {
  count: number | null;
  error: { message: string } | null;
};

function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const value = header.trim();
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  const token = value.slice(7).trim();
  return token || null;
}

function resolveProvidedToken(req: NextRequest): string | null {
  const fromQuery = req.nextUrl.searchParams.get('token')?.trim();
  if (fromQuery) return fromQuery;
  return parseBearerToken(req.headers.get('authorization'));
}

function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

function formatMetric(
  name: string,
  value: number,
  labels?: Record<string, string | number | boolean>,
): string {
  if (!labels || Object.keys(labels).length === 0) {
    return `${name} ${value}`;
  }

  const encoded = Object.entries(labels)
    .map(([key, raw]) => `${key}="${escapeLabel(String(raw))}"`)
    .join(',');
  return `${name}{${encoded}} ${value}`;
}

async function readExactCount(
  query: PromiseLike<CountQueryResult>,
): Promise<CountResult> {
  const result = await query;
  if (result.error) {
    return { count: 0, ok: false, error: result.error.message };
  }
  return { count: result.count ?? 0, ok: true };
}

function safeMetricNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return value;
}

export async function GET(req: NextRequest) {
  const expectedToken = process.env.METRICS_TOKEN?.trim() ?? '';
  if (!expectedToken) {
    return new NextResponse('METRICS_TOKEN is not configured\n', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const providedToken = resolveProvidedToken(req);
  if (!providedToken || providedToken !== expectedToken) {
    return new NextResponse('Forbidden\n', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const startedAtMs = Date.now();

  const onlineWindowMinutesRaw = Number.parseInt(
    process.env.METRICS_ONLINE_WINDOW_MINUTES ?? '',
    10,
  );
  const onlineWindowMinutes = Number.isFinite(onlineWindowMinutesRaw)
    ? Math.min(30, Math.max(1, onlineWindowMinutesRaw))
    : DEFAULT_ONLINE_WINDOW_MINUTES;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Online stats from Redis
  type PresenceEntry = { user_id?: string | null; last_seen_at?: number };
  const onlineCutoffMs = now.getTime() - onlineWindowMinutes * 60_000;
  let redisTotal = 0;
  let redisAuth = 0;
  try {
    const stream = redis.scanStream({ match: 'presence:*', count: 200 });
    for await (const keys of stream) {
      if (!keys.length) continue;
      const values = await redis.mget(...(keys as string[]));
      for (const v of values) {
        if (!v) continue;
        try {
          const d = JSON.parse(v) as PresenceEntry;
          if ((d.last_seen_at ?? 0) < onlineCutoffMs) continue;
          redisTotal++;
          if (d.user_id) redisAuth++;
        } catch {}
      }
    }
  } catch {}

  // visitors_24h and visitors_today from Redis ZSET
  let redis24h = 0;
  let redisToday = 0;
  try {
    const [count24h, countToday] = await Promise.all([
      redis.zcard('visitors:24h'),
      redis.zcount('visitors:24h', startOfDay.getTime(), '+inf'),
    ]);
    redis24h = count24h;
    redisToday = countToday;
  } catch {}

  const totalOnline: CountResult = { count: redisTotal, ok: true };
  const authOnline: CountResult = { count: redisAuth, ok: true };
  const guestOnline: CountResult = { count: redisTotal - redisAuth, ok: true };
  const visitors24h: CountResult = { count: redis24h, ok: true };
  const visitorsToday: CountResult = { count: redisToday, ok: true };

  const [
    usersTotal,
    animeTotal,
    favoritesTotal,
    watchProgressTotal,
    reviewsTotal,
    commentsTotal,
  ] = await Promise.all([
    readExactCount(
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true }),
    ),
    readExactCount(
      supabase
        .from('anime')
        .select('shikimori_id', { count: 'exact', head: true }),
    ),
    readExactCount(
      supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true }),
    ),
    readExactCount(
      supabase
        .from('watch_progress')
        .select('shikimori_id', { count: 'exact', head: true }),
    ),
    readExactCount(
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true }),
    ),
    readExactCount(
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true }),
    ),
  ]);

  const dbCollectionOk = [
    totalOnline,
    authOnline,
    guestOnline,
    visitors24h,
    visitorsToday,
    usersTotal,
    animeTotal,
    favoritesTotal,
    watchProgressTotal,
    reviewsTotal,
    commentsTotal,
  ].every((item) => item.ok);

  const scrapeDurationSeconds = (Date.now() - startedAtMs) / 1000;
  const memory = process.memoryUsage();
  const uptimeSeconds = process.uptime();

  const lines: string[] = [
    '# HELP animeview_metrics_up Metrics endpoint availability (1 = ok).',
    '# TYPE animeview_metrics_up gauge',
    formatMetric('animeview_metrics_up', 1),
    '# HELP animeview_metrics_collection_success DB metrics collection status (1 = success).',
    '# TYPE animeview_metrics_collection_success gauge',
    formatMetric('animeview_metrics_collection_success', dbCollectionOk ? 1 : 0),
    '# HELP animeview_metrics_scrape_duration_seconds Metrics generation duration.',
    '# TYPE animeview_metrics_scrape_duration_seconds gauge',
    formatMetric('animeview_metrics_scrape_duration_seconds', scrapeDurationSeconds),
    '# HELP animeview_online_total Current online visitors in configured window.',
    '# TYPE animeview_online_total gauge',
    formatMetric('animeview_online_total', totalOnline.count, { window_minutes: onlineWindowMinutes }),
    '# HELP animeview_online_authenticated Current online authenticated users.',
    '# TYPE animeview_online_authenticated gauge',
    formatMetric('animeview_online_authenticated', authOnline.count, { window_minutes: onlineWindowMinutes }),
    '# HELP animeview_online_guests Current online guests.',
    '# TYPE animeview_online_guests gauge',
    formatMetric('animeview_online_guests', guestOnline.count, { window_minutes: onlineWindowMinutes }),
    '# HELP animeview_visitors_last_24h Visitors seen in last 24 hours.',
    '# TYPE animeview_visitors_last_24h gauge',
    formatMetric('animeview_visitors_last_24h', visitors24h.count),
    '# HELP animeview_visitors_today Visitors seen since start of current day (server timezone).',
    '# TYPE animeview_visitors_today gauge',
    formatMetric('animeview_visitors_today', visitorsToday.count),
    '# HELP animeview_users_total Total registered users.',
    '# TYPE animeview_users_total gauge',
    formatMetric('animeview_users_total', usersTotal.count),
    '# HELP animeview_anime_total Total anime rows in database.',
    '# TYPE animeview_anime_total gauge',
    formatMetric('animeview_anime_total', animeTotal.count),
    '# HELP animeview_favorites_total Total favorites rows.',
    '# TYPE animeview_favorites_total gauge',
    formatMetric('animeview_favorites_total', favoritesTotal.count),
    '# HELP animeview_watch_progress_total Total watch progress rows.',
    '# TYPE animeview_watch_progress_total gauge',
    formatMetric('animeview_watch_progress_total', watchProgressTotal.count),
    '# HELP animeview_reviews_total Total reviews rows.',
    '# TYPE animeview_reviews_total gauge',
    formatMetric('animeview_reviews_total', reviewsTotal.count),
    '# HELP animeview_comments_total Total comments rows.',
    '# TYPE animeview_comments_total gauge',
    formatMetric('animeview_comments_total', commentsTotal.count),
    '# HELP animeview_process_uptime_seconds Node.js process uptime.',
    '# TYPE animeview_process_uptime_seconds gauge',
    formatMetric('animeview_process_uptime_seconds', safeMetricNumber(uptimeSeconds)),
    '# HELP animeview_process_resident_memory_bytes Resident memory size.',
    '# TYPE animeview_process_resident_memory_bytes gauge',
    formatMetric('animeview_process_resident_memory_bytes', safeMetricNumber(memory.rss)),
    '# HELP animeview_process_heap_used_bytes Used V8 heap bytes.',
    '# TYPE animeview_process_heap_used_bytes gauge',
    formatMetric('animeview_process_heap_used_bytes', safeMetricNumber(memory.heapUsed)),
    '# HELP animeview_process_heap_total_bytes Total V8 heap bytes.',
    '# TYPE animeview_process_heap_total_bytes gauge',
    formatMetric('animeview_process_heap_total_bytes', safeMetricNumber(memory.heapTotal)),
    '# HELP animeview_metrics_generated_at_seconds Unix timestamp of metrics payload generation.',
    '# TYPE animeview_metrics_generated_at_seconds gauge',
    formatMetric('animeview_metrics_generated_at_seconds', Math.floor(Date.now() / 1000)),
  ];

  return new NextResponse(`${lines.join('\n')}\n`, {
    status: 200,
    headers: {
      'content-type': 'text/plain; version=0.0.4; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      pragma: 'no-cache',
      expires: '0',
    },
  });
}
