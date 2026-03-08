import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowed image CDN hostnames — prevents SSRF attacks
const ALLOWED_HOSTNAMES = new Set([
  'shikimori.one',
  'cdn.myanimelist.net',
  'myanimelist.net',
  'cdn.discordapp.com',
  'lh3.googleusercontent.com',
  'animego.org',
  'static.animego.org',
  'img.animego.org',
  'i.imgur.com',
  'images.anilibria.tv',
  'anilibria.tv',
  'static.anilibria.tv',
  'pics.aniboom.one',
  'aniboom.one',
  'animevost.org',
  'img.rutube.ru',
  'thumbnails.rutube.ru',
]);

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute per IP
  const ip = getClientIp(request.headers);
  if (!rateLimit(`image:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
  }

  // SSRF protection: only allow whitelisted hostnames
  if (!ALLOWED_HOSTNAMES.has(url.hostname)) {
    return NextResponse.json({ error: 'Hostname not allowed' }, { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const upstream = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'AnimeView/1.0',
      },
      next: { revalidate: 24 * 3600 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';

    // Ensure we only serve image content types
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
