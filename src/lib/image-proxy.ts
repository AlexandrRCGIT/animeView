const MAL_HOSTS = new Set([
  'myanimelist.net',
  'cdn.myanimelist.net',
]);

function shouldProxyHost(hostname: string): boolean {
  return MAL_HOSTS.has(hostname) || hostname.endsWith('.myanimelist.net');
}

export function toAbsoluteImageUrl(raw: string): string {
  if (raw.startsWith('//')) return `https:${raw}`;
  return raw;
}

/**
 * Проксирует изображения MyAnimeList через наш сервер,
 * чтобы клиентам с региональными блокировками внешнего домена
 * картинка отдавалась с нашего origin.
 */
export function proxifyImageUrl(raw: string | null | undefined): string {
  if (!raw) return '';

  const absolute = toAbsoluteImageUrl(raw);
  if (absolute.startsWith('/')) return absolute;

  try {
    const u = new URL(absolute);
    if (!shouldProxyHost(u.hostname)) return u.toString();
    return `/api/image?url=${encodeURIComponent(u.toString())}`;
  } catch {
    return absolute;
  }
}
