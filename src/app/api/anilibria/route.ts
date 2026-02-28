import { NextRequest, NextResponse } from 'next/server';
import { getAnilibriaUrl } from '@/lib/api/anilibria';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const titles = request.nextUrl.searchParams.getAll('title').filter(Boolean);
  if (!titles.length) return NextResponse.json({ url: null });

  try {
    const url = await getAnilibriaUrl(titles);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
