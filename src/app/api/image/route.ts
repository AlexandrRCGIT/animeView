import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Фиксированные размеры — предотвращает DoS через перебор w= значений
const ALLOWED_WIDTHS = new Set([120, 240, 280, 480, 720, 1200]);
const IMAGE_RATE_LIMIT_PER_MINUTE = Math.max(60, Number(process.env.IMAGE_RATE_LIMIT_PER_MINUTE ?? 240) || 240);
const IMAGE_CACHE_CONTROL = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowed image CDN base domains — prevents SSRF attacks
// Subdomains of these are also allowed (e.g. dere.shikimori.one, cdn.myanimelist.net)
const ALLOWED_DOMAINS = [
  'shikimori.one',
  'shikimori.io',
  'myanimelist.net',
  'discordapp.com',
  'googleusercontent.com',
  'animego.org',
  'imgur.com',
  'anilibria.tv',
  'aniboom.one',
  'animevost.org',
  'rutube.ru',
  'kodik.info',
  'kodik.biz',
  'kodik.cc',
  'kodikapi.com',
  'kodik-api.com',
  'kodikplayer.com',
  'kodikonline.com',
  'kodikres.com',
  'bd.kodikres.com',
  'jikan.moe',
  'yandex.net',
  'yandex.ru',
  'kinopoisk.ru',
];

function isAllowedHostname(hostname: string): boolean {
  return ALLOWED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export async function GET(request: NextRequest) {
  // Rate limit: configurable per-IP limit (default 240/min)
  const ip = getClientIp(request.headers);
  if (!rateLimit(`image:${ip}`, IMAGE_RATE_LIMIT_PER_MINUTE, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const rawW = request.nextUrl.searchParams.get('w');
  const parsedW = rawW ? parseInt(rawW, 10) : null;
  const resizeWidth = parsedW && ALLOWED_WIDTHS.has(parsedW) ? parsedW : null;

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

  // SSRF protection: only allow whitelisted hostnames and their subdomains
  if (!isAllowedHostname(url.hostname)) {
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

    // Ресайз если запрошена ширина
    if (resizeWidth && !isNaN(resizeWidth)) {
      try {
        const resized = await sharp(Buffer.from(body))
          .resize(resizeWidth, undefined, { withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        return new NextResponse(resized as unknown as BodyInit, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': IMAGE_CACHE_CONTROL,
            Vary: 'Accept',
          },
        });
      } catch {
        // если sharp не смог — отдаём оригинал
      }
    }

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': IMAGE_CACHE_CONTROL,
        Vary: 'Accept',
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
