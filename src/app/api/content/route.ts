import { NextRequest, NextResponse } from 'next/server';
import { getPublishedPosts, parseContentType } from '@/lib/content';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const type = parseContentType(req.nextUrl.searchParams.get('type'));
  if (!type) {
    return NextResponse.json({ error: 'type must be info or news' }, { status: 400 });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

  try {
    const posts = await getPublishedPosts(type, limit);
    return NextResponse.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
