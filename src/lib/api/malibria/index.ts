/**
 * MALibria — маппинг MyAnimeList/Shikimori ID ↔ Anilibria ID
 * База: https://raw.githubusercontent.com/qt-kaneko/MALibria/db/mapped.json
 * Обновляется ежедневно на GitHub Actions.
 */

const DB_URL = 'https://raw.githubusercontent.com/qt-kaneko/MALibria/db/mapped.json';

interface MalibriaEntry {
  anilibria_id: number;
  myanimelist_id: number;
  episodes: number;
}

// In-memory кеш на уровне процесса (24ч)
let _cache: MalibriaEntry[] | null = null;
let _cacheAt = 0;
const TTL_MS = 24 * 60 * 60 * 1000;

async function getDb(): Promise<MalibriaEntry[]> {
  if (_cache && Date.now() - _cacheAt < TTL_MS) return _cache;
  const res = await fetch(DB_URL, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`MALibria fetch failed: ${res.status}`);
  _cache = (await res.json()) as MalibriaEntry[];
  _cacheAt = Date.now();
  return _cache;
}

/**
 * Возвращает Anilibria ID по MAL/Shikimori ID, или null если не найден.
 */
export async function getAnilibriaId(malId: number): Promise<number | null> {
  try {
    const db = await getDb();
    return db.find(e => e.myanimelist_id === malId)?.anilibria_id ?? null;
  } catch {
    return null;
  }
}
