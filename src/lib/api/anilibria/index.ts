/**
 * Anilibria v1 API client
 * Base: https://anilibria.top/api/v1
 * Auth: not required
 *
 * Search is by title name only (no Shikimori/MAL ID support).
 * Returns external_player (aniqit.com iframe) when available.
 */

const BASE = 'https://anilibria.top/api/v1';

interface AnilibriaEpisode {
  hls_480?: string | null;
  hls_720?: string | null;
  hls_1080?: string | null;
}

interface AnilibriaRelease {
  id: number;
  name: { main: string; english?: string };
  external_player: string | null;
  episodes?: AnilibriaEpisode[];
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
 * Tries all provided titles in order.
 */
export async function getAnilibriaUrl(titles: string[]): Promise<string | null> {
  for (const title of titles) {
    if (!title?.trim()) continue;
    try {
      const results = await searchReleases(title);
      for (const r of results) {
        if (r.external_player) {
          const url = r.external_player.startsWith('//') ? 'https:' + r.external_player : r.external_player;
          return url;
        }
      }
    } catch {
      // try next title
    }
  }
  return null;
}
