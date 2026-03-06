export function toAbsoluteImageUrl(raw: string): string {
  if (raw.startsWith('//')) return `https:${raw}`;
  return raw;
}

/**
 * Проксирует все внешние изображения через /api/image?url=
 * чтобы не добавлять каждый CDN-домен в next.config и обходить региональные блокировки.
 */
export function proxifyImageUrl(raw: string | null | undefined): string {
  if (!raw) return '';

  const absolute = toAbsoluteImageUrl(raw);
  if (absolute.startsWith('/')) return absolute;

  try {
    new URL(absolute); // валидация
    return `/api/image?url=${encodeURIComponent(absolute)}`;
  } catch {
    return absolute;
  }
}
