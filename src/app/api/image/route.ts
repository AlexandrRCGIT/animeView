import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

  try {
    const upstream = await fetch(url.toString(), {
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
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
