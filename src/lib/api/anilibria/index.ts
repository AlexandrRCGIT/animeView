/**
 * Anilibria v1 API client
 * Base: https://anilibria.top/api/v1
 * Auth: not required
 *
 * Search is by title name only (no Shikimori/MAL ID support).
 * Returns external_player (aniqit.com iframe) when available.
 */

const BASE = 'https://anilibria.top/api/v1';

interface AnilibriaRelease {
  id: number;
  name: { main: string; english?: string | null };
  external_player: string | null;
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

/**
 * Доля пересечения слов между query и result (относительно меньшего множества).
 * >= 0.6 считаем совпадением.
 */
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
 * Returns external_player (aniqit.com) URL for the first matching release.
 * Validates title similarity to avoid false positives.
 */
export async function getAnilibriaUrl(titles: string[]): Promise<string | null> {
  for (const title of titles) {
    if (!title?.trim()) continue;
    try {
      const results = await searchReleases(title);
      for (const r of results) {
        if (!r.external_player) continue;
        if (!isMatch(title, r)) continue;
        const url = r.external_player.startsWith('//')
          ? 'https:' + r.external_player
          : r.external_player;
        return url;
      }
    } catch {
      // try next title
    }
  }
  return null;
}
