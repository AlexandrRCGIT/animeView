import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE = 'https://anilibria.top/api/v1';

export interface AnilibriaEpisode {
  ordinal: number;
  name: string | null;
  hls_480: string | null;
  hls_720: string | null;
  hls_1080: string | null;
  opening: { start: number | null; stop: number | null };
  ending: { start: number | null; stop: number | null };
}

export interface AnilibriaReleaseData {
  id: number;
  title: string;
  episodes: AnilibriaEpisode[];
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BASE}/anime/releases/${id}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 }, // 15 минут — для онгоингов новые серии появляются часто
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = await res.json();

    const episodes: AnilibriaEpisode[] = (data.episodes ?? [])
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((ep: {
        ordinal: number;
        name: string | null;
        hls_480: string | null;
        hls_720: string | null;
        hls_1080: string | null;
        opening?: { start: number | null; stop: number | null };
        ending?: { start: number | null; stop: number | null };
      }) => ({
        ordinal: ep.ordinal,
        name: ep.name ?? null,
        hls_480: ep.hls_480 ?? null,
        hls_720: ep.hls_720 ?? null,
        hls_1080: ep.hls_1080 ?? null,
        opening: ep.opening ?? { start: null, stop: null },
        ending: ep.ending ?? { start: null, stop: null },
      }));

    const result: AnilibriaReleaseData = {
      id: data.id,
      title: data.name?.main ?? '',
      episodes,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
