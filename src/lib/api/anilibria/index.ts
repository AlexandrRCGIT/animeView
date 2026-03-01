/**
 * Anilibria v1 API client
 * Base: https://anilibria.top/api/v1
 * Auth: not required
 */

const BASE = 'https://anilibria.top/api/v1';

interface AnilibriaRelease {
  id: number;
  name: { main: string; english?: string | null };
  external_player: string | null;
}

function normalizeUrl(raw: string): string {
  return raw.startsWith('//') ? 'https:' + raw : raw;
}

/** Нормализует строку: lowercase, только слова >= 3 символов */
function words(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^\wа-яёa-z0-9]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3)
  );
}

function overlap(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.min(wa.size, wb.size);
}

function isMatch(query: string, release: AnilibriaRelease): boolean {
  const threshold = 0.6;
  if (overlap(query, release.name.main) >= threshold) return true;
  if (release.name.english && overlap(query, release.name.english) >= threshold) return true;
  return false;
}

/**
 * Получает external_player URL напрямую по Anilibria ID.
 * Самый надёжный способ — ID берётся из MALibria маппинга.
 */
export async function getAnilibriaUrlById(anilibriaId: number): Promise<string | null> {
  const res = await fetch(`${BASE}/anime/releases/${anilibriaId}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as AnilibriaRelease;
  if (!data.external_player) return null;
  return normalizeUrl(data.external_player);
}

async function searchReleases(query: string): Promise<AnilibriaRelease[]> {
  const url = `${BASE}/app/search/releases?query=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = await res.json() as AnilibriaRelease[];
  return Array.isArray(data) ? data : [];
}

/**
 * Fallback: поиск по названию, возвращает id + url совпавшего релиза.
 * Используется если anilibria_id не известен через MALibria.
 */
export async function findAnilibriaRelease(
  titles: string[],
): Promise<{ id: number; url: string } | null> {
  for (const title of titles) {
    if (!title?.trim()) continue;
    try {
      const results = await searchReleases(title);
      for (const r of results) {
        if (!r.external_player) continue;
        if (!isMatch(title, r)) continue;
        return { id: r.id, url: normalizeUrl(r.external_player) };
      }
    } catch {
      // try next title
    }
  }
  return null;
}

/**
 * Fallback: поиск по названию — возвращает только URL (для обратной совместимости).
 */
export async function getAnilibriaUrl(titles: string[]): Promise<string | null> {
  const result = await findAnilibriaRelease(titles);
  return result?.url ?? null;
}
