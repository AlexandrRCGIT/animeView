import { NextRequest, NextResponse } from 'next/server';
import { getAnilibriaUrlById, findAnilibriaRelease } from '@/lib/api/anilibria';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Приоритет: прямой запрос по Anilibria ID
  const idParam = searchParams.get('id');
  if (idParam) {
    const id = Number(idParam);
    if (!isNaN(id)) {
      try {
        const url = await getAnilibriaUrlById(id);
        return NextResponse.json({ url, anilibriaId: id });
      } catch {
        return NextResponse.json({ url: null, anilibriaId: null });
      }
    }
  }

  // Fallback: поиск по названию — возвращаем и url, и найденный id
  const titles = searchParams.getAll('title').filter(Boolean);
  if (!titles.length) return NextResponse.json({ url: null, anilibriaId: null });

  try {
    const result = await findAnilibriaRelease(titles);
    return NextResponse.json({
      url: result?.url ?? null,
      anilibriaId: result?.id ?? null,
    });
  } catch {
    return NextResponse.json({ url: null, anilibriaId: null });
  }
}
