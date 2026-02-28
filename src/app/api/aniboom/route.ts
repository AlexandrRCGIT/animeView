import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOMAIN = 'animego.me';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

/**
 * Двухшаговая сессия для обхода DDoS-Guard:
 * 1. GET / → получаем session cookies (PHPSESSID, __ddg1_ и т.д.)
 * 2. GET /search/all?q=... с этими cookies → JSON или HTML
 */
async function getSessionCookies(): Promise<string> {
  try {
    const res = await fetch(`https://${DOMAIN}/`, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    const raw = res.headers.getSetCookie?.() ?? [];
    // Собираем cookies в одну строку
    return raw.map(c => c.split(';')[0]).join('; ');
  } catch {
    return '';
  }
}

async function searchAnimegoId(title: string, cookies: string): Promise<string | null> {
  const url = `https://${DOMAIN}/search/all?type=small&q=${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Referer: `https://${DOMAIN}/`,
      Cookie: cookies,
    },
  });

  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('json') && !ct.includes('javascript')) return null;

  const json = await res.json() as { status?: string; content?: string };
  if (json.status !== 'success' || !json.content) return null;

  const match = json.content.match(/href="\/anime\/[a-z0-9а-яё-]+-(\d+)"/i);
  return match?.[1] ?? null;
}

async function getEmbedUrl(animegoId: string, cookies: string): Promise<string | null> {
  const url = `https://${DOMAIN}/anime/${animegoId}/player?_allow=true`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Referer: `https://${DOMAIN}/`,
      Cookie: cookies,
    },
  });

  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('json') && !ct.includes('javascript')) return null;

  const json = await res.json() as { content?: string };
  const html = json.content ?? '';

  const re1 = /data-provider="24"[\s\S]*?data-player="([^"]+)"/;
  const re2 = /data-player="([^"]+)"[\s\S]*?data-provider="24"/;
  const playerLink = html.match(re1)?.[1] ?? html.match(re2)?.[1];
  if (!playerLink) return null;

  return 'https:' + playerLink.split('?')[0];
}

export async function GET(request: NextRequest) {
  const titles = request.nextUrl.searchParams.getAll('title').filter(Boolean);
  if (!titles.length) return NextResponse.json({ url: null });

  try {
    // Шаг 1: получить session cookies
    const cookies = await getSessionCookies();

    // Шаг 2: перебираем варианты названий
    for (const title of titles) {
      try {
        const animegoId = await searchAnimegoId(title, cookies);
        if (!animegoId) continue;

        const url = await getEmbedUrl(animegoId, cookies);
        if (url) return NextResponse.json({ url });
      } catch {
        // пробуем следующее название
      }
    }
  } catch {
    // сеть недоступна
  }

  return NextResponse.json({ url: null });
}
