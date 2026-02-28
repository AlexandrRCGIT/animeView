/**
 * Aniboom — клиент на основе animego.me
 * Реплицирует логику библиотеки anime-parsers-ru (Python) на TypeScript.
 *
 * ВАЖНО: animego.me защищён DDoS-Guard, который требует JS-выполнения.
 * Поэтому запросы делаются клиент-сайд (из браузера), а не с сервера Next.js.
 *
 * Поток:
 *   1. Поиск по названию → animego_id
 *   2. GET /anime/{id}/player?_allow=true → HTML с data-player span[data-provider="24"]
 *   3. Возвращаем https://aniboom.one/embed/{code}
 */

const ANIMEGO_DOMAIN = 'animego.me';

const HEADERS_AJAX: Record<string, string> = {
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: `https://${ANIMEGO_DOMAIN}/`,
};

/** Ищет аниме на animego.me и возвращает animego_id первого результата */
async function searchAnimegoId(title: string, isClient = false): Promise<string | null> {
  const url = `https://${ANIMEGO_DOMAIN}/search/all?type=small&q=${encodeURIComponent(title)}`;

  const res = await fetch(url, {
    headers: HEADERS_AJAX,
    // Без next: { revalidate } для клиентских запросов
    ...(isClient ? {} : { next: { revalidate: 3600 } }),
  });

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') ?? '';
  // DDoS-Guard вернёт text/html вместо JSON — пропускаем
  if (!contentType.includes('json') && !contentType.includes('javascript')) return null;

  const json = await res.json() as { status?: string; content?: string };
  if (json.status !== 'success' || !json.content) return null;

  // Ищем первую ссылку вида href="/anime/slug-title-12345"
  const match = json.content.match(/href="\/anime\/[a-z0-9а-яё-]+-(\d+)"/i);
  return match?.[1] ?? null;
}

/** Получает ссылку на Aniboom embed по animego_id */
async function getEmbedUrl(animegoId: string, isClient = false): Promise<string | null> {
  const url = `https://${ANIMEGO_DOMAIN}/anime/${animegoId}/player?_allow=true`;

  const res = await fetch(url, {
    headers: HEADERS_AJAX,
    ...(isClient ? {} : { next: { revalidate: 3600 } }),
  });

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('json') && !contentType.includes('javascript')) return null;

  const json = await res.json() as { content?: string };
  const html = json.content ?? '';

  const re1 = /data-provider="24"[\s\S]*?data-player="([^"]+)"/;
  const re2 = /data-player="([^"]+)"[\s\S]*?data-provider="24"/;
  const playerLink = html.match(re1)?.[1] ?? html.match(re2)?.[1];

  if (!playerLink) return null;

  const clean = 'https:' + playerLink.split('?')[0];
  return clean;
}

/**
 * Возвращает iframe URL Aniboom.
 * isClient=true — для вызова из браузера (без Next.js кэш-опций).
 */
export async function getAniboomUrl(titles: string[], isClient = false): Promise<string | null> {
  for (const title of titles) {
    if (!title?.trim()) continue;
    try {
      const animegoId = await searchAnimegoId(title, isClient);
      if (!animegoId) continue;
      const url = await getEmbedUrl(animegoId, isClient);
      if (url) return url;
    } catch {
      // пробуем следующий вариант
    }
  }
  return null;
}
